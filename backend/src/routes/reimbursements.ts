import express from 'express'
import * as reimbursementController from '../controllers/reimbursementController'

/**
 * 报销路由 - 定义报销相关的API端点
 */
const router = express.Router()

// GET /api/reimbursements - 获取所有报销（支持查询参数筛选）
router.get('/', reimbursementController.getAll)

// GET /api/reimbursements/stats - 获取报销统计数据
router.get('/stats', reimbursementController.getStats)

// GET /api/reimbursements/:id - 获取单个报销详情
router.get('/:id', reimbursementController.getOne)

// POST /api/reimbursements - 创建新报销
router.post('/', reimbursementController.create)

// PUT /api/reimbursements/:id - 更新报销
router.put('/:id', reimbursementController.update)

// PUT /api/reimbursements/:id/status - 更新报销状态
router.put('/:id/status', reimbursementController.updateStatus)

// DELETE /api/reimbursements/:id - 删除报销
router.delete('/:id', reimbursementController.remove)

export default router
