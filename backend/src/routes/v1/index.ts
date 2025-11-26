/**
 * V1 API 路由
 *
 * 基于业界最佳实践的简化API设计
 * 参考: Firefly III、MoneyNote
 */

import { Router } from 'express'
import * as accountBookController from '../../controllers/v1/accountBookController'
import * as transactionController from '../../controllers/v1/transactionController'
import * as tagController from '../../controllers/v1/tagController'
import * as statisticsController from '../../controllers/v1/statisticsController'

const router = Router()

// ============================================================================
// 账本管理 API
// ============================================================================

// 获取所有账本
router.get('/account-books', accountBookController.getAllAccountBooks)

// 获取默认账本
router.get('/account-books/default', accountBookController.getDefaultAccountBook)

// 获取单个账本
router.get('/account-books/:id', accountBookController.getAccountBookById)

// 获取账本统计
router.get('/account-books/:id/stats', accountBookController.getAccountBookStats)

// 创建账本
router.post('/account-books', accountBookController.createAccountBook)

// 更新账本
router.put('/account-books/:id', accountBookController.updateAccountBook)

// 删除账本
router.delete('/account-books/:id', accountBookController.deleteAccountBook)

// 设置默认账本
router.put('/account-books/:id/set-default', accountBookController.setDefaultAccountBook)

// ============================================================================
// 交易管理 API
// ============================================================================

// 获取所有交易（支持筛选和分页）
router.get('/transactions', transactionController.getAllTransactions)

// 获取按日期分组的交易
router.get('/transactions/by-date-range', transactionController.getTransactionsByDateRange)

// 获取单个交易
router.get('/transactions/:id', transactionController.getTransactionById)

// 创建交易
router.post('/transactions', transactionController.createTransaction)

// 更新交易
router.put('/transactions/:id', transactionController.updateTransaction)

// 删除交易
router.delete('/transactions/:id', transactionController.deleteTransaction)

// ============================================================================
// 标签管理 API
// ============================================================================

// 获取所有标签
router.get('/tags', tagController.getAllTags)

// 获取账本可用的标签
router.get('/tags/available', tagController.getAvailableTags)

// 获取单个标签
router.get('/tags/:id', tagController.getTagById)

// 创建标签
router.post('/tags', tagController.createTag)

// 创建默认分类标签
router.post('/tags/defaults', tagController.createDefaultCategoryTags)

// 更新标签
router.put('/tags/:id', tagController.updateTag)

// 删除标签
router.delete('/tags/:id', tagController.deleteTag)

// ============================================================================
// 统计查询 API
// ============================================================================

// 获取月度统计
router.get('/statistics/monthly', statisticsController.getMonthlyStats)

// 获取分类统计
router.get('/statistics/category', statisticsController.getCategoryStats)

// 获取趋势数据
router.get('/statistics/trend', statisticsController.getTrendData)

// 获取交易统计
router.get('/statistics/transactions', statisticsController.getTransactionStats)

// 获取日历数据
router.get('/statistics/calendar', statisticsController.getCalendarData)

// 获取标签使用统计
router.get('/statistics/tag-usage', statisticsController.getTagUsageStats)

export default router
