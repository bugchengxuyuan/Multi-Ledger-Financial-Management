import express from 'express'
import * as accountBookController from '../controllers/accountBookController'
import balanceRouter from './balance'

/**
 * 账本路由 - 定义账本相关的API端点
 */
const router = express.Router()

// GET /api/account-books - 获取所有账本
router.get('/', accountBookController.getAll)

// GET /api/account-books/default - 获取默认账本
router.get('/default', accountBookController.getDefault)

// GET /api/account-books/:id - 获取单个账本详情
router.get('/:id', accountBookController.getOne)

// GET /api/account-books/:id/stats - 获取账本统计信息
router.get('/:id/stats', accountBookController.getStats)

// POST /api/account-books - 创建新账本
router.post('/', accountBookController.create)

// PUT /api/account-books/:id - 更新账本
router.put('/:id', accountBookController.update)

// PUT /api/account-books/:id/set-default - 设置为默认账本
router.put('/:id/set-default', accountBookController.setDefault)

// DELETE /api/account-books/:id - 删除账本
router.delete('/:id', accountBookController.remove)

// 余额管理子路由 - /api/account-books/:accountBookId/balance/*
router.use('/:accountBookId/balance', balanceRouter)

export default router
