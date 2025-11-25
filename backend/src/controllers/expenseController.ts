import { Request, Response, NextFunction } from 'express'
import * as expenseService from '../services/expenseService'
import { successResponse } from '../utils/response'

/**
 * 支出控制器 - 处理HTTP请求和响应
 */

// 获取所有支出
export const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accountBookId, categoryTagId, startDate, endDate } = req.query

    const expenses = await expenseService.getAllExpenses({
      accountBookId: accountBookId as string | undefined,
      categoryTagId: categoryTagId as string | undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
    })

    res.json(successResponse(expenses, '获取支出列表成功'))
  } catch (error) {
    next(error)
  }
}

// 获取单个支出
export const getOne = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const expense = await expenseService.getExpenseById(id)

    if (!expense) {
      return res.status(404).json(successResponse(null, '支出记录不存在'))
    }

    res.json(successResponse(expense, '获取支出详情成功'))
  } catch (error) {
    next(error)
  }
}

// 创建支出
export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      date,
      categoryTagId,
      amount,
      description,
      needsReimbursement,
      labelTagIds,
      accountBookId,
      note,
      receiptPhoto,
      location,
    } = req.body

    const expense = await expenseService.createExpense({
      date: new Date(date),
      categoryTag: { connect: { id: categoryTagId } },
      amount,
      description,
      needsReimbursement: needsReimbursement || false,
      labelTagIds: labelTagIds || [],
      accountBook: accountBookId ? { connect: { id: accountBookId } } : undefined,
      note,
      receiptPhoto,
      location,
    })

    res.status(201).json(successResponse(expense, '创建支出成功'))
  } catch (error) {
    next(error)
  }
}

// 更新支出
export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const updateData: any = {}

    // 只更新提供的字段
    if (req.body.date !== undefined) updateData.date = new Date(req.body.date)
    if (req.body.categoryTagId !== undefined) updateData.categoryTag = { connect: { id: req.body.categoryTagId } }
    if (req.body.amount !== undefined) updateData.amount = req.body.amount
    if (req.body.description !== undefined) updateData.description = req.body.description
    if (req.body.needsReimbursement !== undefined) updateData.needsReimbursement = req.body.needsReimbursement
    if (req.body.labelTagIds !== undefined) updateData.labelTagIds = req.body.labelTagIds
    if (req.body.accountBookId !== undefined) {
      updateData.accountBook = req.body.accountBookId ? { connect: { id: req.body.accountBookId } } : { disconnect: true }
    }
    if (req.body.note !== undefined) updateData.note = req.body.note
    if (req.body.receiptPhoto !== undefined) updateData.receiptPhoto = req.body.receiptPhoto
    if (req.body.location !== undefined) updateData.location = req.body.location

    const expense = await expenseService.updateExpense(id, updateData)

    res.json(successResponse(expense, '更新支出成功'))
  } catch (error) {
    next(error)
  }
}

// 删除支出
export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    await expenseService.deleteExpense(id)

    res.json(successResponse(null, '删除支出成功'))
  } catch (error) {
    next(error)
  }
}

// 获取支出统计
export const getStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accountBookId, startDate, endDate } = req.query

    const stats = await expenseService.getExpenseStats({
      accountBookId: accountBookId as string | undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
    })

    res.json(successResponse(stats, '获取统计数据成功'))
  } catch (error) {
    next(error)
  }
}
