/**
 * V1 账本控制器
 */

import { Request, Response, NextFunction } from 'express'
import * as accountBookService from '../../services/v1/accountBookService'

/**
 * 获取所有账本
 */
export const getAllAccountBooks = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const accountBooks = await accountBookService.getAllAccountBooks()
    res.json(accountBooks)
  } catch (error) {
    next(error)
  }
}

/**
 * 获取单个账本
 */
export const getAccountBookById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params
    const accountBook = await accountBookService.getAccountBookById(id)

    if (!accountBook) {
      return res.status(404).json({ error: '账本不存在' })
    }

    res.json(accountBook)
  } catch (error) {
    next(error)
  }
}

/**
 * 获取默认账本
 */
export const getDefaultAccountBook = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const accountBook = await accountBookService.getDefaultAccountBook()

    if (!accountBook) {
      return res.status(404).json({ error: '没有任何账本' })
    }

    res.json(accountBook)
  } catch (error) {
    next(error)
  }
}

/**
 * 创建账本
 */
export const createAccountBook = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const accountBook = await accountBookService.createAccountBook(req.body)
    res.status(201).json(accountBook)
  } catch (error) {
    next(error)
  }
}

/**
 * 更新账本
 */
export const updateAccountBook = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params
    const accountBook = await accountBookService.updateAccountBook(id, req.body)
    res.json(accountBook)
  } catch (error) {
    next(error)
  }
}

/**
 * 删除账本
 */
export const deleteAccountBook = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params
    await accountBookService.deleteAccountBook(id)
    res.status(204).send()
  } catch (error) {
    next(error)
  }
}

/**
 * 设置默认账本
 */
export const setDefaultAccountBook = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params
    const accountBooks = await accountBookService.setDefaultAccountBook(id)
    res.json(accountBooks)
  } catch (error) {
    next(error)
  }
}

/**
 * 获取账本统计
 */
export const getAccountBookStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params
    const { startDate, endDate } = req.query
    const stats = await accountBookService.getAccountBookStats(id, {
      startDate: startDate as string,
      endDate: endDate as string,
    })
    res.json(stats)
  } catch (error) {
    next(error)
  }
}
