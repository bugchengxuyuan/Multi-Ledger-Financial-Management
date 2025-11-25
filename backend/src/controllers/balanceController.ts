import { Request, Response, NextFunction } from 'express'
import * as balanceService from '../services/balanceService'
import { successResponse } from '../utils/response'

/**
 * 余额控制器 - 处理账本余额相关的HTTP请求
 */

// 获取账本余额详情
export const getBalance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accountBookId } = req.params
    const result = await balanceService.getAccountBookBalance(accountBookId)

    res.json(successResponse(result, '获取余额详情成功'))
  } catch (error) {
    next(error)
  }
}

// 手动调整余额
export const adjustBalance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accountBookId } = req.params
    const { newBalance, note } = req.body

    const result = await balanceService.adjustAccountBookBalance(accountBookId, newBalance, note)

    res.json(successResponse(result, '调整余额成功'))
  } catch (error) {
    next(error)
  }
}

// 设置初始余额
export const setInitialBalance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accountBookId } = req.params
    const { initialBalance } = req.body

    const result = await balanceService.setInitialBalance(accountBookId, initialBalance)

    res.json(successResponse(result, '设置初始余额成功'))
  } catch (error) {
    next(error)
  }
}

// 获取余额变动历史
export const getBalanceLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accountBookId } = req.params
    const { startDate, endDate, changeType, limit, offset } = req.query

    const result = await balanceService.getBalanceLogs(accountBookId, {
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      changeType: changeType as string | undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    })

    res.json(successResponse(result, '获取余额历史成功'))
  } catch (error) {
    next(error)
  }
}

// 获取余额统计
export const getBalanceStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accountBookId } = req.params
    const result = await balanceService.getBalanceStats(accountBookId)

    res.json(successResponse(result, '获取余额统计成功'))
  } catch (error) {
    next(error)
  }
}
