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

// ===== API 路由 =====
import transactionsRouter from './routes/transactions'  // 新增：统一交易路由
import expensesRouter from './routes/expenses'
import incomesRouter from './routes/incomes'
import accountBooksRouter from './routes/accountBooks'
import reimbursementsRouter from './routes/reimbursements'
import investmentsRouter from './routes/investments'
import budgetsRouter from './routes/budgets'
import configRouter from './routes/config'
import creditAccountsRouter from './routes/creditAccounts'
import tagsRouter from './routes/tags'

app.use('/api/transactions', transactionsRouter)  // 新增：统一交易API
app.use('/api/expenses', expensesRouter)          // 保留用于兼容
app.use('/api/incomes', incomesRouter)            // 保留用于兼容
app.use('/api/account-books', accountBooksRouter)
app.use('/api/reimbursements', reimbursementsRouter)
app.use('/api/investments', investmentsRouter)    // 保留用于兼容
app.use('/api/budgets', budgetsRouter)
app.use('/api/config', configRouter)
app.use('/api/credit-accounts', creditAccountsRouter)
app.use('/api/tags', tagsRouter)

// 根路由
app.get('/', (req, res) => {
  res.json({
    message: 'Jiebei Finance Management API',
    version: '1.0.0',
    docs: '/api/docs', // 未来可添加 API 文档
  })
})

// ===== 错误处理 =====
app.use(notFoundHandler)
app.use(errorHandler)

export default app
