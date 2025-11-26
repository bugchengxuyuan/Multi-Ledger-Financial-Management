import express, { Express } from 'express'
import cors from 'cors'
import { env } from './config/env'
import { errorHandler, notFoundHandler } from './middleware/errorHandler'

// 创建 Express 应用
const app: Express = express()

// ===== 中间件配置 =====
// CORS 配置
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
}))

// 解析 JSON 请求体
app.use(express.json())

// 解析 URL 编码请求体
app.use(express.urlencoded({ extended: true }))

// ===== 健康检查路由 =====
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  })
})

// ===== V1 API 路由 =====
import v1Router from './routes/v1'

// V1 API（简化版本，基于业界最佳实践）
app.use('/api/v1', v1Router)

// 根路由
app.get('/', (req, res) => {
  res.json({
    message: 'Multi-Ledger Financial Management API',
    version: '1.0.0',
    apiVersion: 'v1',
    endpoints: {
      accountBooks: '/api/v1/account-books',
      transactions: '/api/v1/transactions',
      tags: '/api/v1/tags',
      statistics: '/api/v1/statistics',
    },
  })
})

// ===== 错误处理 =====
app.use(notFoundHandler)
app.use(errorHandler)

export default app
