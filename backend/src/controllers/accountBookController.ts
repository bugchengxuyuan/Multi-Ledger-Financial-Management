import { Request, Response, NextFunction } from 'express'
import * as accountBookService from '../services/accountBookService'
import { successResponse } from '../utils/response'

/**
 * 账本控制器 - 处理HTTP请求和响应
 */

// 获取所有账本
export const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accountBooks = await accountBookService.getAllAccountBooks()
    res.json(successResponse(accountBooks, '获取账本列表成功'))
  } catch (error) {
    next(error)
  }
}

// 获取单个账本
export const getOne = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const accountBook = await accountBookService.getAccountBookById(id)

    if (!accountBook) {
      return res.status(404).json(successResponse(null, '账本不存在'))
    }

    res.json(successResponse(accountBook, '获取账本详情成功'))
  } catch (error) {
    next(error)
  }
}

// 创建账本
export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, icon, color, isDefault } = req.body

    const accountBook = await accountBookService.createAccountBook({
      name,
      description,
      icon,
      color,
      isDefault: isDefault || false,
    })

    res.status(201).json(successResponse(accountBook, '创建账本成功'))
  } catch (error) {
    next(error)
  }
}

// 更新账本
export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const updateData: any = {}

    // 只更新提供的字段
    if (req.body.name !== undefined) updateData.name = req.body.name
    if (req.body.description !== undefined) updateData.description = req.body.description
    if (req.body.icon !== undefined) updateData.icon = req.body.icon
    if (req.body.color !== undefined) updateData.color = req.body.color
    if (req.body.isDefault !== undefined) updateData.isDefault = req.body.isDefault

    const accountBook = await accountBookService.updateAccountBook(id, updateData)

    res.json(successResponse(accountBook, '更新账本成功'))
  } catch (error) {
    next(error)
  }
}

// 删除账本
export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    await accountBookService.deleteAccountBook(id)

    res.json(successResponse(null, '删除账本成功'))
  } catch (error) {
    next(error)
  }
}

// 设置默认账本
export const setDefault = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const accountBook = await accountBookService.setDefaultAccountBook(id)

    res.json(successResponse(accountBook, '设置默认账本成功'))
  } catch (error) {
    next(error)
  }
}

// 获取默认账本
export const getDefault = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accountBook = await accountBookService.getDefaultAccountBook()

    if (!accountBook) {
      return res.status(404).json(successResponse(null, '没有默认账本'))
    }

    res.json(successResponse(accountBook, '获取默认账本成功'))
  } catch (error) {
    next(error)
  }
}

// 获取账本统计信息
export const getStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const { startDate, endDate } = req.query

    const stats = await accountBookService.getAccountBookStats(id, {
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
    })

    res.json(successResponse(stats, '获取账本统计成功'))
  } catch (error) {
    next(error)
  }
}
