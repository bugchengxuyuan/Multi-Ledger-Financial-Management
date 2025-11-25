import prisma from '../config/database'
import { Prisma } from '@prisma/client'

/**
 * 理财服务层 - 处理理财相关的业务逻辑
 */

// 获取所有理财（支持筛选）
export const getAllInvestments = async (filters?: {
  type?: string
  status?: string
  accountBookId?: string
}) => {
  const where: Prisma.InvestmentWhereInput = {}

  if (filters) {
    if (filters.type) {
      where.type = filters.type
    }
    if (filters.status) {
      where.status = filters.status
    }
    if (filters.accountBookId) {
      where.accountBookId = filters.accountBookId
    }
  }

  return await prisma.investment.findMany({
    where,
    include: {
      accountBook: true,
    },
    orderBy: {
      purchaseDate: 'desc',
    },
  })
}

// 获取单个理财
export const getInvestmentById = async (id: string) => {
  return await prisma.investment.findUnique({
    where: { id },
    include: {
      accountBook: true,
    },
  })
}

// 创建理财
export const createInvestment = async (data: Prisma.InvestmentCreateInput) => {
  return await prisma.investment.create({
    data,
    include: {
      accountBook: true,
    },
  })
}

// 更新理财
export const updateInvestment = async (id: string, data: Prisma.InvestmentUpdateInput) => {
  return await prisma.investment.update({
    where: { id },
    data,
    include: {
      accountBook: true,
    },
  })
}

// 删除理财
export const deleteInvestment = async (id: string) => {
  return await prisma.investment.delete({
    where: { id },
  })
}

// 获取理财统计
export const getInvestmentStats = async (filters?: {
  type?: string
  status?: string
  accountBookId?: string
}) => {
  const where: Prisma.InvestmentWhereInput = {}

  if (filters) {
    if (filters.type) {
      where.type = filters.type
    }
    if (filters.status) {
      where.status = filters.status
    }
    if (filters.accountBookId) {
      where.accountBookId = filters.accountBookId
    }
  }

  const [totalAmount, totalCount, byType, byStatus, byAccountBook] = await Promise.all([
    // 总金额
    prisma.investment.aggregate({
      where,
      _sum: { amount: true },
    }),
    // 总笔数
    prisma.investment.count({ where }),
    // 按类型分组
    prisma.investment.groupBy({
      by: ['type'],
      where,
      _sum: { amount: true },
      _count: true,
    }),
    // 按状态分组
    prisma.investment.groupBy({
      by: ['status'],
      where,
      _sum: { amount: true },
      _count: true,
    }),
    // 按账本分组（用于独立统计面板）
    prisma.investment.groupBy({
      by: ['accountBookId'],
      where,
      _sum: { amount: true },
      _count: true,
    }),
  ])

  // 获取账本详细信息
  const accountBookIds = byAccountBook
    .map(item => item.accountBookId)
    .filter((id): id is string => id !== null)

  const accountBooks = await prisma.accountBook.findMany({
    where: { id: { in: accountBookIds } },
  })

  const accountBookMap = new Map(accountBooks.map(book => [book.id, book]))

  return {
    totalAmount: totalAmount._sum.amount || 0,
    totalCount,
    byType: byType.map(item => ({
      type: item.type,
      amount: item._sum.amount || 0,
      count: item._count,
    })),
    byStatus: byStatus.map(item => ({
      status: item.status,
      amount: item._sum.amount || 0,
      count: item._count,
    })),
    byAccountBook: byAccountBook.map(item => ({
      accountBookId: item.accountBookId,
      accountBook: item.accountBookId ? accountBookMap.get(item.accountBookId) : null,
      amount: item._sum.amount || 0,
      count: item._count,
    })),
  }
}
