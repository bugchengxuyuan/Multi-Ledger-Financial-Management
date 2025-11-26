import prisma from '../config/database'
import { Prisma } from '@prisma/client'

/**
 * 预算服务层 - 处理预算相关的业务逻辑
 */

// 获取所有预算（支持筛选）
export const getAllBudgets = async (filters?: {
  accountBookId?: string
  categoryTagId?: string
  period?: string
}) => {
  const where: Prisma.BudgetWhereInput = {}

  if (filters) {
    if (filters.accountBookId) {
      where.accountBookId = filters.accountBookId
    }
    if (filters.categoryTagId) {
      where.categoryTagId = filters.categoryTagId
    }
    if (filters.period) {
      where.period = filters.period
    }
  }

  return await prisma.budget.findMany({
    where,
    include: {
      accountBook: true,
    },
    orderBy: {
      startDate: 'desc',
    },
  })
}

// 获取单个预算
export const getBudgetById = async (id: string) => {
  return await prisma.budget.findUnique({
    where: { id },
    include: {
      accountBook: true,
    },
  })
}

// 创建预算
export const createBudget = async (data: Prisma.BudgetCreateInput) => {
  return await prisma.budget.create({
    data,
    include: {
      accountBook: true,
    },
  })
}

// 更新预算
export const updateBudget = async (id: string, data: Prisma.BudgetUpdateInput) => {
  return await prisma.budget.update({
    where: { id },
    data,
    include: {
      accountBook: true,
    },
  })
}

// 删除预算
export const deleteBudget = async (id: string) => {
  return await prisma.budget.delete({
    where: { id },
  })
}

/**
 * 获取预算使用情况
 *
 * 查询逻辑：
 * - 使用统一的 Transaction 表（替代旧的 Expense 表）
 * - 只统计 type='expense' 的交易
 * - 按 categoryTagId 和日期范围过滤
 * - 如果预算关联账本，只统计该账本的支出
 */
export const getBudgetUsage = async (id: string) => {
  const budget = await prisma.budget.findUnique({
    where: { id },
    include: { accountBook: true },
  })

  if (!budget) {
    throw new Error('Budget not found')
  }

  // 计算该预算期间的实际支出（使用 Transaction 表替代 Expense 表）
  const where: Prisma.TransactionWhereInput = {
    type: 'expense',  // 只统计支出类型
    categoryTagId: budget.categoryTagId,
    date: {
      gte: budget.startDate,
    },
  }

  if (budget.accountBookId) {
    where.accountBookId = budget.accountBookId
  }

  const expenses = await prisma.transaction.aggregate({
    where,
    _sum: { amount: true },
  })

  const spent = expenses._sum.amount || 0
  const budgetAmount = Number(budget.amount)
  const remaining = budgetAmount - Number(spent)
  const percentage = budgetAmount > 0 ? (Number(spent) / budgetAmount) * 100 : 0

  return {
    budget,
    spent,
    remaining,
    percentage,
    isOverBudget: remaining < 0,
    warningThreshold: budget.warningThreshold,
    shouldWarn: percentage >= budget.warningThreshold,
  }
}

// 获取预算统计
export const getBudgetStats = async (filters?: {
  accountBookId?: string
  period?: string
}) => {
  const where: Prisma.BudgetWhereInput = {}

  if (filters) {
    if (filters.accountBookId) {
      where.accountBookId = filters.accountBookId
    }
    if (filters.period) {
      where.period = filters.period
    }
  }

  const [totalBudget, totalCount, byPeriod] = await Promise.all([
    // 总预算金额
    prisma.budget.aggregate({
      where,
      _sum: { amount: true },
    }),
    // 总笔数
    prisma.budget.count({ where }),
    // 按周期分组
    prisma.budget.groupBy({
      by: ['period'],
      where,
      _sum: { amount: true },
      _count: true,
    }),
  ])

  return {
    totalBudget: totalBudget._sum.amount || 0,
    totalCount,
    byPeriod: byPeriod.map(item => ({
      period: item.period,
      amount: item._sum.amount || 0,
      count: item._count,
    })),
  }
}
