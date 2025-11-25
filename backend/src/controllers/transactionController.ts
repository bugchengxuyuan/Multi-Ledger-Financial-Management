import { Request, Response } from 'express'
import * as transactionService from '../services/transactionService'

/**
 * 统一交易控制器 - 处理所有交易相关的HTTP请求
 */

// 获取所有交易
export const getAllTransactions = async (req: Request, res: Response) => {
  try {
    const { type, accountBookId, categoryTagId, startDate, endDate, needsReimbursement } = req.query

    const filters = {
      type: type as transactionService.TransactionType | undefined,
      accountBookId: accountBookId as string | undefined,
      categoryTagId: categoryTagId as string | undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      needsReimbursement: needsReimbursement === 'true' ? true : needsReimbursement === 'false' ? false : undefined,
    }

    const transactions = await transactionService.getAllTransactions(filters)
    res.json({
      success: true,
      data: transactions,
    })
  } catch (error) {
    console.error('Failed to get transactions:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get transactions',
    })
  }
}

// 获取单个交易
export const getTransactionById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const transaction = await transactionService.getTransactionById(id)

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found',
      })
    }

    res.json({
      success: true,
      data: transaction,
    })
  } catch (error) {
    console.error('Failed to get transaction:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get transaction',
    })
  }
}

// 创建交易
export const createTransaction = async (req: Request, res: Response) => {
  try {
    const transactionData = req.body

    // 验证必填字段
    if (!transactionData.type || !transactionData.date || !transactionData.amount ||
        !transactionData.description || !transactionData.categoryTagId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      })
    }

    // 确保日期格式正确
    transactionData.date = new Date(transactionData.date)

    // 将金额转换为Decimal类型
    transactionData.amount = parseFloat(transactionData.amount)

    // 创建交易
    const transaction = await transactionService.createTransaction(transactionData)

    res.status(201).json({
      success: true,
      data: transaction,
    })
  } catch (error) {
    console.error('Failed to create transaction:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to create transaction',
    })
  }
}

// 更新交易
export const updateTransaction = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const updateData = req.body

    // 如果有日期字段，确保格式正确
    if (updateData.date) {
      updateData.date = new Date(updateData.date)
    }

    // 如果有金额字段，转换为Decimal
    if (updateData.amount) {
      updateData.amount = parseFloat(updateData.amount)
    }

    const transaction = await transactionService.updateTransaction(id, updateData)

    res.json({
      success: true,
      data: transaction,
    })
  } catch (error) {
    console.error('Failed to update transaction:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to update transaction',
    })
  }
}

// 删除交易
export const deleteTransaction = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    await transactionService.deleteTransaction(id)

    res.json({
      success: true,
      message: 'Transaction deleted successfully',
    })
  } catch (error) {
    console.error('Failed to delete transaction:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to delete transaction',
    })
  }
}

// 获取交易统计
export const getTransactionStats = async (req: Request, res: Response) => {
  try {
    const { type, accountBookId, startDate, endDate } = req.query

    const filters = {
      type: type as transactionService.TransactionType | undefined,
      accountBookId: accountBookId as string | undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
    }

    const stats = await transactionService.getTransactionStats(filters)

    res.json({
      success: true,
      data: stats,
    })
  } catch (error) {
    console.error('Failed to get transaction stats:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get transaction stats',
    })
  }
}

// 按日期范围获取分组交易
export const getTransactionsByDateRange = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, accountBookId } = req.query

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Start date and end date are required',
      })
    }

    const groupedTransactions = await transactionService.getTransactionsByDateRange(
      new Date(startDate as string),
      new Date(endDate as string),
      accountBookId as string | undefined
    )

    res.json({
      success: true,
      data: groupedTransactions,
    })
  } catch (error) {
    console.error('Failed to get transactions by date range:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get transactions by date range',
    })
  }
}

// 批量创建交易（用于数据迁移）
export const createManyTransactions = async (req: Request, res: Response) => {
  try {
    const { transactions } = req.body

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Transactions array is required',
      })
    }

    // 格式化所有交易数据
    const formattedTransactions = transactions.map(t => ({
      ...t,
      date: new Date(t.date),
      amount: parseFloat(t.amount),
    }))

    const result = await transactionService.createManyTransactions(formattedTransactions)

    res.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('Failed to create many transactions:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to create many transactions',
    })
  }
}