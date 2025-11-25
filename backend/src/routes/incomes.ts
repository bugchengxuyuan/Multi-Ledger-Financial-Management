import express from 'express'
import * as incomeController from '../controllers/incomeController'

/**
 * 收入路由 - 定义收入相关的API端点
 */
const router = express.Router()

// GET /api/incomes - 获取所有收入（支持查询参数筛选）
router.get('/', incomeController.getAll)

// GET /api/incomes/stats - 获取收入统计数据
router.get('/stats', incomeController.getStats)

// GET /api/incomes/:id - 获取单个收入详情
router.get('/:id', incomeController.getOne)

// POST /api/incomes - 创建新收入
router.post('/', incomeController.create)

// PUT /api/incomes/:id - 更新收入
router.put('/:id', incomeController.update)

// DELETE /api/incomes/:id - 删除收入
router.delete('/:id', incomeController.remove)

export default router
