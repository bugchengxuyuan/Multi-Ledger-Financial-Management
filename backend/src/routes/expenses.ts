import express from 'express'
import * as expenseController from '../controllers/expenseController'

/**
 * 支出路由 - 定义支出相关的API端点
 */
const router = express.Router()

// GET /api/expenses - 获取所有支出（支持查询参数筛选）
router.get('/', expenseController.getAll)

// GET /api/expenses/stats - 获取支出统计数据
router.get('/stats', expenseController.getStats)

// GET /api/expenses/:id - 获取单个支出详情
router.get('/:id', expenseController.getOne)

// POST /api/expenses - 创建新支出
router.post('/', expenseController.create)

// PUT /api/expenses/:id - 更新支出
router.put('/:id', expenseController.update)

// DELETE /api/expenses/:id - 删除支出
router.delete('/:id', expenseController.remove)

export default router
