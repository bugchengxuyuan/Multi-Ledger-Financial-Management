# 后端实施指南 - Jiebei Finance Backend

## 📊 当前进度总结

### ✅ 已完成（第一阶段）

#### 1. **项目初始化**
- ✅ 创建后端项目目录：`/Users/jianguo/Downloads/jiebei-backend`
- ✅ 初始化 Node.js 项目（package.json）
- ✅ 配置 TypeScript（tsconfig.json）
- ✅ 创建项目目录结构

#### 2. **依赖安装**
- ✅ 生产依赖：express, cors, dotenv, @prisma/client, date-fns
- ✅ 开发依赖：typescript, ts-node-dev, @types/*, prisma

#### 3. **Prisma 配置**
- ✅ 创建 Prisma Schema（9个数据表模型）
  - Expense（支出）
  - Reimbursement（报销）
  - Investment（投资）
  - AccountBook（账本）
  - Budget（预算）
  - Tag（标签）
  - ExpenseTemplate（支出模板）
  - RecurringExpense（循环支出）
  - Config（配置）

#### 4. **基础服务器代码**
- ✅ 环境变量配置（src/config/env.ts）
- ✅ 统一响应格式（src/utils/response.ts）
- ✅ 错误处理中间件（src/middleware/errorHandler.ts）
- ✅ Express 应用配置（src/app.ts）
- ✅ 服务器启动文件（src/server.ts）

#### 5. **服务器测试**
- ✅ 后端服务器成功启动在 `http://localhost:4000`
- ✅ 健康检查端点正常工作：`GET /health`
- ✅ CORS 配置正确（允许前端 localhost:3001 访问）

---

## ⏳ 待完成任务

### 🔴 紧急：PostgreSQL 数据库配置

PostgreSQL 尚未安装。请按以下步骤操作：

#### macOS 安装 PostgreSQL

\`\`\`bash
# 使用 Homebrew 安装
brew install postgresql@16

# 启动 PostgreSQL 服务
brew services start postgresql@16

# 验证安装
psql --version
# 应该显示: psql (PostgreSQL) 16.x

# 创建数据库
createdb jiebei_finance

# 测试连接
psql jiebei_finance
# 进入数据库后输入 \q 退出
\`\`\`

#### 执行数据库迁移

\`\`\`bash
cd /Users/jianguo/Downloads/jiebei-backend

# 生成 Prisma Client
npm run prisma:generate

# 创建数据库表
npm run prisma:migrate

# 按提示输入迁移名称（如：init）
\`\`\`

成功后，您应该看到类似输出：
\`\`\`
✔ Generated Prisma Client
✔ Your database is now in sync with your Prisma schema
\`\`\`

---

### 🟡 第二阶段：实现 API 端点

后端基础框架已完成，下一步需要实现各个功能模块的 API。

#### 优先级 1：支出 API（最核心）

创建以下文件：

**1. src/routes/expenses.ts** - 路由定义
\`\`\`typescript
import express from 'express'
import * as expenseController from '../controllers/expenseController'

const router = express.Router()

router.get('/', expenseController.getAll)
router.get('/:id', expenseController.getOne)
router.post('/', expenseController.create)
router.put('/:id', expenseController.update)
router.delete('/:id', expenseController.remove)

export default router
\`\`\`

**2. src/controllers/expenseController.ts** - 控制器
\`\`\`typescript
import { Request, Response, NextFunction } from 'express'
import * as expenseService from '../services/expenseService'
import { successResponse } from '../utils/response'

export const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const expenses = await expenseService.getAllExpenses(req.query)
    res.json(successResponse(expenses))
  } catch (error) {
    next(error)
  }
}

// ... 其他方法
\`\`\`

**3. src/services/expenseService.ts** - 业务逻辑
\`\`\`typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const getAllExpenses = async (filters: any) => {
  return await prisma.expense.findMany({
    include: {
      accountBook: true,
      reimbursement: true,
    },
    orderBy: {
      date: 'desc',
    },
  })
}

// ... 其他方法
\`\`\`

**4. 在 src/app.ts 中注册路由**
\`\`\`typescript
import expensesRouter from './routes/expenses'
app.use('/api/expenses', expensesRouter)
\`\`\`

#### 优先级 2：账本 API

类似支出 API 的结构，创建：
- `src/routes/accountBooks.ts`
- `src/controllers/accountBookController.ts`
- `src/services/accountBookService.ts`

#### 优先级 3：其他 API

按相同模式实现：
- 报销 API（/api/reimbursements）
- 投资 API（/api/investments）
- 预算 API（/api/budgets）
- 标签 API（/api/tags）
- 模板 API（/api/templates）
- 循环支出 API（/api/recurring-expenses）
- 配置 API（/api/config）

---

### 🟢 第三阶段：前端适配后端

#### 1. 创建 API 客户端（前端）

在前端项目创建 `src/api/client.ts`：
\`\`\`typescript
import axios from 'axios'

const apiClient = axios.create({
  baseURL: 'http://localhost:4000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

export default apiClient
\`\`\`

#### 2. 创建 API 接口封装

`src/api/expenses.ts`:
\`\`\`typescript
import apiClient from './client'

export const expenseApi = {
  getAll: () => apiClient.get('/expenses'),
  getOne: (id: string) => apiClient.get(\`/expenses/\${id}\`),
  create: (data: any) => apiClient.post('/expenses', data),
  update: (id: string, data: any) => apiClient.put(\`/expenses/\${id}\`, data),
  delete: (id: string) => apiClient.delete(\`/expenses/\${id}\`),
}
\`\`\`

#### 3. 修改 Zustand Store

修改 `src/store/useFinanceStore.ts`，将所有 Dexie 调用替换为 API 调用：

\`\`\`typescript
// 之前
import { db } from '@/db/database'

// 之后
import { expenseApi } from '@/api/expenses'

// 修改示例
addExpense: async (expense) => {
  // 之前
  // await db.expenses.add(newExpense)

  // 之后
  const response = await expenseApi.create(expense)
  set(state => ({ expenses: [...state.expenses, response.data] }))
  return response.data.id
}
\`\`\`

---

## 🎯 快速启动流程

### 后端启动

\`\`\`bash
# 1. 进入后端目录
cd /Users/jianguo/Downloads/jiebei-backend

# 2. 确保 PostgreSQL 运行
brew services list | grep postgresql

# 3. 启动开发服务器
npm run dev

# 服务器运行在 http://localhost:4000
\`\`\`

### 前端启动

\`\`\`bash
# 1. 进入前端目录
cd /Users/jianguo/Downloads/jiebei

# 2. 启动开发服务器
npm run dev

# 前端运行在 http://localhost:3001
\`\`\`

---

## 📝 开发建议

### 1. **逐步迁移策略**

建议按以下顺序迁移功能：
1. ✅ 支出管理（最核心）
2. ✅ 账本管理（已有前端UI）
3. ✅ 报销管理
4. ⏳ 投资管理
5. ⏳ 预算管理
6. ⏳ 标签管理
7. ⏳ 模板和循环支出

### 2. **测试工具**

- **Postman/Insomnia**: 测试 API 端点
- **Prisma Studio**: 可视化数据库管理
  \`\`\`bash
  npm run prisma:studio
  # 打开 http://localhost:5555
  \`\`\`

### 3. **数据迁移**

从 IndexedDB 迁移数据到 PostgreSQL：
- 方案1：前端导出 JSON，后端导入
- 方案2：创建专用的数据迁移 API 端点
- 方案3：手动使用 Prisma Studio 录入

---

## 🔍 故障排查

### 问题1：后端启动失败

\`\`\`bash
# 检查端口是否被占用
lsof -i :4000

# 修改端口（.env文件）
PORT=4001
\`\`\`

### 问题2：数据库连接失败

\`\`\`bash
# 检查 PostgreSQL 状态
brew services list

# 重启 PostgreSQL
brew services restart postgresql@16

# 测试连接
psql jiebei_finance
\`\`\`

### 问题3：CORS 错误

确认 `.env` 中的 CORS_ORIGIN 与前端地址一致：
\`\`\`env
CORS_ORIGIN=http://localhost:3001
\`\`\`

---

## 📚 下一步阅读

- [Prisma 快速入门](https://www.prisma.io/docs/getting-started)
- [Express 最佳实践](https://expressjs.com/en/advanced/best-practice-performance.html)
- [PostgreSQL 基础教程](https://www.postgresqltutorial.com/)

---

## 📞 技术支持

遇到问题？参考：
- 后端 README: `/Users/jianguo/Downloads/jiebei-backend/README.md`
- Prisma Schema: `/Users/jianguo/Downloads/jiebei-backend/prisma/schema.prisma`
- 错误日志：后端终端输出

---

**创建时间**: 2025-11-17
**最后更新**: 2025-11-17
**状态**: 第一阶段完成，等待 PostgreSQL 安装
