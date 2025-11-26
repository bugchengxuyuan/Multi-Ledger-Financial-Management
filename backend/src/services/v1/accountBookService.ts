/**
 * V1 账本服务层
 * 参考: MoneyNote的AccountBook + Firefly III的Account
 *
 * 核心功能：
 * - 账本CRUD操作
 * - 默认账本管理（确保有且仅有一个）
 * - 删除保护（不能删除默认账本、不能删除唯一账本）
 */

import prisma from '../../config/database'
import { Prisma } from '@prisma/client'

export type AccountBookType = 'personal' | 'business' | 'partner'

export interface CreateAccountBookInput {
  name: string
  type?: AccountBookType
  openingBalance?: number
  color?: string
  icon?: string
  isDefault?: boolean
  description?: string
}

export interface UpdateAccountBookInput {
  name?: string
  type?: AccountBookType
  color?: string
  icon?: string
  description?: string
}

/**
 * 获取所有账本
 */
export const getAllAccountBooks = async () => {
  return await prisma.accountBook.findMany({
    include: {
      _count: {
        select: {
          transactions: true,
          tags: true,
        },
      },
    },
    orderBy: [
      { isDefault: 'desc' }, // 默认账本排在前面
      { createdAt: 'asc' },
    ],
  })
}

/**
 * 获取单个账本
 */
export const getAccountBookById = async (id: string) => {
  return await prisma.accountBook.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          transactions: true,
          tags: true,
        },
      },
    },
  })
}

/**
 * 获取默认账本（如果没有则返回第一个）
 */
export const getDefaultAccountBook = async () => {
  const defaultBook = await prisma.accountBook.findFirst({
    where: { isDefault: true },
    include: {
      _count: {
        select: {
          transactions: true,
          tags: true,
        },
      },
    },
  })

  if (defaultBook) {
    return defaultBook
  }

  // 如果没有默认账本，返回第一个
  return await prisma.accountBook.findFirst({
    orderBy: { createdAt: 'asc' },
    include: {
      _count: {
        select: {
          transactions: true,
          tags: true,
        },
      },
    },
  })
}

/**
 * 创建账本
 *
 * 业务规则：
 * 1. 如果设置为默认账本，先取消其他账本的默认状态
 * 2. 如果是第一个账本，自动设为默认
 */
export const createAccountBook = async (data: CreateAccountBookInput) => {
  return await prisma.$transaction(async (tx) => {
    // 检查是否是第一个账本
    const count = await tx.accountBook.count()
    const isFirstBook = count === 0

    // 如果设置为默认账本，先取消其他账本的默认状态
    if (data.isDefault || isFirstBook) {
      await tx.accountBook.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      })
    }

    return await tx.accountBook.create({
      data: {
        name: data.name,
        type: data.type || 'personal',
        openingBalance: data.openingBalance || 0,
        currentBalance: data.openingBalance || 0, // 初始时当前余额=期初余额
        color: data.color || '#1890ff',
        icon: data.icon || 'book',
        isDefault: data.isDefault || isFirstBook,
        description: data.description,
      },
      include: {
        _count: {
          select: {
            transactions: true,
            tags: true,
          },
        },
      },
    })
  })
}

/**
 * 更新账本
 */
export const updateAccountBook = async (id: string, data: UpdateAccountBookInput) => {
  return await prisma.accountBook.update({
    where: { id },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.type && { type: data.type }),
      ...(data.color && { color: data.color }),
      ...(data.icon && { icon: data.icon }),
      ...(data.description !== undefined && { description: data.description }),
    },
    include: {
      _count: {
        select: {
          transactions: true,
          tags: true,
        },
      },
    },
  })
}

/**
 * 删除账本
 *
 * 业务规则：
 * 1. 不能删除默认账本
 * 2. 不能删除唯一的账本
 * 3. 删除时级联删除所有交易、标签、余额日志
 */
export const deleteAccountBook = async (id: string) => {
  // 获取账本信息
  const accountBook = await prisma.accountBook.findUnique({
    where: { id },
  })

  if (!accountBook) {
    throw new Error('账本不存在')
  }

  if (accountBook.isDefault) {
    throw new Error('不能删除默认账本，请先设置其他账本为默认')
  }

  // 检查是否是唯一账本
  const count = await prisma.accountBook.count()
  if (count <= 1) {
    throw new Error('不能删除唯一的账本')
  }

  // 删除账本（级联删除关联数据）
  return await prisma.accountBook.delete({
    where: { id },
  })
}

/**
 * 设置默认账本
 *
 * 使用事务确保原子性：
 * 1. 取消所有账本的默认状态
 * 2. 设置指定账本为默认
 */
export const setDefaultAccountBook = async (id: string) => {
  const accountBook = await prisma.accountBook.findUnique({
    where: { id },
  })

  if (!accountBook) {
    throw new Error('账本不存在')
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

  // 返回所有账本的最新状态
  return await getAllAccountBooks()
}

/**
 * 获取账本统计
 */
export const getAccountBookStats = async (
  id: string,
  filters?: { startDate?: string; endDate?: string }
) => {
  const where: Prisma.TransactionWhereInput = {
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

  const [accountBook, totalIncome, totalExpense, transactionCount] = await Promise.all([
    prisma.accountBook.findUnique({
      where: { id },
    }),
    prisma.transaction.aggregate({
      where: { ...where, type: 'income' },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { ...where, type: 'expense' },
      _sum: { amount: true },
    }),
    prisma.transaction.count({ where }),
  ])

  if (!accountBook) {
    throw new Error('账本不存在')
  }

  return {
    accountBook,
    totalIncome: totalIncome._sum.amount || 0,
    totalExpense: totalExpense._sum.amount || 0,
    transactionCount,
  }
}
