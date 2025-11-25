import { Request, Response, NextFunction } from 'express'
import * as budgetService from '../services/budgetService'
import { successResponse } from '../utils/response'

/**
 * 预算控制器 - 处理HTTP请求和响应
 */

// 获取所有预算
export const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accountBookId, category, period } = req.query

    const budgets = await budgetService.getAllBudgets({
      accountBookId: accountBookId as string | undefined,
      category: category as string | undefined,
      period: period as string | undefined,
    })

    res.json(successResponse(budgets, '获取预算列表成功'))
  } catch (error) {
    next(error)
  }
}

// 获取单个预算
export const getOne = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const budget = await budgetService.getBudgetById(id)

    if (!budget) {
      return res.status(404).json(successResponse(null, '预算不存在'))
    }

    res.json(successResponse(budget, '获取预算详情成功'))
  } catch (error) {
    next(error)
  }
}

// 创建预算
export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category, amount, period, startDate, accountBookId, warningThreshold } = req.body

    const budgetData: any = {
      category,
      amount,
      period,
      startDate: new Date(startDate),
      warningThreshold: warningThreshold || 80,
    }

    if (accountBookId) {
      budgetData.accountBook = {
        connect: { id: accountBookId },
      }
    }

    const budget = await budgetService.createBudget(budgetData)

    res.status(201).json(successResponse(budget, '创建预算成功'))
  } catch (error) {
    next(error)
  }
}

// 更新预算
export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const updateData: any = {}

    // 只更新提供的字段
    if (req.body.category !== undefined) updateData.category = req.body.category
    if (req.body.amount !== undefined) updateData.amount = req.body.amount
    if (req.body.period !== undefined) updateData.period = req.body.period
    if (req.body.startDate !== undefined) updateData.startDate = new Date(req.body.startDate)
    if (req.body.warningThreshold !== undefined) updateData.warningThreshold = req.body.warningThreshold
    if (req.body.accountBookId !== undefined) {
      if (req.body.accountBookId) {
        updateData.accountBook = { connect: { id: req.body.accountBookId } }
      } else {
        updateData.accountBook = { disconnect: true }
      }
    }

    const budget = await budgetService.updateBudget(id, updateData)

    res.json(successResponse(budget, '更新预算成功'))
  } catch (error) {
    next(error)
  }
}

// 删除预算
export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    await budgetService.deleteBudget(id)

    res.json(successResponse(null, '删除预算成功'))
  } catch (error) {
    next(error)
  }
}

// 获取预算使用情况
export const getUsage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const usage = await budgetService.getBudgetUsage(id)

    res.json(successResponse(usage, '获取预算使用情况成功'))
  } catch (error) {
    next(error)
  }
}

// 获取预算统计
export const getStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accountBookId, period } = req.query

    const stats = await budgetService.getBudgetStats({
      accountBookId: accountBookId as string | undefined,
      period: period as string | undefined,
    })

    res.json(successResponse(stats, '获取统计数据成功'))
  } catch (error) {
    next(error)
  }
}
