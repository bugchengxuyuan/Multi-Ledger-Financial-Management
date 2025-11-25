import { Request, Response, NextFunction } from 'express'
import * as configService from '../services/configService'
import { successResponse } from '../utils/response'

/**
 * 配置控制器 - 处理HTTP请求和响应
 */

// 获取配置
export const get = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const config = await configService.getConfig()
    res.json(successResponse(config, '获取配置成功'))
  } catch (error) {
    next(error)
  }
}

// 更新配置
export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updateData: any = {}

    // 只更新提供的字段
    if (req.body.jiebeiTotal !== undefined) updateData.jiebeiTotal = req.body.jiebeiTotal
    if (req.body.salary !== undefined) updateData.salary = req.body.salary
    if (req.body.salaryDate !== undefined) updateData.salaryDate = req.body.salaryDate
    if (req.body.jiebeiDueDate !== undefined) updateData.jiebeiDueDate = req.body.jiebeiDueDate
    if (req.body.investmentCapital !== undefined) updateData.investmentCapital = req.body.investmentCapital
    if (req.body.currentAccountBookId !== undefined) updateData.currentAccountBookId = req.body.currentAccountBookId

    const config = await configService.updateConfig(updateData)

    res.json(successResponse(config, '更新配置成功'))
  } catch (error) {
    next(error)
  }
}

// 初始化配置
export const initialize = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { jiebeiTotal, salary, salaryDate, jiebeiDueDate, investmentCapital } = req.body

    const config = await configService.initializeConfig({
      jiebeiTotal,
      salary,
      salaryDate,
      jiebeiDueDate,
      investmentCapital,
    })

    res.json(successResponse(config, '初始化配置成功'))
  } catch (error) {
    next(error)
  }
}

// 设置当前账本
export const setCurrentAccountBook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accountBookId } = req.body

    const config = await configService.setCurrentAccountBook(accountBookId)

    res.json(successResponse(config, '设置当前账本成功'))
  } catch (error) {
    next(error)
  }
}

// 获取当前账本
export const getCurrentAccountBook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accountBook = await configService.getCurrentAccountBook()

    if (!accountBook) {
      return res.json(successResponse(null, '未设置当前账本'))
    }

    res.json(successResponse(accountBook, '获取当前账本成功'))
  } catch (error) {
    next(error)
  }
}
