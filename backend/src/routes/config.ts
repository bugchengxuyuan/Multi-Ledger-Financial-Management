import express from 'express'
import * as configController from '../controllers/configController'

/**
 * 配置路由 - 定义配置相关的API端点
 */
const router = express.Router()

// GET /api/config - 获取配置
router.get('/', configController.get)

// GET /api/config/current-account-book - 获取当前账本
router.get('/current-account-book', configController.getCurrentAccountBook)

// PUT /api/config - 更新配置
router.put('/', configController.update)

// POST /api/config/initialize - 初始化配置
router.post('/initialize', configController.initialize)

// PUT /api/config/current-account-book - 设置当前账本
router.put('/current-account-book', configController.setCurrentAccountBook)

export default router
