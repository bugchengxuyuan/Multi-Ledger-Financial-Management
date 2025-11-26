/**
 * V1 余额服务层
 * 参考: Firefly III的余额更新机制
 *
 * 核心功能：
 * - 交易创建时的余额更新
 * - 交易编辑时的余额调整
 * - 交易删除时的余额恢复
 * - 余额重新计算（修复数据用）
 *
 * 余额计算公式：
 * 当前余额 = 期初余额 + 所有收入 - 所有支出
 */

import prisma from '../../config/database'
import { Prisma } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

export type TransactionType = 'income' | 'expense'

/**
 * 计算交易对余额的影响
 *
 * 余额变动规则：
 * - income（收入）：增加余额（+amount）
 * - expense（支出）：减少余额（-amount）
 */
export const calculateBalanceChange = (
  type: TransactionType,
  amount: Decimal,
  currentBalance: Decimal
): Decimal => {
  if (type === 'income') {
    return currentBalance.add(amount)
  } else {
    return currentBalance.sub(amount)
  }
}

/**
 * 创建交易后更新余额
 */
export const updateBalanceOnTransactionCreate = async (
  tx: Prisma.TransactionClient,
  transaction: {
    id: string
    type: string
    amount: Decimal
    description: string | null
    accountBookId: string
  }
) => {
  const accountBook = await tx.accountBook.findUnique({
    where: { id: transaction.accountBookId },
  })

  if (!accountBook) {
    throw new Error('账本不存在')
  }

  const amountBefore = accountBook.currentBalance
  const amountAfter = calculateBalanceChange(
    transaction.type as TransactionType,
    transaction.amount,
    amountBefore
  )

  // 更新账本余额
  await tx.accountBook.update({
    where: { id: transaction.accountBookId },
    data: { currentBalance: amountAfter },
  })

  // 创建余额变动日志
  const balanceLog = await tx.balanceLog.create({
    data: {
      accountBookId: transaction.accountBookId,
      changeType: transaction.type,
      amountBefore,
      amountAfter,
      changeAmount: transaction.type === 'income'
        ? transaction.amount
        : transaction.amount.negated(),
      note: `${transaction.type === 'income' ? '收入' : '支出'}：${transaction.description || ''}`,
      transactionId: transaction.id,
    },
  })

  return balanceLog
}

/**
 * 删除交易后恢复余额
 */
export const updateBalanceOnTransactionDelete = async (
  tx: Prisma.TransactionClient,
  transaction: {
    id: string
    type: string
    amount: Decimal
    description: string | null
    accountBookId: string
  }
) => {
  const accountBook = await tx.accountBook.findUnique({
    where: { id: transaction.accountBookId },
  })

  if (!accountBook) {
    return null
  }

  const amountBefore = accountBook.currentBalance
  let amountAfter: Decimal

  // 恢复余额（与创建时相反）
  if (transaction.type === 'income') {
    amountAfter = amountBefore.sub(transaction.amount)
  } else {
    amountAfter = amountBefore.add(transaction.amount)
  }

  // 更新账本余额
  await tx.accountBook.update({
    where: { id: transaction.accountBookId },
    data: { currentBalance: amountAfter },
  })

  // 创建余额变动日志
  const balanceLog = await tx.balanceLog.create({
    data: {
      accountBookId: transaction.accountBookId,
      changeType: 'manual_adjust',
      amountBefore,
      amountAfter,
      changeAmount: transaction.type === 'income'
        ? transaction.amount.negated()
        : transaction.amount,
      note: `删除交易：${transaction.description || ''}`,
      transactionId: transaction.id,
    },
  })

  return balanceLog
}

/**
 * 更新交易后调整余额
 */
export const updateBalanceOnTransactionUpdate = async (
  tx: Prisma.TransactionClient,
  oldTransaction: {
    id: string
    type: string
    amount: Decimal
    description: string | null
    accountBookId: string
  },
  newTransaction: {
    id: string
    type: string
    amount: Decimal
    description: string | null
    accountBookId: string
  }
) => {
  // 如果金额和类型都没变，不需要更新余额
  if (
    oldTransaction.amount.equals(newTransaction.amount) &&
    oldTransaction.type === newTransaction.type &&
    oldTransaction.accountBookId === newTransaction.accountBookId
  ) {
    return null
  }

  // 先恢复旧交易的影响
  await updateBalanceOnTransactionDelete(tx, oldTransaction)

  // 再应用新交易的影响
  return await updateBalanceOnTransactionCreate(tx, newTransaction)
}

/**
 * 重新计算账本余额（修复数据用）
 * 参考: Firefly III的余额修复功能
 */
export const recalculateBalance = async (accountBookId: string) => {
  return await prisma.$transaction(async (tx) => {
    const accountBook = await tx.accountBook.findUnique({
      where: { id: accountBookId },
    })

    if (!accountBook) {
      throw new Error('账本不存在')
    }

    // 从期初余额开始重新计算
    let balance = accountBook.openingBalance

    // 获取所有交易，按日期排序
    const transactions = await tx.transaction.findMany({
      where: { accountBookId },
      orderBy: { date: 'asc' },
    })

    // 累计计算余额
    for (const t of transactions) {
      if (t.type === 'income') {
        balance = balance.add(t.amount)
      } else {
        balance = balance.sub(t.amount)
      }
    }

    // 更新账本余额
    await tx.accountBook.update({
      where: { id: accountBookId },
      data: { currentBalance: balance },
    })

    // 创建余额变动日志
    await tx.balanceLog.create({
      data: {
        accountBookId,
        changeType: 'manual_adjust',
        amountBefore: accountBook.currentBalance,
        amountAfter: balance,
        changeAmount: balance.sub(accountBook.currentBalance),
        note: '重新计算余额',
      },
    })

    return {
      accountBookId,
      openingBalance: Number(accountBook.openingBalance),
      previousBalance: Number(accountBook.currentBalance),
      newBalance: Number(balance),
      transactionCount: transactions.length,
    }
  })
}

/**
 * 获取账本余额详情
 */
export const getAccountBookBalance = async (accountBookId: string) => {
  const accountBook = await prisma.accountBook.findUnique({
    where: { id: accountBookId },
    select: {
      id: true,
      name: true,
      icon: true,
      openingBalance: true,
      currentBalance: true,
    },
  })

  if (!accountBook) {
    throw new Error('账本不存在')
  }

  // 获取最近的余额变动记录
  const recentLogs = await prisma.balanceLog.findMany({
    where: { accountBookId },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  return {
    accountBook,
    recentLogs,
  }
}

/**
 * 获取余额变动历史
 */
export const getBalanceLogs = async (
  accountBookId: string,
  filters?: {
    startDate?: string
    endDate?: string
    changeType?: string
    limit?: number
    offset?: number
  }
) => {
  const where: Prisma.BalanceLogWhereInput = { accountBookId }

  if (filters) {
    if (filters.startDate || filters.endDate) {
      where.createdAt = {}
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate)
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(filters.endDate)
      }
    }
    if (filters.changeType) {
      where.changeType = filters.changeType
    }
  }

  const [logs, total] = await Promise.all([
    prisma.balanceLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 50,
      skip: filters?.offset || 0,
    }),
    prisma.balanceLog.count({ where }),
  ])

  return {
    logs,
    total,
    limit: filters?.limit || 50,
    offset: filters?.offset || 0,
  }
}
