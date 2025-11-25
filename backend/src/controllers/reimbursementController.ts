import { Request, Response, NextFunction } from 'express'
import * as reimbursementService from '../services/reimbursementService'
import { successResponse } from '../utils/response'

/**
 * 报销控制器 - 处理HTTP请求和响应
 */

// 获取所有报销
export const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, startDate, endDate } = req.query

    const reimbursements = await reimbursementService.getAllReimbursements({
      status: status as string | undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
    })

    res.json(successResponse(reimbursements, '获取报销列表成功'))
  } catch (error) {
    next(error)
  }
}

// 获取单个报销
export const getOne = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const reimbursement = await reimbursementService.getReimbursementById(id)

    if (!reimbursement) {
      return res.status(404).json(successResponse(null, '报销记录不存在'))
    }

    res.json(successResponse(reimbursement, '获取报销详情成功'))
  } catch (error) {
    next(error)
  }
}

// 创建报销
export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { date, item, amount, note, status, expenseId, reimbursedDate } = req.body

    const reimbursementData: any = {
      date: new Date(date),
      item,
      amount,
      note,
      status: status || 'pending',
    }

    // 如果提供了expenseId，需要关联支出
    if (expenseId) {
      reimbursementData.expense = {
        connect: { id: expenseId },
      }
    }

    // 如果已完成且提供了报销日期
    if (status === 'completed' && reimbursedDate) {
      reimbursementData.reimbursedDate = new Date(reimbursedDate)
    }

    const reimbursement = await reimbursementService.createReimbursement(reimbursementData)

    res.status(201).json(successResponse(reimbursement, '创建报销成功'))
  } catch (error) {
    next(error)
  }
}

// 更新报销
export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const updateData: any = {}

    // 只更新提供的字段
    if (req.body.date !== undefined) updateData.date = new Date(req.body.date)
    if (req.body.item !== undefined) updateData.item = req.body.item
    if (req.body.amount !== undefined) updateData.amount = req.body.amount
    if (req.body.note !== undefined) updateData.note = req.body.note
    if (req.body.status !== undefined) updateData.status = req.body.status
    if (req.body.reimbursedDate !== undefined) {
      updateData.reimbursedDate = req.body.reimbursedDate ? new Date(req.body.reimbursedDate) : null
    }
    if (req.body.expenseId !== undefined) {
      if (req.body.expenseId) {
        updateData.expense = { connect: { id: req.body.expenseId } }
      } else {
        updateData.expense = { disconnect: true }
      }
    }

    const reimbursement = await reimbursementService.updateReimbursement(id, updateData)

    res.json(successResponse(reimbursement, '更新报销成功'))
  } catch (error) {
    next(error)
  }
}

// 删除报销
export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    await reimbursementService.deleteReimbursement(id)

    res.json(successResponse(null, '删除报销成功'))
  } catch (error) {
    next(error)
  }
}

// 更新报销状态
export const updateStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const { status, reimbursedDate } = req.body

    const reimbursement = await reimbursementService.updateReimbursementStatus(
      id,
      status,
      reimbursedDate ? new Date(reimbursedDate) : undefined
    )

    res.json(successResponse(reimbursement, '更新报销状态成功'))
  } catch (error) {
    next(error)
  }
}

// 获取报销统计
export const getStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query

    const stats = await reimbursementService.getReimbursementStats({
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
    })

    res.json(successResponse(stats, '获取统计数据成功'))
  } catch (error) {
    next(error)
  }
}
