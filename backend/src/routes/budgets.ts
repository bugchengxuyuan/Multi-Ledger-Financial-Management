import express from 'express'
import * as budgetController from '../controllers/budgetController'

/**
 * 预算路由 - 定义预算相关的API端点
 */
const router = express.Router()

// GET /api/budgets - 获取所有预算（支持查询参数筛选）
router.get('/', budgetController.getAll)

// GET /api/budgets/stats - 获取预算统计数据
router.get('/stats', budgetController.getStats)

// GET /api/budgets/:id - 获取单个预算详情
router.get('/:id', budgetController.getOne)

// GET /api/budgets/:id/usage - 获取预算使用情况
router.get('/:id/usage', budgetController.getUsage)

// POST /api/budgets - 创建新预算
router.post('/', budgetController.create)

// PUT /api/budgets/:id - 更新预算
router.put('/:id', budgetController.update)

// DELETE /api/budgets/:id - 删除预算
router.delete('/:id', budgetController.remove)

export default router
