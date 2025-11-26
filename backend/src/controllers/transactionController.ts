import { Request, Response } from 'express'
import * as transactionService from '../services/transactionService'

/**
 * 统一交易控制器 - 处理所有交易相关的HTTP请求
 *
 * API 端点概览：
 * - GET    /api/transactions           - 获取交易列表（支持分页和筛选）
 * - GET    /api/transactions/:id       - 获取单个交易详情
 * - POST   /api/transactions           - 创建新交易
 * - PUT    /api/transactions/:id       - 更新交易
 * - DELETE /api/transactions/:id       - 删除交易
 * - GET    /api/transactions/stats     - 获取交易统计
 * - GET    /api/transactions/by-date   - 按日期范围获取交易
 * - POST   /api/transactions/batch     - 批量创建交易
 */

/**
 * @api {get} /api/transactions 获取交易列表
 * @apiName GetTransactions
 * @apiGroup Transaction
 *
 * @apiQuery {String} [accountBookId] 账本ID，不传则返回所有账本交易，传 'global' 只返回全局交易
 * @apiQuery {String} [type] 交易类型：income | expense | investment
 * @apiQuery {String} [categoryTagId] 分类标签ID
 * @apiQuery {String} [startDate] 开始日期 YYYY-MM-DD
 * @apiQuery {String} [endDate] 结束日期 YYYY-MM-DD
 * @apiQuery {Boolean} [needsReimbursement] 是否需要报销
 * @apiQuery {Number} [page=1] 页码（从1开始）
 * @apiQuery {Number} [pageSize=50] 每页数量（最大100）
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object[]} data.data 交易列表
 * @apiSuccess {Object} data.pagination 分页信息
 *
 * @apiSuccessExample Success-Response:
 *   HTTP/1.1 200 OK
 *   {
 *     "success": true,
 *     "data": {
 *       "data": [...],
 *       "pagination": {
 *         "page": 1,
 *         "pageSize": 50,
 *         "total": 150,
 *         "totalPages": 3
 *       }
 *     }
 *   }
 */
export const getAllTransactions = async (req: Request, res: Response) => {
  try {
    const { type, accountBookId, categoryTagId, startDate, endDate, needsReimbursement, page, pageSize } = req.query

    const filters = {
      type: type as transactionService.TransactionType | undefined,
      accountBookId: accountBookId as string | undefined,
      categoryTagId: categoryTagId as string | undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      needsReimbursement: needsReimbursement === 'true' ? true : needsReimbursement === 'false' ? false : undefined,
      page: page ? parseInt(page as string, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string, 10) : undefined,
    }

    const result = await transactionService.getAllTransactions(filters)
    res.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('Failed to get transactions:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get transactions',
    })
  }
}

/**
 * @api {get} /api/transactions/:id 获取单个交易详情
 * @apiName GetTransactionById
 * @apiGroup Transaction
 *
 * @apiParam {String} id 交易ID
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 交易详情（包含账本、分类标签、报销信息）
 *
 * @apiError (404) NotFound 交易不存在
 */
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

/**
 * @api {post} /api/transactions 创建新交易
 * @apiName CreateTransaction
 * @apiGroup Transaction
 *
 * @apiBody {String} type 交易类型：income | expense | investment
 * @apiBody {String} date 交易日期（YYYY-MM-DD 格式）
 * @apiBody {Number} amount 交易金额（正数）
 * @apiBody {String} description 交易描述
 * @apiBody {String} categoryTagId 分类标签ID
 * @apiBody {String} [accountBookId] 账本ID（可选，不传则为全局交易）
 * @apiBody {String} [subType] 子类型（投资类型时：buy | sell）
 * @apiBody {String[]} [labelTagIds] 普通标签ID数组（仅支出类型）
 * @apiBody {Boolean} [needsReimbursement=false] 是否需要报销
 * @apiBody {String} [note] 备注
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 创建的交易详情
 *
 * @apiError (400) BadRequest 缺少必填字段或字段格式错误
 * @apiError (400) TagNotAvailable 标签不适用于该交易类型或账本
 */
export const createTransaction = async (req: Request, res: Response) => {
  try {
    const transactionData = req.body

    // 验证必填字段
    if (!transactionData.type || !transactionData.date || !transactionData.amount ||
        !transactionData.description || !transactionData.categoryTagId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type, date, amount, description, categoryTagId',
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
  } catch (error: any) {
    console.error('Failed to create transaction:', error)
    // 返回更具体的错误信息
    const errorMessage = error.message || 'Failed to create transaction'
    const statusCode = errorMessage.includes('标签') ? 400 : 500
    res.status(statusCode).json({
      success: false,
      error: errorMessage,
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