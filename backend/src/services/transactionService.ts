import prisma from '../config/database'
import { Prisma } from '@prisma/client'
import * as balanceService from './balanceService'
import * as tagService from './tagService'

/**
 * 统一交易服务层 - 处理收入、支出、投资的所有交易逻辑
 *
 * 余额管理已集中到balanceService，本服务专注于交易的CRUD操作
 *
 * 标签验证规则：
 * - 分类标签必须适用于交易类型（income/expense/investment）
 * - 分类标签和普通标签必须对目标账本可用（全局标签或账本专属标签）
 */

export type TransactionType = 'income' | 'expense' | 'investment'

/**
 * 获取所有交易（支持筛选和分页）
 *
 * accountBookId 筛选逻辑：
 * - 不传 accountBookId：返回所有交易（包括 accountBookId=null 的全局交易）
 * - 传 null（明确）：只返回 accountBookId=null 的全局交易
 * - 传 'global'：只返回 accountBookId=null 的全局交易（前端便捷值）
 * - 传具体 ID：只返回该账本的交易
 *
 * 分页参数：
 * - page: 页码（从1开始，默认1）
 * - pageSize: 每页数量（默认50，最大100）
 *
 * @param filters 筛选条件
 * @returns 分页结果 { data, pagination }
 */
export const getAllTransactions = async (filters?: {
  type?: TransactionType
  accountBookId?: string | null  // null 或 'global' 表示只查询全局交易
  categoryTagId?: string
  startDate?: string
  endDate?: string
  needsReimbursement?: boolean
  page?: number      // 页码，从1开始
  pageSize?: number  // 每页数量
}) => {
  const where: Prisma.TransactionWhereInput = {}

  // 分页参数处理
  const page = Math.max(1, filters?.page || 1)
  const pageSize = Math.min(100, Math.max(1, filters?.pageSize || 50))
  const skip = (page - 1) * pageSize

  if (filters) {
    if (filters.type) {
      where.type = filters.type
    }

    // accountBookId 筛选逻辑
    if (filters.accountBookId !== undefined) {
      if (filters.accountBookId === null || filters.accountBookId === 'global') {
        // 明确传 null 或 'global'：只返回全局交易
        where.accountBookId = null
      } else {
        // 传具体 ID：只返回该账本的交易
        where.accountBookId = filters.accountBookId
      }
    }
    // 不传 accountBookId：不添加筛选条件，返回所有交易

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

  // 并行查询数据和总数
  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: {
        accountBook: true,
        categoryTag: true,
        reimbursement: true,
      },
      orderBy: {
        date: 'desc',
      },
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

/**
 * 创建交易（自动更新余额）
 *
 * 验证规则：
 * 1. 分类标签必须存在且适用于交易类型
 * 2. 分类标签必须对目标账本可用（全局或账本专属）
 * 3. 普通标签必须对目标账本可用（全局或账本专属）
 * 4. 创建后自动更新账本余额
 */
export const createTransaction = async (data: Prisma.TransactionCreateInput & { type?: string; categoryTagId?: string; labelTagIds?: string[] }) => {
  // 获取目标账本ID（可能在 accountBook.connect 中）
  const accountBookId = (data.accountBook as any)?.connect?.id || (data as any).accountBookId || null

  return await prisma.$transaction(async (tx) => {
    // 验证分类标签是否适用于该交易类型
    if (data.categoryTagId && data.type) {
      const categoryTag = await tx.tag.findUnique({
        where: { id: data.categoryTagId as string },
      })

      if (!categoryTag) {
        throw new Error('分类标签不存在')
      }

      // 检查 applicableTypes
      if (categoryTag.applicableTypes && categoryTag.applicableTypes.length > 0) {
        if (!categoryTag.applicableTypes.includes(data.type)) {
          throw new Error(
            `分类标签"${categoryTag.name}"不适用于${data.type === 'income' ? '收入' : data.type === 'expense' ? '支出' : '投资'}交易。适用类型: ${categoryTag.applicableTypes.map(t => t === 'income' ? '收入' : t === 'expense' ? '支出' : '投资').join(', ')}`
          )
        }
      }

      // 检查分类标签是否可用于目标账本
      if (!tagService.isTagAvailableForAccountBook(categoryTag, accountBookId)) {
        throw new Error(
          `分类标签"${categoryTag.name}"是账本专属标签，不能在其他账本使用`
        )
      }
    }

    // 验证普通标签是否可用于目标账本
    const labelTagIds = (data as any).labelTagIds as string[] | undefined
    if (labelTagIds && labelTagIds.length > 0) {
      const labelTags = await tx.tag.findMany({
        where: { id: { in: labelTagIds } },
      })

      for (const tag of labelTags) {
        if (!tagService.isTagAvailableForAccountBook(tag, accountBookId)) {
          throw new Error(
            `标签"${tag.name}"是账本专属标签，不能在其他账本使用`
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

/**
 * 更新交易
 *
 * 验证规则：
 * 1. 分类标签必须存在且适用于交易类型
 * 2. 分类标签必须对目标账本可用（全局或账本专属）
 * 3. 普通标签必须对目标账本可用（全局或账本专属）
 * 4. 更新后自动调整账本余额（处理账本变更情况）
 */
export const updateTransaction = async (id: string, data: Prisma.TransactionUpdateInput & { type?: string; categoryTagId?: string; labelTagIds?: string[] }) => {
  return await prisma.$transaction(async (tx) => {
    // 获取原交易数据
    const oldTransaction = await tx.transaction.findUnique({
      where: { id },
    })

    if (!oldTransaction) {
      throw new Error('交易记录不存在')
    }

    // 获取目标账本ID（可能在 accountBook.connect 中，或使用原账本）
    const accountBookId = (data.accountBook as any)?.connect?.id ||
                          (data as any).accountBookId ||
                          oldTransaction.accountBookId

    // 如果更新了分类标签，验证新标签是否适用于该交易类型和账本
    if (data.categoryTagId) {
      const transactionType = data.type || oldTransaction.type
      const categoryTag = await tx.tag.findUnique({
        where: { id: data.categoryTagId as string },
      })

      if (!categoryTag) {
        throw new Error('分类标签不存在')
      }

      // 检查 applicableTypes
      if (categoryTag.applicableTypes && categoryTag.applicableTypes.length > 0) {
        if (!categoryTag.applicableTypes.includes(transactionType)) {
          throw new Error(
            `分类标签"${categoryTag.name}"不适用于${transactionType === 'income' ? '收入' : transactionType === 'expense' ? '支出' : '投资'}交易。适用类型: ${categoryTag.applicableTypes.map(t => t === 'income' ? '收入' : t === 'expense' ? '支出' : '投资').join(', ')}`
          )
        }
      }

      // 检查分类标签是否可用于目标账本
      if (!tagService.isTagAvailableForAccountBook(categoryTag, accountBookId)) {
        throw new Error(
          `分类标签"${categoryTag.name}"是账本专属标签，不能在其他账本使用`
        )
      }
    }

    // 验证普通标签是否可用于目标账本
    const newLabelTagIds = (data as any).labelTagIds as string[] | undefined
    if (newLabelTagIds && newLabelTagIds.length > 0) {
      const labelTags = await tx.tag.findMany({
        where: { id: { in: newLabelTagIds } },
      })

      for (const tag of labelTags) {
        if (!tagService.isTagAvailableForAccountBook(tag, accountBookId)) {
          throw new Error(
            `标签"${tag.name}"是账本专属标签，不能在其他账本使用`
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

/**
 * 删除交易（自动恢复余额）
 *
 * 删除流程：
 * 1. 获取交易数据（包含报销关联）
 * 2. 恢复账本余额（通过 balanceService）
 * 3. 解除报销关联（如果有）
 * 4. 删除交易记录
 * 5. 更新标签使用计数
 *
 * 所有操作在事务中执行，确保原子性
 *
 * @param id - 交易ID
 * @returns 删除的交易记录
 * @throws 如果交易不存在
 */
export const deleteTransaction = async (id: string) => {
  return await prisma.$transaction(async (tx) => {
    // 步骤1: 获取交易数据（包含报销关联）
    const transaction = await tx.transaction.findUnique({
      where: { id },
      include: { reimbursement: true },
    })

    if (!transaction) {
      throw new Error('Transaction not found')
    }

    // 步骤2: 使用集中的余额服务恢复余额
    await balanceService.updateBalanceOnTransactionDelete(tx, transaction)

    // 步骤3: 处理报销关联（解除关联，不删除报销单）
    if (transaction?.reimbursement) {
      await tx.reimbursement.update({
        where: { id: transaction.reimbursement.id },
        data: { transactionId: null },
      })
    }

    // 步骤4: 删除交易记录
    const deleted = await tx.transaction.delete({
      where: { id },
    })

    // 步骤5: 更新标签使用计数
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

/**
 * 获取交易统计
 *
 * accountBookId 筛选逻辑（与 getAllTransactions 保持一致）：
 * - 不传 accountBookId：统计所有交易（包括全局交易）
 * - 传 null 或 'global'：只统计全局交易
 * - 传具体 ID：只统计该账本的交易
 */
export const getTransactionStats = async (filters?: {
  type?: TransactionType
  accountBookId?: string | null
  startDate?: string
  endDate?: string
}) => {
  const where: Prisma.TransactionWhereInput = {}

  if (filters) {
    if (filters.type) {
      where.type = filters.type
    }

    // accountBookId 筛选逻辑
    if (filters.accountBookId !== undefined) {
      if (filters.accountBookId === null || filters.accountBookId === 'global') {
        where.accountBookId = null
      } else {
        where.accountBookId = filters.accountBookId
      }
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