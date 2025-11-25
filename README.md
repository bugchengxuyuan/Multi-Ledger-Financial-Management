# Multi-Ledger Financial Management System

多账本财务管理系统 - 专业的个人财务管理解决方案

## 📖 项目简介

Multi-Ledger Financial Management 是一个功能强大的个人财务管理系统，支持多账本管理、支出/收入追踪、报销管理、投资跟踪、预算规划等功能。采用现代化的前后端分离架构，提供流畅的用户体验和可靠的数据管理。

### 核心功能

- ✅ **多账本管理** - 支持创建和管理多个独立账本（个人、工作等）
- 💰 **交易记录** - 记录支出、收入、投资等各类财务交易
- 🧾 **报销管理** - 跟踪和管理需要报销的费用
- 📊 **预算规划** - 设置和监控各类别支出预算
- 🏷️ **标签系统** - 灵活的标签分类，支持全局和账本专属标签
- 📈 **数据可视化** - 直观的图表展示财务趋势和分类统计
- 🌓 **深色模式** - 支持亮色/暗色主题切换
- 📤 **数据导出** - 支持导出为 CSV/Excel 格式

## 🛠️ 技术栈

### 前端 (Frontend)
- **框架**: React 18.2 + TypeScript 5.2
- **构建工具**: Vite 5.0
- **样式**: Tailwind CSS 3.4 + shadcn/ui
- **状态管理**: Zustand 4.4
- **UI 组件**: Radix UI 组件库
- **图表**: Recharts 2.10
- **图标**: Lucide React

### 后端 (Backend)
- **框架**: NestJS (TypeScript)
- **ORM**: Prisma
- **数据库**: PostgreSQL
- **API**: RESTful API
- **验证**: Class-validator

## 📁 项目结构

```
Multi-Ledger-Financial-Management/
├── frontend/              # 前端应用
│   ├── src/
│   │   ├── components/   # UI 组件
│   │   ├── pages/        # 页面组件
│   │   ├── api/          # API 客户端
│   │   ├── store/        # 状态管理
│   │   └── utils/        # 工具函数
│   ├── package.json
│   └── vite.config.ts
│
├── backend/               # 后端应用
│   ├── src/
│   │   ├── controllers/  # 控制器
│   │   ├── services/     # 业务逻辑
│   │   ├── routes/       # 路由配置
│   │   └── config/       # 配置文件
│   ├── prisma/
│   │   └── schema.prisma # 数据库模型
│   └── package.json
│
├── README.md              # 项目文档（本文件）
└── .gitignore             # Git 忽略规则
```

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0
- npm >= 9.0 或 pnpm >= 8.0
- PostgreSQL >= 14.0 (后端)

### 安装依赖

```bash
# 安装前端依赖
cd frontend
npm install

# 安装后端依赖
cd ../backend
npm install
```

### 配置环境变量

在 `backend/` 目录下创建 `.env` 文件：

```env
DATABASE_URL="postgresql://user:password@localhost:5432/finance_db"
PORT=3001
```

### 数据库设置

```bash
cd backend

# 运行数据库迁移
npx prisma migrate dev

# 生成 Prisma Client
npx prisma generate
```

### 启动开发服务器

```bash
# 终端 1: 启动后端 (http://localhost:3001)
cd backend
npm run dev

# 终端 2: 启动前端 (http://localhost:3000)
cd frontend
npm run dev
```

现在访问 `http://localhost:3000` 即可使用应用！

## 📦 构建生产版本

### 前端构建

```bash
cd frontend
npm run build
# 构建产物位于 frontend/dist/
```

### 后端构建

```bash
cd backend
npm run build
# 构建产物位于 backend/dist/
```

## 📖 开发指南

### 前端开发

- **添加新页面**: 在 `frontend/src/pages/` 创建组件
- **添加 UI 组件**: 在 `frontend/src/components/` 创建可复用组件
- **状态管理**: 使用 Zustand store (`frontend/src/store/useFinanceStore.ts`)
- **API 调用**: 在 `frontend/src/api/` 中添加 API 客户端

### 后端开发

- **添加新功能**: 在 `backend/src/` 中创建 controller、service 和 route
- **数据库模型**: 在 `backend/prisma/schema.prisma` 中定义
- **迁移**: 运行 `npx prisma migrate dev --name description`

### 代码规范

- 使用 TypeScript 严格模式
- 遵循 ESLint 规则
- 提交前运行 `npm run lint`
- 提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org/)

## 🔧 常用命令

### 前端

```bash
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
npm run preview      # 预览生产构建
npm run lint         # 运行 ESLint
```

### 后端

```bash
npm run dev          # 启动开发服务器（带热重载）
npm run build        # 构建生产版本
npm run start        # 启动生产服务器
npx prisma studio    # 打开 Prisma 数据库管理界面
npx prisma migrate dev # 运行数据库迁移
```

## 📝 分支管理

项目采用双分支策略：

- **main** - 生产环境，稳定发布版本
- **develop** - 开发分支，日常开发工作

### 工作流程

```bash
# 日常开发在 develop 分支
git checkout develop
# ... 开发、测试 ...
git add .
git commit -m "feat: 添加新功能"
git push

# 准备发布时合并到 main
git checkout main
git merge develop
git tag v1.0.0
git push origin main --tags
```

## 📄 许可证

MIT License - 详见 LICENSE 文件

## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📧 联系方式

如有问题或建议，欢迎提 Issue 或 Pull Request！

---

**Multi-Ledger Financial Management System** - 让财务管理更简单、更高效 💰
