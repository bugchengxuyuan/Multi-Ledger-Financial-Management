import express from 'express'
import * as balanceController from '../controllers/balanceController'

/**
 * 余额路由 - 定义账本余额相关的API端点
 */
const router = express.Router({ mergeParams: true })

// GET /api/account-books/:accountBookId/balance - 获取账本余额详情
router.get('/', balanceController.getBalance)

// PUT /api/account-books/:accountBookId/balance/adjust - 手动调整余额
router.put('/adjust', balanceController.adjustBalance)

// POST /api/account-books/:accountBookId/balance/init - 设置初始余额
router.post('/init', balanceController.setInitialBalance)

// GET /api/account-books/:accountBookId/balance/logs - 获取余额变动历史
router.get('/logs', balanceController.getBalanceLogs)

// GET /api/account-books/:accountBookId/balance/stats - 获取余额统计
router.get('/stats', balanceController.getBalanceStats)

export default router
