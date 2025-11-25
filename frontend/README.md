# 多账本财务管理系统

一个专业的个人财务管理系统，支持多账本管理，帮助跟踪支出、规划财务、管理投资资产。

## 功能特性

- **仪表盘**: 一目了然的财务概览，实时显示可用额度和财务健康度
- **支出记录**: 详细记录每笔支出，支持多种分类和多账本
- **财务规划**: 智能规划建议，帮助合理安排财务
- **投资资产**: 管理个人投资组合，追踪资产配置
- **报销管理**: 跟踪待报销项目，确保资金及时回笼
- **多账本**: 支持创建多个账本，灵活分类管理不同类型的支出

## 技术栈

- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite
- **样式**: Tailwind CSS
- **UI组件**: shadcn/ui
- **状态管理**: Zustand
- **本地数据库**: Dexie.js (IndexedDB)
- **图表**: Recharts
- **图标**: Lucide React

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

应用将在 `http://localhost:3000` 启动

### 生产构建

```bash
npm run build
```

### 预览生产版本

```bash
npm run preview
```

## 项目结构

```
jiebei/
├── src/
│   ├── components/      # UI组件
│   ├── pages/          # 页面组件
│   ├── store/          # 状态管理
│   ├── db/             # 数据库配置
│   ├── utils/          # 工具函数
│   └── lib/            # 第三方库配置
├── public/             # 静态资源
└── index.html          # HTML模板
```

## 数据持久化

本应用使用 IndexedDB 进行本地数据存储，所有数据保存在浏览器本地，保护您的隐私安全。

## License

MIT
