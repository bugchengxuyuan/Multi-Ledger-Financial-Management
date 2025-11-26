import prisma from '../config/database'
import { Prisma } from '@prisma/client'

/**
 * 账本服务层 - 处理账本相关的业务逻辑
 */

// 获取所有账本
export const getAllAccountBooks = async () => {
  return await prisma.accountBook.findMany({
    include: {
      _count: {
        select: {
          expenses: true,
          budgets: true,
        },
      },
    },
    orderBy: [
      { isDefault: 'desc' }, // 默认账本排在前面
      { createdAt: 'asc' },
    ],
  })
}

// 获取单个账本
export const getAccountBookById = async (id: string) => {
  return await prisma.accountBook.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          expenses: true,
          budgets: true,
        },
      },
    },
  })
}

// 创建账本
export const createAccountBook = async (data: Prisma.AccountBookCreateInput) => {
  // 如果设置为默认账本，先取消其他账本的默认状态
  if (data.isDefault) {
    await prisma.accountBook.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    })
  }

  return await prisma.accountBook.create({
    data,
    include: {
      _count: {
        select: {
          expenses: true,
          budgets: true,
        },
      },
    },
  })
}

// 更新账本
export const updateAccountBook = async (id: string, data: Prisma.AccountBookUpdateInput) => {
  // 如果设置为默认账本，先取消其他账本的默认状态
  if (data.isDefault === true) {
    await prisma.accountBook.updateMany({
      where: {
        id: { not: id },
        isDefault: true,
      },
      data: { isDefault: false },
    })
  }

  return await prisma.accountBook.update({
    where: { id },
    data,
    include: {
      _count: {
        select: {
          expenses: true,
          budgets: true,
        },
      },
    },
  })
}

/**
 * 删除账本
 *
 * 删除规则：
 * - 不能删除默认账本
 * - 不能删除唯一的账本（至少保留一个账本）
 * - 删除前将所有关联记录的 accountBookId 设置为 null
 *
 * 处理的关联表：
 * - Expense（旧表，保留用于迁移）
 * - Income（旧表，保留用于迁移）
 * - Transaction（统一交易表）
 * - Budget（预算表）
 * - Tag（标签表，账本专属标签）
 *
 * 注意：CreditAccount 采用 onDelete: Cascade，会自动删除
 */
export const deleteAccountBook = async (id: string) => {
  // 检查是否是默认账本
  const accountBook = await prisma.accountBook.findUnique({
    where: { id },
  })

  if (!accountBook) {
    throw new Error('Account book not found')
  }

  if (accountBook.isDefault) {
    throw new Error('Cannot delete default account book')
  }

  // 检查是否是唯一的账本（Problem 11: 边界情况处理）
  const accountBookCount = await prisma.accountBook.count()
  if (accountBookCount === 1) {
    throw new Error('Cannot delete the only account book')
  }

  // 使用事务处理所有关联数据
  await prisma.$transaction([
    // 将关联的支出的accountBookId设置为null（旧表，保留用于迁移）
    prisma.expense.updateMany({
      where: { accountBookId: id },
      data: { accountBookId: null },
    }),
    // 将关联的收入的accountBookId设置为null（旧表，保留用于迁移）
    prisma.income.updateMany({
      where: { accountBookId: id },
      data: { accountBookId: null },
    }),
    // 将关联的交易的accountBookId设置为null（统一交易表）
    prisma.transaction.updateMany({
      where: { accountBookId: id },
      data: { accountBookId: null },
    }),
    // 将关联的预算的accountBookId设置为null
    prisma.budget.updateMany({
      where: { accountBookId: id },
      data: { accountBookId: null },
    }),
    // 将关联的标签的accountBookId设置为null（账本专属标签变为全局标签）
    prisma.tag.updateMany({
      where: { accountBookId: id },
      data: { accountBookId: null },
    }),
    // 删除账本（CreditAccount 会通过 cascade 自动删除）
    prisma.accountBook.delete({
      where: { id },
    }),
  ])
}

/**
 * 设置默认账本
 *
 * 使用事务确保原子性：
 * 1. 取消所有账本的默认状态
 * 2. 设置指定账本为默认
 *
 * 返回所有账本的最新状态，便于前端完整更新状态
 */
export const setDefaultAccountBook = async (id: string) => {
  // 检查账本是否存在
  const accountBook = await prisma.accountBook.findUnique({
    where: { id },
  })

  if (!accountBook) {
    throw new Error('Account book not found')
  }

  await prisma.$transaction([
    // 取消所有账本的默认状态
    prisma.accountBook.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    }),
    // 设置指定账本为默认
    prisma.accountBook.update({
      where: { id },
      data: { isDefault: true },
    }),
  ])

  // 返回所有账本的最新状态，便于前端完整更新
  return await getAllAccountBooks()
}

// 获取默认账本
export const getDefaultAccountBook = async () => {
  return await prisma.accountBook.findFirst({
    where: { isDefault: true },
    include: {
      _count: {
        select: {
          expenses: true,
          budgets: true,
        },
      },
    },
  })
}

// 获取账本统计信息
export const getAccountBookStats = async (id: string, filters?: {
  startDate?: string
  endDate?: string
}) => {
  const where: Prisma.ExpenseWhereInput = {
    accountBookId: id,
  }

  if (filters?.startDate || filters?.endDate) {
    where.date = {}
    if (filters.startDate) {
      where.date.gte = new Date(filters.startDate)
    }
    if (filters.endDate) {
      where.date.lte = new Date(filters.endDate)
    }
  }

  const [totalExpense, expenseCount, budgetCount] = await Promise.all([
    // 总支出金额
    prisma.expense.aggregate({
      where,
      _sum: { amount: true },
    }),
    // 支出笔数
    prisma.expense.count({ where: { accountBookId: id } }),
    // 预算数量
    prisma.budget.count({ where: { accountBookId: id } }),
  ])

  return {
    expenseCount,
    budgetCount,
    totalExpense: totalExpense._sum.amount || 0,
  }
}
