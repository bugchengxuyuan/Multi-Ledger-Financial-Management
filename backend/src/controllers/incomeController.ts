import { Request, Response, NextFunction } from 'express'
import * as incomeService from '../services/incomeService'
import { successResponse } from '../utils/response'

/**
 * 收入控制器 - 处理HTTP请求和响应
 */

// 获取所有收入
export const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accountBookId, categoryTagId, startDate, endDate } = req.query

    const incomes = await incomeService.getAllIncomes({
      accountBookId: accountBookId as string | undefined,
      categoryTagId: categoryTagId as string | undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
    })

    res.json(successResponse(incomes, '获取收入列表成功'))
  } catch (error) {
    next(error)
  }
}

// 获取单个收入
export const getOne = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const income = await incomeService.getIncomeById(id)

    if (!income) {
      return res.status(404).json(successResponse(null, '收入记录不存在'))
    }

    res.json(successResponse(income, '获取收入详情成功'))
  } catch (error) {
    next(error)
  }
}

// 创建收入
export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { date, categoryTagId, amount, description, accountBookId, note } = req.body

    const income = await incomeService.createIncome({
      date: new Date(date),
      amount,
      description,
      note,
      categoryTag: {
        connect: { id: categoryTagId },
      },
      accountBook: accountBookId
        ? {
            connect: { id: accountBookId },
          }
        : undefined,
    })

    res.status(201).json(successResponse(income, '创建收入成功'))
  } catch (error) {
    next(error)
  }
}

// 更新收入
export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const updateData: any = {}

    // 只更新提供的字段
    if (req.body.date !== undefined) updateData.date = new Date(req.body.date)
    if (req.body.amount !== undefined) updateData.amount = req.body.amount
    if (req.body.description !== undefined) updateData.description = req.body.description
    if (req.body.note !== undefined) updateData.note = req.body.note

    // 支持更新分类标签
    if (req.body.categoryTagId !== undefined) {
      updateData.categoryTag = {
        connect: { id: req.body.categoryTagId },
      }
    }

    // 支持更新账本（可以连接、断开或更改）
    if (req.body.accountBookId !== undefined) {
      updateData.accountBook = req.body.accountBookId
        ? {
            connect: { id: req.body.accountBookId },
          }
        : { disconnect: true }
    }

    const income = await incomeService.updateIncome(id, updateData)

    res.json(successResponse(income, '更新收入成功'))
  } catch (error) {
    next(error)
  }
}

// 删除收入
export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    await incomeService.deleteIncome(id)

    res.json(successResponse(null, '删除收入成功'))
  } catch (error) {
    next(error)
  }
}

// 获取收入统计
export const getStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accountBookId, startDate, endDate } = req.query

    const stats = await incomeService.getIncomeStats({
      accountBookId: accountBookId as string | undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
    })

    res.json(successResponse(stats, '获取收入统计成功'))
  } catch (error) {
    next(error)
  }
}
