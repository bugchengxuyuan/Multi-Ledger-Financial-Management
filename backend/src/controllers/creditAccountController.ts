import { Request, Response, NextFunction } from 'express'
import * as creditAccountService from '../services/creditAccountService'
import { successResponse } from '../utils/response'

/**
 * 信用账户控制器 - 处理HTTP请求和响应
 */

// 获取所有信用账户
export const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accountBookId, status, type } = req.query

    const creditAccounts = await creditAccountService.getAllCreditAccounts({
      accountBookId: accountBookId as string | undefined,
      status: status as string | undefined,
      type: type as string | undefined,
    })

    res.json(successResponse(creditAccounts, '获取信用账户列表成功'))
  } catch (error) {
    next(error)
  }
}

// 获取单个信用账户
export const getOne = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const creditAccount = await creditAccountService.getCreditAccountById(id)

    if (!creditAccount) {
      return res.status(404).json(successResponse(null, '信用账户不存在'))
    }

    res.json(successResponse(creditAccount, '获取信用账户详情成功'))
  } catch (error) {
    next(error)
  }
}

// 创建信用账户
export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      name,
      provider,
      type,
      currentDebt,
      creditLimit,
      repaymentDay,
      monthlyRepayment,
      status,
      accountBookId,
      note,
    } = req.body

    // 验证必填字段
    if (!name || !provider || !type || !repaymentDay || !accountBookId) {
      return res.status(400).json(
        successResponse(null, '缺少必填字段: name, provider, type, repaymentDay, accountBookId')
      )
    }

    // 验证还款日
    if (repaymentDay < 1 || repaymentDay > 31) {
      return res.status(400).json(successResponse(null, '还款日必须在1-31之间'))
    }

    const creditAccount = await creditAccountService.createCreditAccount({
      name,
      provider,
      type,
      currentDebt: currentDebt || 0,
      creditLimit,
      repaymentDay,
      monthlyRepayment,
      status: status || 'active',
      note,
      accountBook: {
        connect: { id: accountBookId },
      },
    })

    res.status(201).json(successResponse(creditAccount, '创建信用账户成功'))
  } catch (error) {
    next(error)
  }
}

// 更新信用账户
export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const updateData: any = {}

    // 只更新提供的字段
    if (req.body.name !== undefined) updateData.name = req.body.name
    if (req.body.provider !== undefined) updateData.provider = req.body.provider
    if (req.body.type !== undefined) updateData.type = req.body.type
    if (req.body.currentDebt !== undefined) updateData.currentDebt = req.body.currentDebt
    if (req.body.creditLimit !== undefined) updateData.creditLimit = req.body.creditLimit
    if (req.body.repaymentDay !== undefined) {
      const day = req.body.repaymentDay
      if (day < 1 || day > 31) {
        return res.status(400).json(successResponse(null, '还款日必须在1-31之间'))
      }
      updateData.repaymentDay = day
    }
    if (req.body.monthlyRepayment !== undefined) updateData.monthlyRepayment = req.body.monthlyRepayment
    if (req.body.status !== undefined) updateData.status = req.body.status
    if (req.body.accountBookId !== undefined) {
      updateData.accountBook = {
        connect: { id: req.body.accountBookId },
      }
    }
    if (req.body.note !== undefined) updateData.note = req.body.note

    const creditAccount = await creditAccountService.updateCreditAccount(id, updateData)

    res.json(successResponse(creditAccount, '更新信用账户成功'))
  } catch (error) {
    next(error)
  }
}

// 删除信用账户
export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    await creditAccountService.deleteCreditAccount(id)

    res.json(successResponse(null, '删除信用账户成功'))
  } catch (error) {
    next(error)
  }
}

// 记录还款
export const recordRepayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const { amount, note, relatedExpenseId } = req.body

    if (!amount || amount <= 0) {
      return res.status(400).json(successResponse(null, '还款金额必须大于0'))
    }

    const creditAccount = await creditAccountService.recordRepayment(
      id,
      amount,
      note,
      relatedExpenseId
    )

    res.json(successResponse(creditAccount, '还款记录成功'))
  } catch (error) {
    next(error)
  }
}

// 增加债务
export const increaseDebt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const { amount, note } = req.body

    if (!amount || amount <= 0) {
      return res.status(400).json(successResponse(null, '增加金额必须大于0'))
    }

    const creditAccount = await creditAccountService.increaseDebt(id, amount, note)

    res.json(successResponse(creditAccount, '债务增加成功'))
  } catch (error) {
    next(error)
  }
}

// 获取债务变更历史
export const getDebtChangeLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const logs = await creditAccountService.getDebtChangeLogs(id)

    res.json(successResponse(logs, '获取债务变更历史成功'))
  } catch (error) {
    next(error)
  }
}
