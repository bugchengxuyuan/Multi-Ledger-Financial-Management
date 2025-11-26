/**
 * V1 交易服务层
 * 参考: Firefly III的Transaction简化版
 *
 * 核心功能：
 * - 交易CRUD操作
 * - 自动更新余额（通过balanceService）
 * - 标签验证和关联
 */

import prisma from '../../config/database'
import { Prisma } from '@prisma/client'
import * as balanceService from './balanceService'
import * as tagService from './tagService'

export type TransactionType = 'income' | 'expense'

export interface CreateTransactionInput {
  accountBookId: string
  type: TransactionType
  amount: number
  date: string | Date
  categoryTagId: string
  labelTagIds?: string[]
  description?: string
  notes?: string
}

export interface UpdateTransactionInput {
  type?: TransactionType
  amount?: number
  date?: string | Date
  categoryTagId?: string
  labelTagIds?: string[]
  description?: string
  notes?: string
}

/**
 * 获取所有交易（支持筛选和分页）
 */
export const getAllTransactions = async (filters?: {
  accountBookId?: string
  type?: TransactionType
  categoryTagId?: string
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}) => {
  const where: Prisma.TransactionWhereInput = {}

  // 分页参数
  const page = Math.max(1, filters?.page || 1)
  const pageSize = Math.min(100, Math.max(1, filters?.pageSize || 50))
  const skip = (page - 1) * pageSize

  if (filters) {
    if (filters.accountBookId) {
      where.accountBookId = filters.accountBookId
    }
    if (filters.type) {
      where.type = filters.type
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

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: {
        accountBook: {
          select: {
            id: true,
            name: true,
            color: true,
            icon: true,
          },
        },
        categoryTag: true,
        labelTags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: { date: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.transaction.count({ where }),
  ])

  return {
    data: transactions,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  }
}

/**
 * 获取单个交易
 */
export const getTransactionById = async (id: string) => {
  return await prisma.transaction.findUnique({
    where: { id },
    include: {
      accountBook: {
        select: {
          id: true,
          name: true,
          color: true,
          icon: true,
        },
      },
      categoryTag: true,
      labelTags: {
        include: {
          tag: true,
        },
      },
      balanceLogs: true,
    },
  })
}

/**
 * 创建交易
 *
 * 业务流程：
 * 1. 验证分类标签
 * 2. 验证普通标签
 * 3. 创建交易
 * 4. 创建标签关联
 * 5. 更新账本余额
 */
export const createTransaction = async (data: CreateTransactionInput) => {
  return await prisma.$transaction(async (tx) => {
    // 1. 验证分类标签
    await tagService.validateCategoryTag(data.categoryTagId, data.accountBookId)

    // 2. 验证普通标签
    if (data.labelTagIds && data.labelTagIds.length > 0) {
      await tagService.validateLabelTags(data.labelTagIds, data.accountBookId)
    }

    // 3. 创建交易
    const transaction = await tx.transaction.create({
      data: {
        accountBookId: data.accountBookId,
        type: data.type,
        amount: data.amount,
        date: new Date(data.date),
        categoryTagId: data.categoryTagId,
        description: data.description,
        notes: data.notes,
      },
      include: {
        accountBook: {
          select: {
            id: true,
            name: true,
            color: true,
            icon: true,
          },
        },
        categoryTag: true,
      },
    })

    // 4. 创建标签关联
    if (data.labelTagIds && data.labelTagIds.length > 0) {
      await tx.transactionTag.createMany({
        data: data.labelTagIds.map(tagId => ({
          transactionId: transaction.id,
          tagId,
        })),
      })
    }

    // 5. 更新账本余额
    await balanceService.updateBalanceOnTransactionCreate(tx, {
      id: transaction.id,
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description,
      accountBookId: transaction.accountBookId,
    })

    // 返回完整数据
    return await tx.transaction.findUnique({
      where: { id: transaction.id },
      include: {
        accountBook: {
          select: {
            id: true,
            name: true,
            color: true,
            icon: true,
          },
        },
        categoryTag: true,
        labelTags: {
          include: {
            tag: true,
          },
        },
      },
    })
  })
}

/**
 * 更新交易
 *
 * 业务流程：
 * 1. 获取原交易数据
 * 2. 验证新的标签（如果有变化）
 * 3. 更新交易
 * 4. 更新标签关联（如果有变化）
 * 5. 调整账本余额（如果金额/类型有变化）
 */
export const updateTransaction = async (id: string, data: UpdateTransactionInput) => {
  return await prisma.$transaction(async (tx) => {
    // 1. 获取原交易数据
    const oldTransaction = await tx.transaction.findUnique({
      where: { id },
      include: {
        labelTags: true,
      },
    })

    if (!oldTransaction) {
      throw new Error('交易记录不存在')
    }

    // 2. 验证新的分类标签
    if (data.categoryTagId && data.categoryTagId !== oldTransaction.categoryTagId) {
      await tagService.validateCategoryTag(data.categoryTagId, oldTransaction.accountBookId)
    }

    // 3. 验证新的普通标签
    if (data.labelTagIds) {
      await tagService.validateLabelTags(data.labelTagIds, oldTransaction.accountBookId)
    }

    // 4. 更新交易
    const updatedTransaction = await tx.transaction.update({
      where: { id },
      data: {
        ...(data.type && { type: data.type }),
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.date && { date: new Date(data.date) }),
        ...(data.categoryTagId && { categoryTagId: data.categoryTagId }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    })

    // 5. 更新标签关联（如果有变化）
    if (data.labelTagIds !== undefined) {
      // 删除旧的关联
      await tx.transactionTag.deleteMany({
        where: { transactionId: id },
      })

      // 创建新的关联
      if (data.labelTagIds.length > 0) {
        await tx.transactionTag.createMany({
          data: data.labelTagIds.map(tagId => ({
            transactionId: id,
            tagId,
          })),
        })
      }
    }

    // 6. 调整账本余额
    await balanceService.updateBalanceOnTransactionUpdate(
      tx,
      {
        id: oldTransaction.id,
        type: oldTransaction.type,
        amount: oldTransaction.amount,
        description: oldTransaction.description,
        accountBookId: oldTransaction.accountBookId,
      },
      {
        id: updatedTransaction.id,
        type: updatedTransaction.type,
        amount: updatedTransaction.amount,
        description: updatedTransaction.description,
        accountBookId: updatedTransaction.accountBookId,
      }
    )

    // 返回完整数据
    return await tx.transaction.findUnique({
      where: { id },
      include: {
        accountBook: {
          select: {
            id: true,
            name: true,
            color: true,
            icon: true,
          },
        },
        categoryTag: true,
        labelTags: {
          include: {
            tag: true,
          },
        },
      },
    })
  })
}

/**
 * 删除交易
 *
 * 业务流程：
 * 1. 获取交易数据
 * 2. 恢复账本余额
 * 3. 删除交易（标签关联会级联删除）
 */
export const deleteTransaction = async (id: string) => {
  return await prisma.$transaction(async (tx) => {
    // 1. 获取交易数据
    const transaction = await tx.transaction.findUnique({
      where: { id },
    })

    if (!transaction) {
      throw new Error('交易记录不存在')
    }

    // 2. 恢复账本余额
    await balanceService.updateBalanceOnTransactionDelete(tx, {
      id: transaction.id,
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description,
      accountBookId: transaction.accountBookId,
    })

    // 3. 删除交易（标签关联会级联删除）
    return await tx.transaction.delete({
      where: { id },
    })
  })
}

/**
 * 获取按日期分组的交易
 */
export const getTransactionsByDateRange = async (
  accountBookId: string,
  startDate: Date,
  endDate: Date
) => {
  const transactions = await prisma.transaction.findMany({
    where: {
      accountBookId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      categoryTag: true,
      labelTags: {
        include: {
          tag: true,
        },
      },
    },
    orderBy: { date: 'desc' },
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
