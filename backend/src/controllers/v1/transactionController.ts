/**
 * V1 交易控制器
 */

import { Request, Response, NextFunction } from 'express'
import * as transactionService from '../../services/v1/transactionService'

/**
 * 获取所有交易
 */
export const getAllTransactions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      accountBookId,
      type,
      categoryTagId,
      startDate,
      endDate,
      page,
      pageSize,
    } = req.query

    const result = await transactionService.getAllTransactions({
      accountBookId: accountBookId as string,
      type: type as 'income' | 'expense',
      categoryTagId: categoryTagId as string,
      startDate: startDate as string,
      endDate: endDate as string,
      page: page ? parseInt(page as string) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string) : undefined,
    })

    res.json(result)
  } catch (error) {
    next(error)
  }
}

/**
 * 获取单个交易
 */
export const getTransactionById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params
    const transaction = await transactionService.getTransactionById(id)

    if (!transaction) {
      return res.status(404).json({ error: '交易记录不存在' })
    }

    res.json(transaction)
  } catch (error) {
    next(error)
  }
}

/**
 * 创建交易
 */
export const createTransaction = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const transaction = await transactionService.createTransaction(req.body)
    res.status(201).json(transaction)
  } catch (error) {
    next(error)
  }
}

/**
 * 更新交易
 */
export const updateTransaction = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params
    const transaction = await transactionService.updateTransaction(id, req.body)
    res.json(transaction)
  } catch (error) {
    next(error)
  }
}

/**
 * 删除交易
 */
export const deleteTransaction = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params
    await transactionService.deleteTransaction(id)
    res.status(204).send()
  } catch (error) {
    next(error)
  }
}

/**
 * 获取按日期分组的交易
 */
export const getTransactionsByDateRange = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { accountBookId, startDate, endDate } = req.query

    if (!accountBookId || !startDate || !endDate) {
      return res.status(400).json({
        error: '缺少必填参数：accountBookId, startDate, endDate',
      })
    }

    const transactions = await transactionService.getTransactionsByDateRange(
      accountBookId as string,
      new Date(startDate as string),
      new Date(endDate as string)
    )

    res.json(transactions)
  } catch (error) {
    next(error)
  }
}
