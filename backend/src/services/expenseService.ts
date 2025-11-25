import prisma from '../config/database'
import { Prisma } from '@prisma/client'

/**
 * 支出服务层 - 处理支出相关的业务逻辑
 */

// 获取所有支出（支持筛选）
export const getAllExpenses = async (filters?: {
  accountBookId?: string
  categoryTagId?: string
  startDate?: string
  endDate?: string
}) => {
  const where: Prisma.ExpenseWhereInput = {}

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

  return await prisma.expense.findMany({
    where,
    include: {
      accountBook: true,
      categoryTag: true,
      reimbursement: true,
    },
    orderBy: {
      date: 'desc',
    },
  })
}

// 获取单个支出
export const getExpenseById = async (id: string) => {
  return await prisma.expense.findUnique({
    where: { id },
    include: {
      accountBook: true,
      categoryTag: true,
      reimbursement: true,
    },
  })
}

// 创建支出（自动扣减账本余额）
export const createExpense = async (data: Prisma.ExpenseCreateInput) => {
  return await prisma.$transaction(async (tx) => {
    // 创建支出
    const expense = await tx.expense.create({
      data,
      include: {
        accountBook: true,
        categoryTag: true,
        reimbursement: true,
      },
    })

    // 更新分类标签计数 +1
    if (expense.categoryTagId) {
      await tx.tag.update({
        where: { id: expense.categoryTagId },
        data: { count: { increment: 1 } },
      })
    }

    // 更新普通标签计数 +1
    if (expense.labelTagIds && expense.labelTagIds.length > 0) {
      for (const tagId of expense.labelTagIds) {
        await tx.tag.update({
          where: { id: tagId },
          data: { count: { increment: 1 } },
        })
      }
    }

    // 如果关联了账本，自动扣减账本余额
    if (expense.accountBookId) {
      const accountBook = await tx.accountBook.findUnique({
        where: { id: expense.accountBookId },
      })

      if (accountBook) {
        const amountBefore = accountBook.currentBalance
        const amountAfter = amountBefore.sub(expense.amount)

        // 更新账本余额
        await tx.accountBook.update({
          where: { id: expense.accountBookId },
          data: { currentBalance: amountAfter },
        })

        // 创建余额变动日志
        await tx.balanceLog.create({
          data: {
            accountBookId: expense.accountBookId,
            changeType: 'expense',
            amountBefore,
            amountAfter,
            changeAmount: expense.amount.negated(),
            note: `支出：${expense.description}`,
            relatedExpenseId: expense.id,
          },
        })
      }
    }

    return expense
  })
}

// 更新支出
export const updateExpense = async (id: string, data: Prisma.ExpenseUpdateInput) => {
  return await prisma.$transaction(async (tx) => {
    // 获取原支出数据
    const oldExpense = await tx.expense.findUnique({
      where: { id },
    })

    if (!oldExpense) {
      throw new Error('Expense not found')
    }

    // 更新支出
    const updatedExpense = await tx.expense.update({
      where: { id },
      data,
      include: {
        accountBook: true,
        categoryTag: true,
        reimbursement: true,
      },
    })

    // 处理分类标签变更
    const newCategoryTagId = (data.categoryTag as any)?.connect?.id || (data as any).categoryTagId
    if (newCategoryTagId && newCategoryTagId !== oldExpense.categoryTagId) {
      // 旧标签 -1
      if (oldExpense.categoryTagId) {
        await tx.tag.update({
          where: { id: oldExpense.categoryTagId },
          data: { count: { decrement: 1 } },
        })
      }
      // 新标签 +1
      await tx.tag.update({
        where: { id: newCategoryTagId },
        data: { count: { increment: 1 } },
      })
    }

    // 处理普通标签变更
    const newLabelTagIds = (data as any).labelTagIds as string[] | undefined
    if (newLabelTagIds !== undefined) {
      const oldLabelTagIds = oldExpense.labelTagIds || []

      // 找出被移除的标签
      const removedTagIds = oldLabelTagIds.filter((id: string) => !newLabelTagIds.includes(id))
      for (const tagId of removedTagIds) {
        await tx.tag.update({
          where: { id: tagId },
          data: { count: { decrement: 1 } },
        })
      }

      // 找出新增的标签
      const addedTagIds = newLabelTagIds.filter(id => !oldLabelTagIds.includes(id))
      for (const tagId of addedTagIds) {
        await tx.tag.update({
          where: { id: tagId },
          data: { count: { increment: 1 } },
        })
      }
    }

    return updatedExpense
  })
}

// 删除支出（自动恢复账本余额）
export const deleteExpense = async (id: string) => {
  return await prisma.$transaction(async (tx) => {
    // 获取支出数据
    const expense = await tx.expense.findUnique({
      where: { id },
      include: { reimbursement: true },
    })

    if (!expense) {
      throw new Error('Expense not found')
    }

    // 如果关联了账本，自动恢复账本余额
    if (expense.accountBookId) {
      const accountBook = await tx.accountBook.findUnique({
        where: { id: expense.accountBookId },
      })

      if (accountBook) {
        const amountBefore = accountBook.currentBalance
        const amountAfter = amountBefore.add(expense.amount)

        // 更新账本余额
        await tx.accountBook.update({
          where: { id: expense.accountBookId },
          data: { currentBalance: amountAfter },
        })

        // 创建余额变动日志
        await tx.balanceLog.create({
          data: {
            accountBookId: expense.accountBookId,
            changeType: 'manual_adjust',
            amountBefore,
            amountAfter,
            changeAmount: expense.amount,
            note: `删除支出：${expense.description}`,
            relatedExpenseId: expense.id,
          },
        })
      }
    }

    // 处理报销关联
    if (expense?.reimbursement) {
      await tx.reimbursement.update({
        where: { id: expense.reimbursement.id },
        data: { expenseId: null },
      })
    }

    // 删除支出
    const deleted = await tx.expense.delete({
      where: { id },
    })

    // 更新分类标签计数 -1
    if (expense.categoryTagId) {
      await tx.tag.update({
        where: { id: expense.categoryTagId },
        data: { count: { decrement: 1 } },
      })
    }

    // 更新普通标签计数 -1
    if (expense.labelTagIds && expense.labelTagIds.length > 0) {
      for (const tagId of expense.labelTagIds) {
        await tx.tag.update({
          where: { id: tagId },
          data: { count: { decrement: 1 } },
        })
      }
    }

    return deleted
  })
}

// 获取支出统计
export const getExpenseStats = async (filters?: {
  accountBookId?: string
  startDate?: string
  endDate?: string
}) => {
  const where: Prisma.ExpenseWhereInput = {}

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

  const [total, count, byCategory] = await Promise.all([
    // 总金额
    prisma.expense.aggregate({
      where,
      _sum: { amount: true },
    }),
    // 总笔数
    prisma.expense.count({ where }),
    // 按类别分组
    prisma.expense.groupBy({
      by: ['categoryTagId'],
      where,
      _sum: { amount: true },
      _count: true,
    }),
  ])

  return {
    totalAmount: total._sum.amount || 0,
    totalCount: count,
    byCategory: byCategory.map(item => ({
      categoryTagId: item.categoryTagId,
      amount: item._sum.amount || 0,
      count: item._count,
    })),
  }
}
