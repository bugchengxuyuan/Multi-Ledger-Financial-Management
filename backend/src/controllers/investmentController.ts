import { Request, Response, NextFunction } from 'express'
import * as investmentService from '../services/investmentService'
import { successResponse } from '../utils/response'

/**
 * 理财控制器 - 处理HTTP请求和响应
 */

// 获取所有理财
export const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, status, accountBookId } = req.query

    const investments = await investmentService.getAllInvestments({
      type: type as string | undefined,
      status: status as string | undefined,
      accountBookId: accountBookId as string | undefined,
    })

    res.json(successResponse(investments, '获取理财列表成功'))
  } catch (error) {
    next(error)
  }
}

// 获取单个理财
export const getOne = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const investment = await investmentService.getInvestmentById(id)

    if (!investment) {
      return res.status(404).json(successResponse(null, '理财记录不存在'))
    }

    res.json(successResponse(investment, '获取理财详情成功'))
  } catch (error) {
    next(error)
  }
}

// 创建理财
export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, type, amount, status, note, purchaseDate, accountBookId } = req.body

    const investment = await investmentService.createInvestment({
      name,
      type,
      amount,
      status: status || 'holding',
      note,
      purchaseDate: new Date(purchaseDate),
      accountBook: accountBookId
        ? { connect: { id: accountBookId } }
        : undefined,
    })

    res.status(201).json(successResponse(investment, '创建理财成功'))
  } catch (error) {
    next(error)
  }
}

// 更新理财
export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const updateData: any = {}

    // 只更新提供的字段
    if (req.body.name !== undefined) updateData.name = req.body.name
    if (req.body.type !== undefined) updateData.type = req.body.type
    if (req.body.amount !== undefined) updateData.amount = req.body.amount
    if (req.body.status !== undefined) updateData.status = req.body.status
    if (req.body.note !== undefined) updateData.note = req.body.note
    if (req.body.purchaseDate !== undefined) updateData.purchaseDate = new Date(req.body.purchaseDate)

    // 支持更新accountBookId（可以连接、断开或更改）
    if (req.body.accountBookId !== undefined) {
      updateData.accountBook = req.body.accountBookId
        ? { connect: { id: req.body.accountBookId } }
        : { disconnect: true }
    }

    const investment = await investmentService.updateInvestment(id, updateData)

    res.json(successResponse(investment, '更新理财成功'))
  } catch (error) {
    next(error)
  }
}

// 删除理财
export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    await investmentService.deleteInvestment(id)

    res.json(successResponse(null, '删除理财成功'))
  } catch (error) {
    next(error)
  }
}

// 获取理财统计
export const getStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, status, accountBookId } = req.query

    const stats = await investmentService.getInvestmentStats({
      type: type as string | undefined,
      status: status as string | undefined,
      accountBookId: accountBookId as string | undefined,
    })

    res.json(successResponse(stats, '获取统计数据成功'))
  } catch (error) {
    next(error)
  }
}
