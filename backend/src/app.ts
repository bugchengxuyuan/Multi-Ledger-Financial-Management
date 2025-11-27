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
// Legacy route support (向后兼容旧的前端 API 调用)
app.use('/api', v1Router)

// 配置端点 (临时简单实现)
app.get('/api/config', (req, res) => {
  res.json({
    id: 'main',
    creditLimit: 0,
    salary: 0,
    salaryDate: '每月1日',
    creditDueDate: '每月15日',
    investmentCapital: 0,
    currentAccountBookId: null,
  })
})

app.put('/api/config', (req, res) => {
  // 临时实现：直接返回请求的配置
  res.json(req.body)
})

app.get('/api/config/current-account-book', (req, res) => {
  res.json(null)
})

app.put('/api/config/current-account-book', (req, res) => {
  res.json({ currentAccountBookId: req.body.accountBookId })
})

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
