# Jiebei Finance Management - Backend API

基于 Node.js + Express + PostgreSQL + Prisma 的后端服务

## 📦 已安装的依赖

### 生产依赖
- ✅ `express` - Web 框架
- ✅ `cors` - 跨域支持
- ✅ `dotenv` - 环境变量管理
- ✅ `@prisma/client` - Prisma Client (ORM)
- ✅ `date-fns` - 日期处理

### 开发依赖
- ✅ `typescript` - TypeScript 支持
- ✅ `ts-node-dev` - 开发服务器（热重载）
- ✅ `@types/node` - Node.js 类型定义
- ✅ `@types/express` - Express 类型定义
- ✅ `@types/cors` - CORS 类型定义
- ✅ `prisma` - Prisma CLI

## 🗄️ 数据库配置（需要完成）

### 步骤 1: 安装 PostgreSQL

**macOS (使用 Homebrew)**:
\`\`\`bash
# 安装 PostgreSQL 16
brew install postgresql@16

# 启动 PostgreSQL 服务
brew services start postgresql@16

# 验证安装
psql --version
\`\`\`

**或使用 Postgres.app** (GUI 应用):
- 下载: https://postgresapp.com/
- 双击安装并启动

### 步骤 2: 创建数据库

\`\`\`bash
# 方式1: 使用命令行
createdb jiebei_finance

# 方式2: 进入 psql 交互式终端
psql postgres
CREATE DATABASE jiebei_finance;
\\q
\`\`\`

### 步骤 3: 配置数据库连接

编辑 `.env` 文件，确认数据库URL正确：

\`\`\`env
DATABASE_URL="postgresql://postgres@localhost:5432/jiebei_finance"
\`\`\`

**注意**: 如果您的 PostgreSQL 有密码，URL格式为：
\`\`\`
postgresql://username:password@localhost:5432/jiebei_finance
\`\`\`

### 步骤 4: 生成 Prisma Client 并执行迁移

\`\`\`bash
# 生成 Prisma Client
npm run prisma:generate

# 创建数据库表（首次迁移）
npm run prisma:migrate

# 或使用交互式命令
npx prisma migrate dev --name init
\`\`\`

## 🚀 启动服务器

### 开发模式（热重载）

\`\`\`bash
cd /Users/jianguo/Downloads/jiebei-backend
npm run dev
\`\`\`

服务器将在 `http://localhost:4000` 启动

### 生产模式

\`\`\`bash
npm run build
npm start
\`\`\`

## 📡 API 端点

### 健康检查
- \`GET /health\` - 服务器健康状态

### 支出 API (计划实现)
- \`GET    /api/expenses\` - 获取所有支出
- \`GET    /api/expenses/:id\` - 获取单个支出
- \`POST   /api/expenses\` - 创建支出
- \`PUT    /api/expenses/:id\` - 更新支出
- \`DELETE /api/expenses/:id\` - 删除支出

### 账本 API (计划实现)
- \`GET    /api/account-books\` - 获取所有账本
- \`POST   /api/account-books\` - 创建账本
- \`PUT    /api/account-books/:id\` - 更新账本
- \`DELETE /api/account-books/:id\` - 删除账本

*更多API端点开发中...*

## 🛠️ 可用脚本

\`\`\`bash
npm run dev             # 启动开发服务器（热重载）
npm run build           # 编译 TypeScript 到 dist/
npm start               # 运行编译后的代码
npm run prisma:generate # 生成 Prisma Client
npm run prisma:migrate  # 执行数据库迁移
npm run prisma:studio   # 打开 Prisma Studio（数据库GUI）
\`\`\`

## 📂 项目结构

\`\`\`
jiebei-backend/
├── src/
│   ├── config/
│   │   └── env.ts              # 环境变量配置
│   ├── middleware/
│   │   └── errorHandler.ts    # 错误处理中间件
│   ├── utils/
│   │   └── response.ts         # 统一响应格式
│   ├── routes/                 # API 路由（待实现）
│   ├── controllers/            # 控制器（待实现）
│   ├── services/               # 业务逻辑（待实现）
│   ├── app.ts                  # Express 应用配置
│   └── server.ts               # 服务器启动入口
├── prisma/
│   └── schema.prisma           # Prisma数据库模型
├── .env                        # 环境变量
├── tsconfig.json               # TypeScript 配置
└── package.json                # 项目依赖
\`\`\`

## 🔧 环境变量

\`\`\`.env
PORT=4000                                                           # 服务器端口
NODE_ENV=development                                                # 环境（development/production）
DATABASE_URL="postgresql://postgres@localhost:5432/jiebei_finance" # 数据库连接
CORS_ORIGIN=http://localhost:3001                                  # 前端地址
\`\`\`

## 📊 数据库管理

### Prisma Studio (可视化数据库管理)

\`\`\`bash
npm run prisma:studio
\`\`\`

浏览器会自动打开 `http://localhost:5555`，可以查看和编辑数据库数据。

### 查看数据库

\`\`\`bash
psql jiebei_finance
\`\`\`

## 🐛 故障排查

### 问题：PostgreSQL 连接失败

**检查服务是否运行**:
\`\`\`bash
brew services list | grep postgresql
\`\`\`

**启动服务**:
\`\`\`bash
brew services start postgresql@16
\`\`\`

### 问题：端口 4000 已被占用

修改 `.env` 文件中的 `PORT` 值：
\`\`\`env
PORT=4001
\`\`\`

### 问题：Prisma Client 未生成

\`\`\`bash
npx prisma generate
\`\`\`

## 📝 下一步

1. ✅ 安装 PostgreSQL
2. ✅ 创建数据库
3. ✅ 执行数据库迁移
4. ⏳ 实现支出 API
5. ⏳ 实现账本 API
6. ⏳ 实现其他 API
7. ⏳ 前端适配后端 API

## 📖 相关资源

- [Express 文档](https://expressjs.com/)
- [Prisma 文档](https://www.prisma.io/docs)
- [PostgreSQL 文档](https://www.postgresql.org/docs/)
- [TypeScript 文档](https://www.typescriptlang.org/docs/)
