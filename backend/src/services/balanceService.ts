import prisma from '../config/database'
import { Decimal } from '@prisma/client/runtime/library'
import { Prisma } from '@prisma/client'

/**
 * 余额服务层 - 处理账本余额相关的业务逻辑
 *
 * 集中管理所有余额相关操作：
 * - 交易创建时的余额更新
 * - 交易删除时的余额恢复
 * - 手动余额调整
 * - 初始余额设置
 * - 余额日志记录
 */

// 交易类型
export type TransactionType = 'income' | 'expense' | 'investment'

/**
 * 计算交易对余额的影响
 * @param type 交易类型
 * @param subType 交易子类型（主要用于投资）
 * @param amount 交易金额
 * @param currentBalance 当前余额
 * @returns 新余额
 */
export const calculateBalanceChange = (
  type: TransactionType,
  subType: string | null,
  amount: Decimal,
  currentBalance: Decimal
): Decimal => {
  switch (type) {
    case 'income':
      return currentBalance.add(amount)
    case 'expense':
      return currentBalance.sub(amount)
    case 'investment':
      // 投资买入减少余额，卖出增加余额
      if (subType === 'buy') {
        return currentBalance.sub(amount)
      } else if (subType === 'sell') {
        return currentBalance.add(amount)
      }
      return currentBalance
    default:
      return currentBalance
  }
}

/**
 * 处理交易创建时的余额更新
 * @param tx Prisma事务客户端
 * @param transaction 交易数据
 * @returns 余额变动记录
 */
export const updateBalanceOnTransactionCreate = async (
  tx: Prisma.TransactionClient,
  transaction: {
    id: string
    type: string
    subType: string | null
    amount: Decimal
    description: string
    accountBookId: string | null
  }
) => {
  if (!transaction.accountBookId) {
    return null
  }

  const accountBook = await tx.accountBook.findUnique({
    where: { id: transaction.accountBookId },
  })

  if (!accountBook) {
    return null
  }

  const amountBefore = accountBook.currentBalance
  const amountAfter = calculateBalanceChange(
    transaction.type as TransactionType,
    transaction.subType,
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
      changeAmount: transaction.type === 'income' ||
                    (transaction.type === 'investment' && transaction.subType === 'sell')
                    ? transaction.amount
                    : transaction.amount.negated(),
      note: `${transaction.type === 'income' ? '收入' :
             transaction.type === 'expense' ? '支出' : '投资'}：${transaction.description}`,
      relatedTransactionId: transaction.id,
    },
  })

  return balanceLog
}

/**
 * 处理交易删除时的余额恢复
 * @param tx Prisma事务客户端
 * @param transaction 交易数据
 * @returns 余额变动记录
 */
export const updateBalanceOnTransactionDelete = async (
  tx: Prisma.TransactionClient,
  transaction: {
    id: string
    type: string
    subType: string | null
    amount: Decimal
    description: string
    accountBookId: string | null
  }
) => {
  if (!transaction.accountBookId) {
    return null
  }

  const accountBook = await tx.accountBook.findUnique({
    where: { id: transaction.accountBookId },
  })

  if (!accountBook) {
    return null
  }

  const amountBefore = accountBook.currentBalance
  let amountAfter = amountBefore

  // 根据交易类型恢复余额（与创建时相反）
  switch (transaction.type) {
    case 'income':
      amountAfter = amountBefore.sub(transaction.amount)
      break
    case 'expense':
      amountAfter = amountBefore.add(transaction.amount)
      break
    case 'investment':
      if (transaction.subType === 'buy') {
        amountAfter = amountBefore.add(transaction.amount)
      } else if (transaction.subType === 'sell') {
        amountAfter = amountBefore.sub(transaction.amount)
      }
      break
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
      changeAmount: transaction.type === 'income' ||
                    (transaction.type === 'investment' && transaction.subType === 'sell')
                    ? transaction.amount.negated()
                    : transaction.amount,
      note: `删除交易：${transaction.description}`,
      relatedTransactionId: transaction.id,
    },
  })

  return balanceLog
}

/**
 * 处理交易更新时的余额调整
 * @param tx Prisma事务客户端
 * @param oldTransaction 原交易数据
 * @param newTransaction 新交易数据
 * @returns 余额变动记录
 */
export const updateBalanceOnTransactionUpdate = async (
  tx: Prisma.TransactionClient,
  oldTransaction: {
    id: string
    type: string
    subType: string | null
    amount: Decimal
    description: string
    accountBookId: string | null
  },
  newTransaction: {
    id: string
    type: string
    subType: string | null
    amount: Decimal
    description: string
    accountBookId: string | null
  }
) => {
  // 如果账本没有变化且金额/类型没有变化，不需要更新余额
  if (
    oldTransaction.accountBookId === newTransaction.accountBookId &&
    oldTransaction.amount.equals(newTransaction.amount) &&
    oldTransaction.type === newTransaction.type &&
    oldTransaction.subType === newTransaction.subType
  ) {
    return null
  }

  // 先恢复旧的交易对余额的影响
  if (oldTransaction.accountBookId) {
    await updateBalanceOnTransactionDelete(tx, oldTransaction)
  }

  // 再应用新的交易对余额的影响
  if (newTransaction.accountBookId) {
    return await updateBalanceOnTransactionCreate(tx, newTransaction)
  }

  return null
}

// 获取账本余额详情
export const getAccountBookBalance = async (accountBookId: string) => {
  const accountBook = await prisma.accountBook.findUnique({
    where: { id: accountBookId },
    select: {
      id: true,
      name: true,
      icon: true,
      initialBalance: true,
      currentBalance: true,
      balanceMode: true,
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

// 手动调整账本余额
export const adjustAccountBookBalance = async (
  accountBookId: string,
  newBalance: number,
  note?: string
) => {
  return await prisma.$transaction(async (tx) => {
    const accountBook = await tx.accountBook.findUnique({
      where: { id: accountBookId },
    })

    if (!accountBook) {
      throw new Error('账本不存在')
    }

    // 检查余额模式
    if (accountBook.balanceMode === 'auto') {
      throw new Error('自动模式下不允许手动调整余额')
    }

    const amountBefore = accountBook.currentBalance
    const amountAfter = new Decimal(newBalance)
    const changeAmount = amountAfter.sub(amountBefore)

    // 更新账本余额
    await tx.accountBook.update({
      where: { id: accountBookId },
      data: { currentBalance: amountAfter },
    })

    // 记录余额变动日志
    await tx.balanceLog.create({
      data: {
        accountBookId,
        changeType: 'manual_adjust',
        amountBefore,
        amountAfter,
        changeAmount,
        note: note || '手动调整余额',
      },
    })

    return {
      accountBookId,
      amountBefore: Number(amountBefore),
      amountAfter: Number(amountAfter),
      changeAmount: Number(changeAmount),
    }
  })
}

// 设置初始余额
export const setInitialBalance = async (accountBookId: string, initialBalance: number) => {
  return await prisma.$transaction(async (tx) => {
    const accountBook = await tx.accountBook.findUnique({
      where: { id: accountBookId },
    })

    if (!accountBook) {
      throw new Error('账本不存在')
    }

    const newInitialBalance = new Decimal(initialBalance)
    const currentBalance = accountBook.currentBalance
    const initialBefore = accountBook.initialBalance

    // 更新初始余额和当前余额
    // 逻辑：新当前余额 = 新初始余额 + (旧当前余额 - 旧初始余额)
    const diff = currentBalance.sub(initialBefore)
    const newCurrentBalance = newInitialBalance.add(diff)

    await tx.accountBook.update({
      where: { id: accountBookId },
      data: {
        initialBalance: newInitialBalance,
        currentBalance: newCurrentBalance,
      },
    })

    // 记录余额变动日志
    await tx.balanceLog.create({
      data: {
        accountBookId,
        changeType: 'initial',
        amountBefore: currentBalance,
        amountAfter: newCurrentBalance,
        changeAmount: newCurrentBalance.sub(currentBalance),
        note: `设置初始余额为 ¥${initialBalance}`,
      },
    })

    return {
      accountBookId,
      initialBalance: Number(newInitialBalance),
      currentBalance: Number(newCurrentBalance),
    }
  })
}

// 获取余额变动历史
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
  const where: any = { accountBookId }

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

// 获取余额统计
export const getBalanceStats = async (accountBookId: string) => {
  const [accountBook, totalIncome, totalExpense, logCount] = await Promise.all([
    prisma.accountBook.findUnique({
      where: { id: accountBookId },
    }),
    prisma.balanceLog.aggregate({
      where: {
        accountBookId,
        changeType: 'income',
      },
      _sum: { changeAmount: true },
    }),
    prisma.balanceLog.aggregate({
      where: {
        accountBookId,
        changeType: 'expense',
      },
      _sum: { changeAmount: true },
    }),
    prisma.balanceLog.count({
      where: { accountBookId },
    }),
  ])

  if (!accountBook) {
    throw new Error('账本不存在')
  }

  return {
    accountBookId,
    accountBookName: accountBook.name,
    initialBalance: accountBook.initialBalance,
    currentBalance: accountBook.currentBalance,
    totalIncome: totalIncome._sum.changeAmount || 0,
    totalExpense: Math.abs(Number(totalExpense._sum.changeAmount || 0)),
    logCount,
  }
}
