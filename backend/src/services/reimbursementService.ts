import prisma from '../config/database'
import { Prisma } from '@prisma/client'

/**
 * 报销服务层 - 处理报销相关的业务逻辑
 */

// 获取所有报销（支持筛选）
export const getAllReimbursements = async (filters?: {
  status?: string
  startDate?: string
  endDate?: string
}) => {
  const where: Prisma.ReimbursementWhereInput = {}

  if (filters) {
    if (filters.status) {
      where.status = filters.status
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

  return await prisma.reimbursement.findMany({
    where,
    include: {
      expense: {
        include: {
          accountBook: true,
        },
      },
    },
    orderBy: {
      date: 'desc',
    },
  })
}

// 获取单个报销
export const getReimbursementById = async (id: string) => {
  return await prisma.reimbursement.findUnique({
    where: { id },
    include: {
      expense: {
        include: {
          accountBook: true,
        },
      },
    },
  })
}

// 创建报销
export const createReimbursement = async (data: Prisma.ReimbursementCreateInput) => {
  return await prisma.reimbursement.create({
    data,
    include: {
      expense: {
        include: {
          accountBook: true,
        },
      },
    },
  })
}

// 更新报销
export const updateReimbursement = async (id: string, data: Prisma.ReimbursementUpdateInput) => {
  return await prisma.reimbursement.update({
    where: { id },
    data,
    include: {
      expense: {
        include: {
          accountBook: true,
        },
      },
    },
  })
}

// 删除报销
export const deleteReimbursement = async (id: string) => {
  return await prisma.reimbursement.delete({
    where: { id },
  })
}

// 更新报销状态
export const updateReimbursementStatus = async (
  id: string,
  status: string,
  reimbursedDate?: Date
) => {
  const data: Prisma.ReimbursementUpdateInput = {
    status,
  }

  if (status === 'completed' && reimbursedDate) {
    data.reimbursedDate = reimbursedDate
  }

  return await prisma.reimbursement.update({
    where: { id },
    data,
    include: {
      expense: {
        include: {
          accountBook: true,
        },
      },
    },
  })
}

// 获取报销统计
export const getReimbursementStats = async (filters?: {
  startDate?: string
  endDate?: string
}) => {
  const where: Prisma.ReimbursementWhereInput = {}

  if (filters?.startDate || filters?.endDate) {
    where.date = {}
    if (filters.startDate) {
      where.date.gte = new Date(filters.startDate)
    }
    if (filters.endDate) {
      where.date.lte = new Date(filters.endDate)
    }
  }

  const [totalAmount, totalCount, byStatus] = await Promise.all([
    // 总金额
    prisma.reimbursement.aggregate({
      where,
      _sum: { amount: true },
    }),
    // 总笔数
    prisma.reimbursement.count({ where }),
    // 按状态分组
    prisma.reimbursement.groupBy({
      by: ['status'],
      where,
      _sum: { amount: true },
      _count: true,
    }),
  ])

  return {
    totalAmount: totalAmount._sum.amount || 0,
    totalCount,
    byStatus: byStatus.map(item => ({
      status: item.status,
      amount: item._sum.amount || 0,
      count: item._count,
    })),
  }
}
