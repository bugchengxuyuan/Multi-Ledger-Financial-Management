import express from 'express'
import * as creditAccountController from '../controllers/creditAccountController'

/**
 * 信用账户路由 - 定义信用账户相关的API端点
 */
const router = express.Router()

// GET /api/credit-accounts - 获取所有信用账户（支持查询参数筛选）
router.get('/', creditAccountController.getAll)

// GET /api/credit-accounts/:id - 获取单个信用账户详情
router.get('/:id', creditAccountController.getOne)

// POST /api/credit-accounts - 创建新信用账户
router.post('/', creditAccountController.create)

// PUT /api/credit-accounts/:id - 更新信用账户
router.put('/:id', creditAccountController.update)

// DELETE /api/credit-accounts/:id - 删除信用账户
router.delete('/:id', creditAccountController.remove)

// POST /api/credit-accounts/:id/repayment - 记录还款
router.post('/:id/repayment', creditAccountController.recordRepayment)

// POST /api/credit-accounts/:id/increase-debt - 增加债务
router.post('/:id/increase-debt', creditAccountController.increaseDebt)

// GET /api/credit-accounts/:id/debt-logs - 获取债务变更历史
router.get('/:id/debt-logs', creditAccountController.getDebtChangeLogs)

export default router
