import prisma from '../config/database'
import { Prisma, Decimal } from '@prisma/client'

/**
 * 信用账户服务层 - 处理信用账户相关的业务逻辑
 */

// 获取所有信用账户（支持筛选）
export const getAllCreditAccounts = async (filters?: {
  accountBookId?: string
  status?: string
  type?: string
}) => {
  const where: Prisma.CreditAccountWhereInput = {}

  if (filters) {
    if (filters.accountBookId) {
      where.accountBookId = filters.accountBookId
    }
    if (filters.status) {
      where.status = filters.status
    }
    if (filters.type) {
      where.type = filters.type
    }
  }

  return await prisma.creditAccount.findMany({
    where,
    include: {
      accountBook: true,
      debtChangeLogs: {
        orderBy: {
          createdAt: 'desc',
        },
        take: 10, // 只返回最近10条记录
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })
}

// 获取单个信用账户
export const getCreditAccountById = async (id: string) => {
  return await prisma.creditAccount.findUnique({
    where: { id },
    include: {
      accountBook: true,
      debtChangeLogs: {
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  })
}

// 创建信用账户
export const createCreditAccount = async (data: Prisma.CreditAccountCreateInput) => {
  return await prisma.creditAccount.create({
    data,
    include: {
      accountBook: true,
      debtChangeLogs: true,
    },
  })
}

// 更新信用账户
export const updateCreditAccount = async (
  id: string,
  data: Prisma.CreditAccountUpdateInput
) => {
  // 如果更新了 currentDebt，创建变更日志
  const currentAccount = await prisma.creditAccount.findUnique({
    where: { id },
  })

  if (!currentAccount) {
    throw new Error('信用账户不存在')
  }

  // 使用事务确保数据一致性
  const updatedAccount = await prisma.$transaction(async (tx) => {
    const updated = await tx.creditAccount.update({
      where: { id },
      data,
      include: {
        accountBook: true,
        debtChangeLogs: true,
      },
    })

    // 如果 currentDebt 发生变化，创建变更日志
    if (
      data.currentDebt !== undefined &&
      data.currentDebt !== currentAccount.currentDebt
    ) {
      const newDebt =
        typeof data.currentDebt === 'object' && 'set' in data.currentDebt
          ? data.currentDebt.set
          : data.currentDebt

      const amountBefore = currentAccount.currentDebt
      const amountAfter = new Decimal(newDebt as string | number)
      const changeAmount = amountAfter.minus(amountBefore)

      await tx.debtChangeLog.create({
        data: {
          creditAccountId: id,
          changeType: 'manual_update',
          amountBefore,
          amountAfter,
          changeAmount,
          note: '手动更新债务金额',
        },
      })
    }

    return updated
  })

  return updatedAccount
}

// 删除信用账户
export const deleteCreditAccount = async (id: string) => {
  // Prisma 会自动级联删除关联的 debtChangeLogs（因为设置了 onDelete: Cascade）
  return await prisma.creditAccount.delete({
    where: { id },
  })
}

// 记录还款
export const recordRepayment = async (
  creditAccountId: string,
  amount: number | string,
  note?: string,
  relatedExpenseId?: string
) => {
  const account = await prisma.creditAccount.findUnique({
    where: { id: creditAccountId },
  })

  if (!account) {
    throw new Error('信用账户不存在')
  }

  const repaymentAmount = new Decimal(amount)
  const amountBefore = account.currentDebt
  const amountAfter = amountBefore.minus(repaymentAmount)

  // 检查还款金额是否有效
  if (repaymentAmount.lessThanOrEqualTo(0)) {
    throw new Error('还款金额必须大于0')
  }

  if (amountAfter.lessThan(0)) {
    throw new Error('还款金额不能大于当前欠款')
  }

  // 使用事务确保数据一致性
  return await prisma.$transaction(async (tx) => {
    // 更新信用账户的 currentDebt
    const updatedAccount = await tx.creditAccount.update({
      where: { id: creditAccountId },
      data: {
        currentDebt: amountAfter,
        updatedAt: new Date(),
      },
      include: {
        accountBook: true,
        debtChangeLogs: true,
      },
    })

    // 创建债务变更日志
    await tx.debtChangeLog.create({
      data: {
        creditAccountId,
        changeType: 'repayment',
        amountBefore,
        amountAfter,
        changeAmount: repaymentAmount.negated(), // 负数表示减少
        note: note || '还款',
        relatedExpenseId,
      },
    })

    return updatedAccount
  })
}

// 增加债务（用于记录新的借款或消费）
export const increaseDebt = async (
  creditAccountId: string,
  amount: number | string,
  note?: string
) => {
  const account = await prisma.creditAccount.findUnique({
    where: { id: creditAccountId },
  })

  if (!account) {
    throw new Error('信用账户不存在')
  }

  const increaseAmount = new Decimal(amount)
  const amountBefore = account.currentDebt
  const amountAfter = amountBefore.plus(increaseAmount)

  // 检查金额是否有效
  if (increaseAmount.lessThanOrEqualTo(0)) {
    throw new Error('增加金额必须大于0')
  }

  // 检查是否超过信用额度
  if (account.creditLimit) {
    if (amountAfter.greaterThan(account.creditLimit)) {
      throw new Error('债务金额不能超过信用额度')
    }
  }

  // 使用事务确保数据一致性
  return await prisma.$transaction(async (tx) => {
    // 更新信用账户的 currentDebt
    const updatedAccount = await tx.creditAccount.update({
      where: { id: creditAccountId },
      data: {
        currentDebt: amountAfter,
        updatedAt: new Date(),
      },
      include: {
        accountBook: true,
        debtChangeLogs: true,
      },
    })

    // 创建债务变更日志
    await tx.debtChangeLog.create({
      data: {
        creditAccountId,
        changeType: 'debt_increase',
        amountBefore,
        amountAfter,
        changeAmount: increaseAmount,
        note: note || '债务增加',
      },
    })

    return updatedAccount
  })
}

// 获取债务变更历史
export const getDebtChangeLogs = async (creditAccountId: string) => {
  return await prisma.debtChangeLog.findMany({
    where: { creditAccountId },
    orderBy: {
      createdAt: 'desc',
    },
  })
}
