import { Router } from 'express'
import * as transactionController from '../controllers/transactionController'

/**
 * 统一交易路由 - 处理所有交易相关的路由
 */

const router = Router()

// 交易相关路由
router.get('/', transactionController.getAllTransactions)                    // 获取所有交易（支持筛选）
router.get('/stats', transactionController.getTransactionStats)             // 获取交易统计
router.get('/grouped', transactionController.getTransactionsByDateRange)    // 按日期分组获取交易
router.get('/:id', transactionController.getTransactionById)                // 获取单个交易
router.post('/', transactionController.createTransaction)                   // 创建交易
router.post('/bulk', transactionController.createManyTransactions)          // 批量创建交易（数据迁移用）
router.put('/:id', transactionController.updateTransaction)                 // 更新交易
router.delete('/:id', transactionController.deleteTransaction)              // 删除交易

export default router