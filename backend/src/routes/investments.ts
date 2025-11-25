import express from 'express'
import * as investmentController from '../controllers/investmentController'

/**
 * 理财路由 - 定义理财相关的API端点
 */
const router = express.Router()

// GET /api/investments - 获取所有理财（支持查询参数筛选）
router.get('/', investmentController.getAll)

// GET /api/investments/stats - 获取理财统计数据
router.get('/stats', investmentController.getStats)

// GET /api/investments/:id - 获取单个理财详情
router.get('/:id', investmentController.getOne)

// POST /api/investments - 创建新理财
router.post('/', investmentController.create)

// PUT /api/investments/:id - 更新理财
router.put('/:id', investmentController.update)

// DELETE /api/investments/:id - 删除理财
router.delete('/:id', investmentController.remove)

export default router
