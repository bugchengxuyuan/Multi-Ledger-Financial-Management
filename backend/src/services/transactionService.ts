import prisma from '../config/database'
import { Prisma } from '@prisma/client'
import * as balanceService from './balanceService'

/**
 * 统一交易服务层 - 处理收入、支出、投资的所有交易逻辑
 *
 * 余额管理已集中到balanceService，本服务专注于交易的CRUD操作
 */

export type TransactionType = 'income' | 'expense' | 'investment'

// 获取所有交易（支持筛选）
export const getAllTransactions = async (filters?: {
  type?: TransactionType
  accountBookId?: string
  categoryTagId?: string
  startDate?: string
  endDate?: string
  needsReimbursement?: boolean
}) => {
  const where: Prisma.TransactionWhereInput = {}

  if (filters) {
    if (filters.type) {
      where.type = filters.type
    }
    if (filters.accountBookId) {
      where.accountBookId = filters.accountBookId
    }
    if (filters.categoryTagId) {
      where.categoryTagId = filters.categoryTagId
    }
    if (filters.needsReimbursement !== undefined) {
      where.needsReimbursement = filters.needsReimbursement
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

  return await prisma.transaction.findMany({
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

// 获取单个交易
export const getTransactionById = async (id: string) => {
  return await prisma.transaction.findUnique({
    where: { id },
    include: {
      accountBook: true,
      categoryTag: true,
      reimbursement: true,
      balanceLogs: true,
    },
  })
}

// 创建交易（自动更新余额）
export const createTransaction = async (data: Prisma.TransactionCreateInput & { type?: string; categoryTagId?: string }) => {
  return await prisma.$transaction(async (tx) => {
    // 验证分类标签是否适用于该交易类型
    if (data.categoryTagId && data.type) {
      const categoryTag = await tx.tag.findUnique({
        where: { id: data.categoryTagId as string },
      })

      if (!categoryTag) {
        throw new Error('分类标签不存在')
      }

      // 检查applicableTypes
      if (categoryTag.applicableTypes && categoryTag.applicableTypes.length > 0) {
        if (!categoryTag.applicableTypes.includes(data.type)) {
          throw new Error(
            `分类标签"${categoryTag.name}"不适用于${data.type === 'income' ? '收入' : data.type === 'expense' ? '支出' : '投资'}交易。适用类型: ${categoryTag.applicableTypes.map(t => t === 'income' ? '收入' : t === 'expense' ? '支出' : '投资').join(', ')}`
          )
        }
      }
    }

    // 创建交易
    const transaction = await tx.transaction.create({
      data,
      include: {
        accountBook: true,
        categoryTag: true,
        reimbursement: true,
      },
    })

    // 更新分类标签计数 +1
    if (transaction.categoryTagId) {
      await tx.tag.update({
        where: { id: transaction.categoryTagId },
        data: { count: { increment: 1 } },
      })
    }

    // 更新普通标签计数 +1
    if (transaction.labelTagIds && transaction.labelTagIds.length > 0) {
      for (const tagId of transaction.labelTagIds) {
        await tx.tag.update({
          where: { id: tagId },
          data: { count: { increment: 1 } },
        })
      }
    }

    // 使用集中的余额服务更新余额
    await balanceService.updateBalanceOnTransactionCreate(tx, transaction)

    return transaction
  })
}

// 更新交易
export const updateTransaction = async (id: string, data: Prisma.TransactionUpdateInput & { type?: string; categoryTagId?: string }) => {
  return await prisma.$transaction(async (tx) => {
    // 获取原交易数据
    const oldTransaction = await tx.transaction.findUnique({
      where: { id },
    })

    if (!oldTransaction) {
      throw new Error('交易记录不存在')
    }

    // 如果更新了分类标签，验证新标签是否适用于该交易类型
    if (data.categoryTagId) {
      const transactionType = data.type || oldTransaction.type
      const categoryTag = await tx.tag.findUnique({
        where: { id: data.categoryTagId as string },
      })

      if (!categoryTag) {
        throw new Error('分类标签不存在')
      }

      // 检查applicableTypes
      if (categoryTag.applicableTypes && categoryTag.applicableTypes.length > 0) {
        if (!categoryTag.applicableTypes.includes(transactionType)) {
          throw new Error(
            `分类标签"${categoryTag.name}"不适用于${transactionType === 'income' ? '收入' : transactionType === 'expense' ? '支出' : '投资'}交易。适用类型: ${categoryTag.applicableTypes.map(t => t === 'income' ? '收入' : t === 'expense' ? '支出' : '投资').join(', ')}`
          )
        }
      }
    }

    // 更新交易
    const updatedTransaction = await tx.transaction.update({
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
    if (newCategoryTagId && newCategoryTagId !== oldTransaction.categoryTagId) {
      // 旧标签 -1
      if (oldTransaction.categoryTagId) {
        await tx.tag.update({
          where: { id: oldTransaction.categoryTagId },
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
      const oldLabelTagIds = oldTransaction.labelTagIds || []

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

    // 使用集中的余额服务处理交易更新时的余额调整
    await balanceService.updateBalanceOnTransactionUpdate(tx, oldTransaction, updatedTransaction)

    return updatedTransaction
  })
}

// 删除交易（自动恢复余额）
export const deleteTransaction = async (id: string) => {
  return await prisma.$transaction(async (tx) => {
    // 获取交易数据
    const transaction = await tx.transaction.findUnique({
      where: { id },
      include: { reimbursement: true },
    })

    if (!transaction) {
      throw new Error('Transaction not found')
    }

    // 使用集中的余额服务恢复余额
    await balanceService.updateBalanceOnTransactionDelete(tx, transaction)

    // 处理报销关联
    if (transaction?.reimbursement) {
      await tx.reimbursement.update({
        where: { id: transaction.reimbursement.id },
        data: { transactionId: null },
      })
    }

    // 删除交易
    const deleted = await tx.transaction.delete({
      where: { id },
    })

    // 更新分类标签计数 -1
    if (transaction.categoryTagId) {
      await tx.tag.update({
        where: { id: transaction.categoryTagId },
        data: { count: { decrement: 1 } },
      })
    }

    // 更新普通标签计数 -1
    if (transaction.labelTagIds && transaction.labelTagIds.length > 0) {
      for (const tagId of transaction.labelTagIds) {
        await tx.tag.update({
          where: { id: tagId },
          data: { count: { decrement: 1 } },
        })
      }
    }

    return deleted
  })
}

// 获取交易统计
export const getTransactionStats = async (filters?: {
  type?: TransactionType
  accountBookId?: string
  startDate?: string
  endDate?: string
}) => {
  const where: Prisma.TransactionWhereInput = {}

  if (filters) {
    if (filters.type) {
      where.type = filters.type
    }
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

  const [total, count, byCategory, byType] = await Promise.all([
    // 总金额
    prisma.transaction.aggregate({
      where,
      _sum: { amount: true },
    }),
    // 总笔数
    prisma.transaction.count({ where }),
    // 按类别分组
    prisma.transaction.groupBy({
      by: ['categoryTagId'],
      where,
      _sum: { amount: true },
      _count: true,
    }),
    // 按类型分组
    prisma.transaction.groupBy({
      by: ['type'],
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
    byType: byType.map(item => ({
      type: item.type,
      amount: item._sum.amount || 0,
      count: item._count,
    })),
  }
}

// 批量创建交易（用于数据迁移）
export const createManyTransactions = async (data: Prisma.TransactionCreateManyInput[]) => {
  return await prisma.transaction.createMany({
    data,
    skipDuplicates: true,
  })
}

// 获取按日期分组的交易
export const getTransactionsByDateRange = async (
  startDate: Date,
  endDate: Date,
  accountBookId?: string
) => {
  const where: Prisma.TransactionWhereInput = {
    date: {
      gte: startDate,
      lte: endDate,
    },
  }

  if (accountBookId) {
    where.accountBookId = accountBookId
  }

  const transactions = await prisma.transaction.findMany({
    where,
    include: {
      categoryTag: true,
      accountBook: true,
    },
    orderBy: {
      date: 'desc',
    },
  })

  // 按日期分组
  const groupedByDate = transactions.reduce((acc, transaction) => {
    const dateKey = transaction.date.toISOString().split('T')[0]
    if (!acc[dateKey]) {
      acc[dateKey] = []
    }
    acc[dateKey].push(transaction)
    return acc
  }, {} as Record<string, typeof transactions>)

  return groupedByDate
}