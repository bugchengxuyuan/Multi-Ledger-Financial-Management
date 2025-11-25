import prisma from '../config/database'
import { Prisma } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

/**
 * 收入服务层 - 处理收入相关的业务逻辑
 *
 * 核心功能：
 * - 创建收入时自动增加账本余额并记录日志
 * - 删除收入时自动减少账本余额并记录日志
 * - 更新收入时自动调整账本余额
 */

// 获取所有收入（支持筛选）
export const getAllIncomes = async (filters?: {
  accountBookId?: string
  categoryTagId?: string
  startDate?: string
  endDate?: string
}) => {
  const where: Prisma.IncomeWhereInput = {}

  if (filters) {
    if (filters.accountBookId) {
      where.accountBookId = filters.accountBookId
    }
    if (filters.categoryTagId) {
      where.categoryTagId = filters.categoryTagId
    }
    if (filters.startDate || filters.endDate) {
      where.date = {}
      if (filters.startDate) {
        where.date.gte = new Date(filters.startDate)
      }
      if (filters.endDate) {
        where.date.lte = new Date(filters.endDate)
      }
    }
  }

  return await prisma.income.findMany({
    where,
    include: {
      accountBook: true,
      categoryTag: true,
    },
    orderBy: {
      date: 'desc',
    },
  })
}

// 获取单个收入
export const getIncomeById = async (id: string) => {
  return await prisma.income.findUnique({
    where: { id },
    include: {
      accountBook: true,
      categoryTag: true,
    },
  })
}

// 创建收入（自动增加账本余额）
export const createIncome = async (data: Prisma.IncomeCreateInput) => {
  return await prisma.$transaction(async (tx) => {
    // 1. 创建收入记录
    const income = await tx.income.create({
      data,
      include: {
        accountBook: true,
        categoryTag: true,
      },
    })

    // 2. 更新分类标签计数 +1
    if (income.categoryTagId) {
      await tx.tag.update({
        where: { id: income.categoryTagId },
        data: { count: { increment: 1 } },
      })
    }

    // 3. 如果关联了账本，自动增加账本余额
    if (income.accountBookId) {
      const accountBook = await tx.accountBook.findUnique({
        where: { id: income.accountBookId },
      })

      if (accountBook) {
        const amountBefore = accountBook.currentBalance
        const amountAfter = amountBefore.add(income.amount)

        // 3.1 更新账本余额
        await tx.accountBook.update({
          where: { id: income.accountBookId },
          data: { currentBalance: amountAfter },
        })

        // 3.2 创建余额变动日志
        await tx.balanceLog.create({
          data: {
            accountBookId: income.accountBookId,
            changeType: 'income',
            amountBefore,
            amountAfter,
            changeAmount: income.amount,
            note: `收入：${income.description}`,
            relatedIncomeId: income.id,
          },
        })
      }
    }

    return income
  })
}

// 更新收入（自动调整账本余额）
export const updateIncome = async (id: string, data: Prisma.IncomeUpdateInput) => {
  return await prisma.$transaction(async (tx) => {
    // 1. 获取原收入数据
    const oldIncome = await tx.income.findUnique({
      where: { id },
    })

    if (!oldIncome) {
      throw new Error('收入记录不存在')
    }

    // 2. 更新收入
    const income = await tx.income.update({
      where: { id },
      data,
      include: {
        accountBook: true,
        categoryTag: true,
      },
    })

    // 3. 处理标签计数变化
    // 如果分类标签改变
    if (data.categoryTag && typeof data.categoryTag === 'object' && 'connect' in data.categoryTag) {
      const newCategoryTagId = (data.categoryTag.connect as { id: string })?.id
      if (newCategoryTagId && newCategoryTagId !== oldIncome.categoryTagId) {
        // 旧标签 -1
        await tx.tag.update({
          where: { id: oldIncome.categoryTagId },
          data: { count: { decrement: 1 } },
        })
        // 新标签 +1
        await tx.tag.update({
          where: { id: newCategoryTagId },
          data: { count: { increment: 1 } },
        })
      }
    }

    // 4. 处理账本余额变化
    const oldAccountBookId = oldIncome.accountBookId
    const newAccountBookId = income.accountBookId
    const oldAmount = oldIncome.amount
    const newAmount = income.amount

    // 情况1: 账本未变，金额改变
    if (oldAccountBookId === newAccountBookId && oldAccountBookId && !oldAmount.equals(newAmount)) {
      const accountBook = await tx.accountBook.findUnique({
        where: { id: oldAccountBookId },
      })

      if (accountBook) {
        const amountBefore = accountBook.currentBalance
        const changeDiff = newAmount.sub(oldAmount) // 差额
        const amountAfter = amountBefore.add(changeDiff)

        await tx.accountBook.update({
          where: { id: oldAccountBookId },
          data: { currentBalance: amountAfter },
        })

        await tx.balanceLog.create({
          data: {
            accountBookId: oldAccountBookId,
            changeType: 'income',
            amountBefore,
            amountAfter,
            changeAmount: changeDiff,
            note: `修改收入金额：${income.description}（${oldAmount} → ${newAmount}）`,
            relatedIncomeId: income.id,
          },
        })
      }
    }

    // 情况2: 账本改变（从A账本移到B账本）
    if (oldAccountBookId !== newAccountBookId) {
      // 从旧账本扣除
      if (oldAccountBookId) {
        const oldBook = await tx.accountBook.findUnique({
          where: { id: oldAccountBookId },
        })
        if (oldBook) {
          const oldBookAmountBefore = oldBook.currentBalance
          const oldBookAmountAfter = oldBookAmountBefore.sub(oldAmount)

          await tx.accountBook.update({
            where: { id: oldAccountBookId },
            data: { currentBalance: oldBookAmountAfter },
          })

          await tx.balanceLog.create({
            data: {
              accountBookId: oldAccountBookId,
              changeType: 'manual_adjust',
              amountBefore: oldBookAmountBefore,
              amountAfter: oldBookAmountAfter,
              changeAmount: oldAmount.negated(),
              note: `收入转出到其他账本：${income.description}`,
              relatedIncomeId: income.id,
            },
          })
        }
      }

      // 向新账本添加
      if (newAccountBookId) {
        const newBook = await tx.accountBook.findUnique({
          where: { id: newAccountBookId },
        })
        if (newBook) {
          const newBookAmountBefore = newBook.currentBalance
          const newBookAmountAfter = newBookAmountBefore.add(newAmount)

          await tx.accountBook.update({
            where: { id: newAccountBookId },
            data: { currentBalance: newBookAmountAfter },
          })

          await tx.balanceLog.create({
            data: {
              accountBookId: newAccountBookId,
              changeType: 'income',
              amountBefore: newBookAmountBefore,
              amountAfter: newBookAmountAfter,
              changeAmount: newAmount,
              note: `收入转入：${income.description}`,
              relatedIncomeId: income.id,
            },
          })
        }
      }
    }

    return income
  })
}

// 删除收入（自动减少账本余额）
export const deleteIncome = async (id: string) => {
  return await prisma.$transaction(async (tx) => {
    const income = await tx.income.findUnique({
      where: { id },
    })

    if (!income) {
      throw new Error('收入记录不存在')
    }

    // 1. 如果关联了账本，自动减少账本余额
    if (income.accountBookId) {
      const accountBook = await tx.accountBook.findUnique({
        where: { id: income.accountBookId },
      })

      if (accountBook) {
        const amountBefore = accountBook.currentBalance
        const amountAfter = amountBefore.sub(income.amount)

        // 1.1 更新账本余额
        await tx.accountBook.update({
          where: { id: income.accountBookId },
          data: { currentBalance: amountAfter },
        })

        // 1.2 创建余额变动日志
        await tx.balanceLog.create({
          data: {
            accountBookId: income.accountBookId,
            changeType: 'manual_adjust',
            amountBefore,
            amountAfter,
            changeAmount: income.amount.negated(),
            note: `删除收入：${income.description}`,
            relatedIncomeId: income.id,
          },
        })
      }
    }

    // 2. 更新分类标签计数 -1
    if (income.categoryTagId) {
      await tx.tag.update({
        where: { id: income.categoryTagId },
        data: { count: { decrement: 1 } },
      })
    }

    // 3. 删除收入
    return await tx.income.delete({
      where: { id },
    })
  })
}

// 获取收入统计
export const getIncomeStats = async (filters?: {
  accountBookId?: string
  startDate?: string
  endDate?: string
}) => {
  const where: Prisma.IncomeWhereInput = {}

  if (filters) {
    if (filters.accountBookId) {
      where.accountBookId = filters.accountBookId
    }
    if (filters.startDate || filters.endDate) {
      where.date = {}
      if (filters.startDate) {
        where.date.gte = new Date(filters.startDate)
      }
      if (filters.endDate) {
        where.date.lte = new Date(filters.endDate)
      }
    }
  }

  const [totalAmount, totalCount, byCategory, byAccountBook] = await Promise.all([
    // 总金额
    prisma.income.aggregate({
      where,
      _sum: { amount: true },
    }),
    // 总笔数
    prisma.income.count({ where }),
    // 按分类分组
    prisma.income.groupBy({
      by: ['categoryTagId'],
      where,
      _sum: { amount: true },
      _count: true,
    }),
    // 按账本分组
    prisma.income.groupBy({
      by: ['accountBookId'],
      where,
      _sum: { amount: true },
      _count: true,
    }),
  ])

  // 获取分类标签详情
  const categoryTagIds = byCategory.map((item) => item.categoryTagId)
  const categoryTags = await prisma.tag.findMany({
    where: { id: { in: categoryTagIds } },
  })
  const categoryTagMap = new Map(categoryTags.map((tag) => [tag.id, tag]))

  // 获取账本详情
  const accountBookIds = byAccountBook
    .map((item) => item.accountBookId)
    .filter((id): id is string => id !== null)
  const accountBooks = await prisma.accountBook.findMany({
    where: { id: { in: accountBookIds } },
  })
  const accountBookMap = new Map(accountBooks.map((book) => [book.id, book]))

  return {
    totalAmount: totalAmount._sum.amount || 0,
    totalCount,
    byCategory: byCategory.map((item) => ({
      categoryTagId: item.categoryTagId,
      categoryTag: categoryTagMap.get(item.categoryTagId),
      amount: item._sum.amount || 0,
      count: item._count,
    })),
    byAccountBook: byAccountBook.map((item) => ({
      accountBookId: item.accountBookId,
      accountBook: item.accountBookId ? accountBookMap.get(item.accountBookId) : null,
      amount: item._sum.amount || 0,
      count: item._count,
    })),
  }
}
