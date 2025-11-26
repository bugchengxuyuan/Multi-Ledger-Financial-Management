/**
 * V1 统计服务层
 * 参考: Firefly III的报表查询逻辑
 *
 * 核心功能：
 * - 月度统计（收入、支出、余额）
 * - 分类统计（用于饼图）
 * - 趋势数据（用于折线图）
 */

import prisma from '../../config/database'
import { Prisma } from '@prisma/client'

/**
 * 月度统计卡片
 */
export const getMonthlyStats = async (
  accountBookId: string,
  year: number,
  month: number
) => {
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0) // 月末

  const [accountBook, income, expense] = await Promise.all([
    prisma.accountBook.findUnique({
      where: { id: accountBookId },
      select: {
        id: true,
        name: true,
        currentBalance: true,
        openingBalance: true,
      },
    }),
    prisma.transaction.aggregate({
      where: {
        accountBookId,
        type: 'income',
        date: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.transaction.aggregate({
      where: {
        accountBookId,
        type: 'expense',
        date: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
      _count: true,
    }),
  ])

  if (!accountBook) {
    throw new Error('账本不存在')
  }

  return {
    accountBook,
    month: `${year}-${String(month).padStart(2, '0')}`,
    income: {
      amount: income._sum.amount || 0,
      count: income._count,
    },
    expense: {
      amount: expense._sum.amount || 0,
      count: expense._count,
    },
    balance: accountBook.currentBalance,
  }
}

/**
 * 分类统计（用于饼图）
 */
export const getCategoryStats = async (
  accountBookId: string,
  type: 'income' | 'expense',
  startDate?: string,
  endDate?: string
) => {
  const where: Prisma.TransactionWhereInput = {
    accountBookId,
    type,
  }

  if (startDate || endDate) {
    where.date = {}
    if (startDate) {
      where.date.gte = new Date(startDate)
    }
    if (endDate) {
      where.date.lte = new Date(endDate)
    }
  }

  // 按分类标签分组统计
  const stats = await prisma.transaction.groupBy({
    by: ['categoryTagId'],
    where,
    _sum: { amount: true },
    _count: true,
    orderBy: {
      _sum: { amount: 'desc' },
    },
  })

  // 获取标签详情
  const categoryTagIds = stats.map(s => s.categoryTagId)
  const tags = await prisma.tag.findMany({
    where: { id: { in: categoryTagIds } },
  })

  const tagMap = new Map(tags.map(t => [t.id, t]))

  // 计算总额
  const total = stats.reduce(
    (sum, s) => sum + Number(s._sum.amount || 0),
    0
  )

  return stats.map(s => {
    const tag = tagMap.get(s.categoryTagId)
    const amount = Number(s._sum.amount || 0)
    return {
      categoryTagId: s.categoryTagId,
      name: tag?.name || '未知',
      color: tag?.color || '#666666',
      icon: tag?.icon,
      amount,
      count: s._count,
      percentage: total > 0 ? (amount / total * 100).toFixed(2) : '0.00',
    }
  })
}

/**
 * 趋势数据（用于折线图）
 * 返回最近N个月的收入/支出趋势
 */
export const getTrendData = async (
  accountBookId: string,
  months: number = 6
) => {
  const now = new Date()
  const result = []

  for (let i = months - 1; i >= 0; i--) {
    const year = now.getFullYear()
    const month = now.getMonth() - i
    const startDate = new Date(year, month, 1)
    const endDate = new Date(year, month + 1, 0)

    const [income, expense] = await Promise.all([
      prisma.transaction.aggregate({
        where: {
          accountBookId,
          type: 'income',
          date: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          accountBookId,
          type: 'expense',
          date: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
      }),
    ])

    const monthStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`

    result.push({
      month: monthStr,
      income: Number(income._sum.amount || 0),
      expense: Number(expense._sum.amount || 0),
      net: Number(income._sum.amount || 0) - Number(expense._sum.amount || 0),
    })
  }

  return result
}

/**
 * 交易统计概览
 */
export const getTransactionStats = async (
  accountBookId: string,
  filters?: {
    type?: 'income' | 'expense'
    startDate?: string
    endDate?: string
  }
) => {
  const where: Prisma.TransactionWhereInput = {
    accountBookId,
  }

  if (filters) {
    if (filters.type) {
      where.type = filters.type
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

  const [total, count, byType] = await Promise.all([
    prisma.transaction.aggregate({
      where,
      _sum: { amount: true },
    }),
    prisma.transaction.count({ where }),
    prisma.transaction.groupBy({
      by: ['type'],
      where: { ...where, type: undefined },
      _sum: { amount: true },
      _count: true,
    }),
  ])

  return {
    totalAmount: total._sum.amount || 0,
    totalCount: count,
    byType: byType.map(item => ({
      type: item.type,
      amount: item._sum.amount || 0,
      count: item._count,
    })),
  }
}

/**
 * 获取日历视图数据
 * 返回指定月份每天的收支汇总
 */
export const getCalendarData = async (
  accountBookId: string,
  year: number,
  month: number
) => {
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0)

  const transactions = await prisma.transaction.findMany({
    where: {
      accountBookId,
      date: { gte: startDate, lte: endDate },
    },
    select: {
      date: true,
      type: true,
      amount: true,
    },
  })

  // 按日期分组汇总
  const dailyData: Record<string, { income: number; expense: number }> = {}

  for (const t of transactions) {
    const dateKey = t.date.toISOString().split('T')[0]
    if (!dailyData[dateKey]) {
      dailyData[dateKey] = { income: 0, expense: 0 }
    }
    if (t.type === 'income') {
      dailyData[dateKey].income += Number(t.amount)
    } else {
      dailyData[dateKey].expense += Number(t.amount)
    }
  }

  return {
    year,
    month,
    data: dailyData,
  }
}

/**
 * 获取标签使用统计
 */
export const getTagUsageStats = async (accountBookId: string) => {
  // 获取分类标签使用统计
  const categoryStats = await prisma.transaction.groupBy({
    by: ['categoryTagId'],
    where: { accountBookId },
    _count: true,
    _sum: { amount: true },
  })

  // 获取标签详情
  const tagIds = categoryStats.map(s => s.categoryTagId)
  const tags = await prisma.tag.findMany({
    where: { id: { in: tagIds } },
  })

  const tagMap = new Map(tags.map(t => [t.id, t]))

  return categoryStats.map(s => {
    const tag = tagMap.get(s.categoryTagId)
    return {
      tagId: s.categoryTagId,
      name: tag?.name || '未知',
      tagType: tag?.tagType || 'category',
      color: tag?.color,
      icon: tag?.icon,
      count: s._count,
      totalAmount: s._sum.amount || 0,
    }
  }).sort((a, b) => b.count - a.count)
}
