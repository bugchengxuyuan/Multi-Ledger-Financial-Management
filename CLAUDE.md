# CLAUDE.md - 多账本财务管理系统 AI 助手指南

> **设计哲学**: 这是护栏和路标，不是产品手册。详细业务通过代码探索获得。

## 🎯 快速上手

**项目性质**: 全栈个人财务管理系统（支持多账本独立记账）  
**核心价值**: 统一管理收支、投资、信用账户、报销、预算  
**架构**: Monorepo（React + Express + PostgreSQL + Prisma）  
**当前状态**: 🔄 从分散表向统一Transaction表迁移中（重要背景！）  
**最后更新**: 2025-11-25

### 技术栈速览
- **前端**: React 18 + TypeScript(strict) + Vite + Tailwind + shadcn/ui + Zustand
- **后端**: Node.js 18+ + Express 5 + TypeScript + Prisma 6.19 + PostgreSQL 14+
- **关键工具**: date-fns(日期), Recharts(图表), Axios(HTTP), xlsx/jspdf(导出)

---

## ⚡ 核心开发命令

```bash
# 🔧 后端开发
cd backend
npm run dev              # 启动开发服务器 (端口4000)
npx prisma studio       # 打开数据库可视化工具
npx prisma migrate dev  # 创建并应用migration
npx prisma generate     # 重新生成Prisma client（schema改动后必需）
npm run build           # TypeScript编译
npm run typecheck       # 类型检查（修改后必须运行）

# 🎨 前端开发  
cd frontend
npm run dev             # 启动Vite开发服务器 (端口5173)
npm run build           # 生产构建（提交前验证）
npm run typecheck       # 类型检查（CI中必须通过）
npm run preview         # 预览生产构建

# 📦 常用数据库操作
npx prisma migrate dev --name [描述]  # 创建新migration
npx prisma migrate status              # 查看migration状态
npx prisma migrate reset               # 重置数据库（⚠️ 开发环境专用）
npx prisma db push                     # 快速同步schema（原型阶段）
```

---

## 🏗️ 核心业务概念（必须理解）

### 1. 多账本系统 (Multi-Ledger)

**核心理念**：  
用户可创建多个独立账本（个人、公司、旅游等），每个账本有：
- ✅ 独立的余额跟踪
- ✅ 专属的标签体系（也可用全局标签）
- ✅ 独立的预算规划
- ✅ 独立的信用账户

**关键规则**：
```typescript
// 必须有一个默认账本
accountBook.isDefault === true  // 至少一个为true

// 交易可以不关联账本（表示全局记录）
transaction.accountBookId === null  // 允许

// 删除账本不会删除交易
// 只是将交易的accountBookId设为null
```

**为什么重要**：  
- 决定了数据隔离的边界
- 影响余额计算和预算统计
- 涉及到所有功能模块

---

### 2. Transaction 统一表（架构背景）

**迁移状态**：🔄 系统正在从 `Expense`/`Income`/`Investment` 分散表迁移到统一的 `Transaction` 表

**为什么要知道**：
```typescript
// ❌ 旧系统（正在废弃）
/api/expenses
/api/incomes  
/api/investments

// ✅ 新系统（所有新功能使用这个）
/api/transactions  
// 通过 type 字段区分：'expense' | 'income' | 'investment'
```

**当前约定**：
- ✅ 新功能只使用 `/transactions` API
- ⚠️ Legacy API 保留（向后兼容），但标记为 deprecated
- 📁 迁移脚本：`backend/src/scripts/migrate-to-transactions.ts`
- 🔍 两套数据共存，通过 `transactionService` 统一访问

**影响范围**：
- 所有涉及收支投资的功能开发
- 数据统计和报表生成
- 余额计算逻辑

---

### 3. Tag 系统的双重性质（易混淆！）

**两种Tag，完全不同的用途**：

#### Category Tag（分类标签）
```typescript
{
  type: 'category',
  name: '餐饮',
  applicableTypes: ['expense']  // 只能用于支出
}

// 使用规则
transaction.categoryTagId = categoryTag.id  // 必需且唯一
```

#### Label Tag（标记标签）
```typescript
{
  type: 'label', 
  name: '可报销',
  applicableTypes: ['expense', 'income']  // 可用于多种类型
}

// 使用规则
transaction.labelTagIds = [label1.id, label2.id]  // 可选且可多个
```

**为什么重要**：
- 直接影响 API 调用方式（两个不同字段）
- 前端表单需要分开处理
- 数据验证规则不同

**常见错误**：
```typescript
// ❌ 错误 - 把label当category用
transaction.categoryTagId = labelTag.id

// ❌ 错误 - category传数组
transaction.categoryTagId = [tag1.id, tag2.id]

// ✅ 正确
transaction.categoryTagId = categoryTag.id
transaction.labelTagIds = [label1.id, label2.id]
```

---

### 4. 余额跟踪的三种模式

**为什么有三种模式**：满足不同用户习惯

```typescript
type BalanceMode = 'manual' | 'auto' | 'mixed'

// 模式1: manual - 手动记账
// 用户手动输入当前余额，不自动计算
// 适合：只记录结果，不追踪每笔交易

// 模式2: auto - 自动计算  
// 系统根据 initialBalance + 所有Transaction 自动计算
// 适合：严格记录每笔收支

// 模式3: mixed - 混合模式
// 自动计算 + 允许手动调整（产生 BalanceLog）
// 适合：大部分自动，偶尔手动校正
```

**关键区别**：
```typescript
// auto 模式：只能通过 Transaction 影响余额
currentBalance = initialBalance + sum(incomes) - sum(expenses)

// mixed 模式：可以手动调整
currentBalance = auto_calculated + sum(manual_adjustments)
// 手动调整会生成 BalanceLog 记录
```

**为什么重要**：
- 决定了余额计算逻辑
- 影响 UI 显示（manual模式不显示"预测余额"）
- 涉及 `BalanceLog` 表的使用

---

## 🔗 关键模块关系（接口约定）

> 这些是跨模块的依赖规则，违反会导致数据不一致

### 约定 1: Transaction ↔ Balance

**规则**：任何修改 Transaction 金额/类型/账本的操作，**必须**触发余额重算

```typescript
// ❌ 错误 - 直接修改Transaction
await prisma.transaction.update({
  where: { id },
  data: { amount: newAmount }
})
// 余额不会更新！数据不一致！

// ✅ 正确 - 通过Service
await transactionService.update(id, { amount: newAmount })
// 内部会调用 balanceService.recalculate()
```

**检查点**：
- 创建 Transaction → `balanceService.recalculate(accountBookId)`
- 更新金额/类型 → `balanceService.recalculate(accountBookId)`
- 删除 Transaction → `balanceService.recalculate(accountBookId)`
- 修改账本归属 → 同时重算新旧两个账本

**路标**：详细实现见 `backend/src/services/balanceService.ts`

---

### 约定 2: CreditAccount ↔ DebtChangeLog

**规则**：所有还款操作必须**原子性**地完成两件事

```typescript
// 还款时必须同时执行：
// 1. 更新 creditAccount.currentDebt
// 2. 创建 DebtChangeLog 记录

// ❌ 错误 - 只更新债务
await prisma.creditAccount.update({
  data: { currentDebt: { decrement: amount } }
})

// ✅ 正确 - 使用Service保证原子性
await creditAccountService.repay(creditAccountId, {
  amount: 500,
  note: '月度还款'
})
// 内部使用事务(transaction)保证一致性
```

**为什么重要**：
- 用户需要追溯每笔还款历史
- 数据审计需要
- 避免"钱还了但记录丢失"的bug

**路标**：实现见 `backend/src/services/creditAccountService.ts` 的 `repay` 方法

---

### 约定 3: Reimbursement ↔ Expense ↔ Income（三向关联）

**规则**：报销是一个**三阶段流程**，必须维护三者关系

```typescript
// 阶段1: 创建需报销的支出
expense = {
  type: 'expense',
  amount: 100,
  needsReimbursement: true  // 标记需报销
}

// 阶段2: 创建报销单（关联到支出）
reimbursement = {
  expenseId: expense.id,      // 指向原始支出
  amount: 100,                // 报销金额
  status: 'pending'
}

// 阶段3: 收到报销款（生成Income）
income = {
  type: 'income',
  amount: 100,
  reimbursementId: reimbursement.id  // 关联到报销单
}
// 同时更新 reimbursement.status = 'completed'
```

**关键约束**：
- 一个 Expense 只能有一个 Reimbursement
- Reimbursement.amount 不能超过 Expense.amount
- 完成报销时，三者状态必须同步更新

**路标**：完整流程见 `backend/src/services/reimbursementService.ts`

---

### 约定 4: BalanceLog vs Transaction（易混淆）

**核心区别**：两者记录的是不同性质的事件

```typescript
// Transaction - 真实的收支行为
{
  type: 'expense',
  amount: 50,
  description: '午餐'
}
// → 影响余额：-50

// BalanceLog - 手动余额调整
{
  changeAmount: +200,
  note: '发现银行实际余额多了200，手动校正'
}
// → 影响余额：+200
// 但不代表有实际收入！只是校正差异
```

**使用场景**：
- Transaction：记录真实的财务活动
- BalanceLog：记录余额校正（如发现遗漏、现金找零等）

**为什么重要**：
- 统计报表时不能把 BalanceLog 当作收入！
- 余额计算要同时考虑两者

**路标**：见 `backend/src/services/balanceService.ts` 的 `adjust` 方法

---

## 🚨 开发规范（基于实际错误）

### 数据库相关（高频错误区）

**❌ 永远不要：**
```bash
# 1. 修改schema后不运行migration
vim schema.prisma  # 改了
# 然后就开始写代码 ← 错误！Prisma client没更新

# 2. 删除已应用的migration文件
rm prisma/migrations/20231201_xxx/  # 会导致其他开发者的DB不一致

# 3. 在生产环境运行reset
npx prisma migrate reset  # ⚠️ 会删除所有数据！

# 4. 直接修改数据库schema（不通过Prisma）
ALTER TABLE transactions ADD COLUMN ...  # 绕过了migration系统
```

**✅ 正确流程：**
```bash
# 修改schema
vim backend/prisma/schema.prisma

# 创建migration
npx prisma migrate dev --name add_new_field

# 重新生成client（自动）
# 如果没自动生成，手动运行：
npx prisma generate

# 更新前端types（手动）
vim frontend/src/store/types.ts

# 运行类型检查
npm run typecheck
```

**遇到migration冲突：**
```bash
# 1. 先查看状态
npx prisma migrate status

# 2a. 开发环境：重置（会丢数据）
npx prisma migrate reset

# 2b. 生产环境：只应用pending的
npx prisma migrate deploy

# 2c. 本地开发冲突：
# - 删除本地pending migration文件
# - 重新从远程拉取
# - 运行 npx prisma migrate dev
```

---

### API 开发标准流程（必须按顺序）

**强制顺序**（跳步会导致问题）：

```
1️⃣ Schema（如需要）
   ↓
2️⃣ Service（业务逻辑）
   ↓
3️⃣ Controller（请求处理）
   ↓
4️⃣ Route（路由定义）
   ↓
5️⃣ Register in app.ts（新资源）
   ↓
6️⃣ Frontend API Client
   ↓
7️⃣ Frontend Types
```

**检查清单**：
- [ ] Service 层有完整的错误处理
- [ ] Controller 使用了统一的 errorHandler middleware
- [ ] Route 有适当的参数验证
- [ ] Frontend types 与后端响应结构一致
- [ ] 涉及余额的操作调用了 `balanceService.recalculate()`

**反例（常见错误）**：
```typescript
// ❌ 在Controller里直接写业务逻辑
export const createTransaction = async (req, res) => {
  const data = req.body
  const transaction = await prisma.transaction.create({ data })
  // 忘记调用 balanceService！
  res.json(transaction)
}

// ✅ 正确 - 业务逻辑在Service
export const createTransaction = async (req, res, next) => {
  try {
    const transaction = await transactionService.create(req.body)
    // Service内部会处理余额、验证、关联等
    res.json(transaction)
  } catch (error) {
    next(error)  // 统一错误处理
  }
}
```

---

### 类型安全（严格要求）

**规则**：
```typescript
// 1. 前后端类型必须同步
// Prisma生成types → Backend返回 → Frontend定义interface

// 2. 修改API响应结构 = 必须同时更新前端
// backend/src/services/xxx.ts 改了返回值
//   ↓
// frontend/src/store/types.ts 必须同步更新

// 3. 禁止滥用 any
const data: any = await api.get()  // ❌ 除非确实无法定义类型

// 4. CI中类型检查必须通过
npm run typecheck  // 提交前必须是绿色
```

**类型同步示例**：
```typescript
// backend - Prisma自动生成
type Transaction = {
  id: string
  type: 'income' | 'expense' | 'investment'
  amount: Decimal  // 注意是Prisma的Decimal类型
  // ...
}

// frontend - 手动定义（需要调整Decimal为number）
interface Transaction {
  id: string
  type: 'income' | 'expense' | 'investment'
  amount: number  // 前端用number
  // 必须完全对应，不能漏字段
}
```

---

### 状态管理（Zustand规范）

**规则**：
```typescript
// ✅ 所有API调用在action中
const useFinanceStore = create((set) => ({
  transactions: [],
  isLoading: false,
  error: null,

  fetchTransactions: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await transactionsApi.getAll()
      set({ transactions: response.data })
    } catch (error) {
      set({ error: error.message })
      console.error('[Store] Fetch failed:', error)
    } finally {
      set({ isLoading: false })
    }
  }
}))

// ❌ 不要在组件中直接用axios
function Component() {
  const [data, setData] = useState([])
  useEffect(() => {
    axios.get('/api/transactions').then(setData)  // 错误！
  }, [])
}
```

**加载状态模式**（标准模板）：
```typescript
const someAction = async (params) => {
  set({ isLoading: true, error: null })  // 开始前
  try {
    const result = await api.someCall(params)
    set({ data: result })  // 成功
  } catch (error) {
    set({ error: error.message })  // 失败
    // 可选：显示toast通知
  } finally {
    set({ isLoading: false })  // 无论成功失败都重置
  }
}
```

---

### UI/样式规范

**Dark Mode（强制要求）**：
```tsx
// ❌ 错误 - 只有light模式
<div className="bg-white text-gray-900">

// ✅ 正确 - 支持dark mode
<div className="bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100">
```

**组件选择**：
```tsx
// 1️⃣ 优先使用shadcn/ui组件
import { Button } from '@/components/ui/button'

// 2️⃣ 自定义组件放在feature目录
// frontend/src/components/dashboard/TransactionCard.tsx

// 3️⃣ Icon统一使用lucide-react
import { Calendar, DollarSign } from 'lucide-react'
```

**样式工具**：
```tsx
import { cn } from '@/lib/utils'

// 使用cn()合并className
<div className={cn(
  "base-class",
  isActive && "active-class",
  "another-class"
)} />
```

---

## 🔍 业务探索指导（产品经理模式）

> 这是最重要的部分！教会AI如何自主理解业务

### 何时需要"深入探索"

**场景判断**：
```
✅ 需要探索：
- 开发新功能（需要理解现有业务逻辑）
- 修复复杂bug（需要追踪数据流）
- 重构模块（需要理解依赖关系）
- 编写测试（需要理解边界情况）

❌ 不需要探索：
- 修改样式
- 添加简单字段
- 文案调整
- 配置更新
```

---

### 探索流程（标准四步法）

#### 第一步：扫描 Service 层（核心业务逻辑）

```bash
# 例：理解"报销功能"
> 请作为产品经理，深入分析报销功能：
> 
> 1. 阅读 backend/src/services/reimbursementService.ts
> 2. 列出所有核心方法及其作用
> 3. 总结业务流程：从创建到完成
> 4. 识别关键业务规则（金额限制、状态转换等）
> 
> 输出到临时文档：/tmp/reimbursement-analysis.md
```

**AI会分析出**：
- 核心方法：create, update, complete, cancel
- 业务流程：Expense → Reimbursement → Income
- 业务规则：金额不能超出、状态机转换、关联约束

---

#### 第二步：追踪关联（找依赖）

```bash
> 继续分析：
> 
> 1. reimbursementService调用了哪些其他Service？
> 2. 哪些Service会调用reimbursementService？
> 3. 涉及哪些数据表？它们的关系是什么？
> 
> 补充到 /tmp/reimbursement-analysis.md
```

**AI会发现**：
- 调用：transactionService, balanceService
- 被调用：可能被统计模块使用
- 数据表：Reimbursement, Transaction (expense & income)

---

#### 第三步：查看前端实现（理解UI交互）

```bash
> 现在看前端：
> 
> 1. 扫描 frontend/src/pages/Reimbursement.tsx
> 2. 用户如何发起报销？
> 3. 用户如何完成报销？
> 4. 有哪些表单验证和错误提示？
> 
> 补充UI交互部分
```

**AI会总结**：
- 两个主要入口：从支出列表标记、从报销页创建
- 完成报销：点击按钮 → 弹窗确认金额 → 自动生成Income
- 验证：金额范围、状态检查

---

#### 第四步：文档化理解（形成知识）

```bash
> 最后整理：
> 
> 把分析整理成结构化文档：
> 
> # 报销功能业务分析
> 
> ## 核心概念
> - 报销是什么？
> - 为什么需要三向关联？
> 
> ## 业务流程
> [用Mermaid画流程图]
> 
> ## 关键规则
> - 约束1: ...
> - 约束2: ...
> 
> ## API接口
> [列出主要endpoint]
> 
> ## 已知问题
> [如果发现了bug或改进点]
> 
> 保存到 docs/business/reimbursement.md
```

---

### 探索后的使用

```bash
# 方式1：同会话继续开发
> 很好！现在基于这个理解，添加"批量报销"功能
> 允许用户一次选择多个Expense创建一个Reimbursement

# 方式2：跨会话复用
[下次开发相关功能]
> 先阅读 docs/business/reimbursement.md
> 然后帮我实现"报销审批流程"功能
```

---

### 快速定位法（修Bug用）

```bash
# 用户报告：信用账户还款后债务没更新

> 快速定位问题：
> 
> 1. 找到还款的Service方法
>    → backend/src/services/creditAccountService.ts
> 
> 2. 检查是否更新了 currentDebt
>    → 搜索关键词 "currentDebt"
> 
> 3. 检查是否有事务包裹（原子性）
>    → 搜索 "prisma.$transaction"
> 
> 4. 检查是否创建了 DebtChangeLog
>    → 搜索 "debtChangeLog.create"
> 
> 定位问题后报告，不要立即修复
```

**AI会发现问题并说明**：
- 发现：还款方法没有使用事务
- 后果：可能currentDebt更新了但DebtChangeLog创建失败
- 建议：用 `prisma.$transaction` 包裹

---

## 📁 关键路标（按需查阅）

> 这些是"去哪里找"的快速索引

### 业务逻辑核心

| 功能 | Service文件 | 关键方法 |
|------|-------------|----------|
| 交易管理 | `transactionService.ts` | create, update, delete |
| 余额计算 | `balanceService.ts` | recalculate, adjust, getHistory |
| 信用账户 | `creditAccountService.ts` | create, repay, updateDebt |
| 报销管理 | `reimbursementService.ts` | create, complete, link |
| 标签系统 | `tagService.ts` | create, checkUsage, getByType |
| 预算管理 | `budgetService.ts` | create, checkOverBudget |

### 前端状态与工具

| 功能 | 文件位置 |
|------|----------|
| 全局状态 | `frontend/src/store/useFinanceStore.ts` |
| 类型定义 | `frontend/src/store/types.ts` |
| 金额计算 | `frontend/src/utils/calculations.ts` |
| 日期格式 | `frontend/src/utils/formatters.ts` |
| 导出功能 | `frontend/src/utils/exportData.ts` |
| 统计分析 | `frontend/src/utils/expenseAnalytics.ts` |

### 数据库Schema

| 查询需求 | 位置 |
|----------|------|
| 完整Schema | `backend/prisma/schema.prisma` |
| 表关系理解 | 搜索 `@relation` |
| 字段约束 | 搜索 `@unique`, `@default` |
| 索引优化 | 搜索 `@@index` |

### API文档

**完整端点列表**：见本文件末尾的折叠区域  
**快速查找**：直接搜索 "GET /transactions" 等关键词

---

## 📋 工作流模板

### 模板1：新功能开发（完整流程）

```bash
# 阶段1：理解业务（产品经理角色）
> 我需要开发"预算超支预警"功能
> 
> 作为产品经理，请：
> 1. 扫描 budgetService.ts 理解现有预算系统
> 2. 扫描 transactionService.ts 理解交易创建流程
> 3. 分析：何时应该触发预警？预警信息包含什么？
> 4. 输出到 /tmp/budget-alert-analysis.md

[等待AI分析...]

# 阶段2：设计方案（架构师角色）
> 基于业务理解，设计技术方案：
> 
> 1. 在哪个环节检查预算？（transaction create时）
> 2. 预警信息如何存储？（新表？还是实时计算？）
> 3. 前端如何显示？（toast？模态框？页面角标？）
> 4. 需要修改哪些文件？
> 5. 列出详细的实现步骤
> 
> 更新到 /tmp/budget-alert-plan.md

[审查计划，调整...]

# 阶段3：执行开发（工程师角色）
> 按照计划实现，遵循以下规范：
> - 后端：在transactionService.create中添加预算检查
> - 前端：在store action中处理预警响应
> - 测试：创建交易时模拟超支场景
> 
> 实现完成后，运行 npm run typecheck 验证

# 阶段4：测试验证
> 测试以下场景：
> 1. 正常交易（未超支）
> 2. 交易导致超支
> 3. 已超支状态下继续交易
> 4. 修改预算后状态变化
```

---

### 模板2：Bug修复流程

```bash
# 用户反馈：删除交易后余额没有更新

# 第一步：复现问题
> 详细描述复现步骤：
> 1. 用户操作：进入交易列表，点击删除按钮
> 2. 预期结果：交易删除，余额减少100
> 3. 实际结果：交易删除了，余额没变

# 第二步：定位模块
> 分析问题可能在哪里：
> 1. 前端删除调用了正确的API吗？
>    → 检查 frontend/src/api/transactions.ts
> 2. 后端删除方法有调用余额重算吗？
>    → 检查 backend/src/services/transactionService.ts
> 3. 余额重算逻辑有bug吗？
>    → 检查 backend/src/services/balanceService.ts

[AI会发现问题位置]

# 第三步：追踪数据流
> 追踪完整调用链：
> Frontend delete button click
>   → api.deleteTransaction(id)
>   → DELETE /transactions/:id
>   → transactionController.delete
>   → transactionService.delete
>   → [检查这里是否调用了 balanceService.recalculate]

# 第四步：修复并验证
> 修复问题，确保：
> 1. transactionService.delete 调用了 balanceService.recalculate
> 2. 使用事务保证原子性
> 3. 添加错误处理
> 4. 更新相关测试
> 
> 修复后手动测试相同场景
```

---

### 模板3：代码审查（自我检查）

```bash
# 完成开发后，运行自我审查

> 请审查我刚写的代码：
> 
> 检查清单：
> 
> 1. 类型安全
>    - [ ] 没有使用 any（除非必要）
>    - [ ] 前端types与后端响应一致
>    - [ ] 运行 npm run typecheck 通过
> 
> 2. 错误处理
>    - [ ] 所有async函数有try-catch
>    - [ ] 使用统一的errorHandler
>    - [ ] 前端显示用户友好的错误信息
> 
> 3. 数据一致性
>    - [ ] 涉及余额的操作调用了recalculate
>    - [ ] 关联数据使用事务包裹
>    - [ ] 状态更新是原子性的
> 
> 4. UI规范
>    - [ ] 支持dark mode
>    - [ ] 使用shadcn/ui组件
>    - [ ] 响应式设计
> 
> 5. 性能
>    - [ ] 列表使用分页/虚拟滚动
>    - [ ] 避免不必要的重渲染
>    - [ ] 使用useMemo缓存计算
> 
> 指出需要改进的地方
```

---

## 🐛 故障排除速查

### PostgreSQL

```bash
# 连接失败
brew services list | grep postgresql  # macOS查看状态
systemctl status postgresql           # Linux查看状态

# 启动服务
brew services start postgresql@16     # macOS
sudo systemctl start postgresql       # Linux

# 检查连接串（backend/.env）
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"

# 测试连接
npx prisma db pull  # 能拉取schema说明连接正常
```

### Prisma

```bash
# Client未生成
npx prisma generate

# Migration冲突
npx prisma migrate status  # 先看状态
npx prisma migrate reset   # 开发环境重置
npx prisma migrate deploy  # 生产环境应用

# Schema与DB不同步
npx prisma db push  # 快速同步（原型阶段）
npx prisma migrate dev  # 正式环境用migration

# Studio打不开
npx prisma studio --port 5556  # 换端口试试
```

### 前端

```bash
# 类型错误（schema改动后）
cd backend && npx prisma generate  # 先重新生成
cd frontend && vim src/store/types.ts  # 手动更新前端types
npm run typecheck  # 验证

# API连接失败
# 检查后端是否运行：curl http://localhost:4000/api/health
# 检查CORS：backend/.env 的 CORS_ORIGIN
# 检查前端配置：frontend/.env 的 VITE_API_BASE_URL

# 构建失败
rm -rf node_modules dist .vite
npm install
npm run build
```

### 常见业务错误

```bash
# 余额不更新
→ 检查是否调用了 balanceService.recalculate()
→ 检查accountBookId是否正确
→ 检查balanceMode（manual模式不自动算）

# 删除tag失败
→ 检查是否被transaction使用
→ 使用 tagService.checkUsage() 先检查
→ 需要先解除关联或删除相关transaction

# 报销无法完成
→ 检查 reimbursement.status 状态
→ 检查金额是否超出expense金额
→ 检查是否已经生成过income
```

---

## 📚 扩展资源

### 项目内文档

| 文档 | 用途 |
|------|------|
| `README.md` | 用户使用指南（中文） |
| `backend/README.md` | 后端环境配置 |
| `frontend/CODEBASE_ANALYSIS.md` | 前端技术分析 |
| `docs/business/` | 业务分析文档（AI生成）|

### 官方文档（遇到深入问题时查阅）

- [Prisma Relations](https://www.prisma.io/docs/concepts/components/prisma-client/relation-queries) - 复杂查询
- [Zustand](https://docs.pmnd.rs/zustand) - 状态管理高级用法
- [shadcn/ui](https://ui.shadcn.com) - 组件文档
- [Tailwind CSS](https://tailwindcss.com) - 样式工具类

---

## 🎯 快速决策指南

**数据库改动** → 先运行 `npx prisma migrate dev`，永远不要手动改DB  
**API不工作** → 检查 Service → Controller → Route → Frontend API client 链路  
**类型错误** → 重新生成 Prisma client，同步更新前端 types  
**余额不对** → 使用 `balanceService` 方法，不要自己算  
**功能不熟悉** → 按"探索流程"深入理解，不要猜  
**不知道在哪** → IDE全局搜索关键词（如 "reimbursement"）

---

<details>
<summary>📖 完整API端点参考（点击展开）</summary>

### Transaction API（统一接口 - 主要使用）
```
GET    /api/transactions           # 列表（支持type/date/accountBook过滤）
GET    /api/transactions/:id       # 单个详情
POST   /api/transactions           # 创建（type字段区分收支投资）
PUT    /api/transactions/:id       # 更新
DELETE /api/transactions/:id       # 删除
```

### Account Books API
```
GET    /api/account-books          # 列表
GET    /api/account-books/:id      # 详情
POST   /api/account-books          # 创建
PUT    /api/account-books/:id      # 更新
DELETE /api/account-books/:id      # 删除（不能删默认账本）
POST   /api/account-books/:id/set-default  # 设为默认
```

### Credit Accounts API
```
GET    /api/credit-accounts        # 列表
GET    /api/credit-accounts/:id    # 详情
POST   /api/credit-accounts        # 创建
PUT    /api/credit-accounts/:id    # 更新
DELETE /api/credit-accounts/:id    # 删除
POST   /api/credit-accounts/:id/repay  # 记录还款（重要）
```

### Tags API
```
GET    /api/tags                   # 列表（?type=category/label过滤）
GET    /api/tags/:id               # 详情
POST   /api/tags                   # 创建
PUT    /api/tags/:id               # 更新
DELETE /api/tags/:id               # 删除（使用中会报错）
```

### Reimbursement API
```
GET    /api/reimbursements         # 列表
GET    /api/reimbursements/:id     # 详情
POST   /api/reimbursements         # 创建
PUT    /api/reimbursements/:id     # 更新
DELETE /api/reimbursements/:id     # 删除
POST   /api/reimbursements/:id/complete  # 完成报销
```

### Budget API
```
GET    /api/budgets                # 列表
GET    /api/budgets/:id            # 详情
POST   /api/budgets                # 创建
PUT    /api/budgets/:id            # 更新
DELETE /api/budgets/:id            # 删除
GET    /api/budgets/check-overspend  # 检查超支
```

### Balance API
```
GET    /api/balances/:accountBookId           # 当前余额
POST   /api/balances/:accountBookId/adjust    # 手动调整
GET    /api/balances/:accountBookId/logs      # 余额变更历史
POST   /api/balances/:accountBookId/recalculate  # 强制重算
```

### Legacy API（保留但不推荐）
```
# 这些API逐步废弃，新功能请用 /transactions
GET    /api/expenses
GET    /api/incomes
GET    /api/investments
```

</details>

---

**维护提醒**：  
- 当 Claude 频繁犯相同错误时 → 添加到"🚨 开发规范"  
- 当发现新的模块依赖时 → 添加到"🔗 关键模块关系"  
- 当业务流程变更时 → 更新"🏗️ 核心业务概念"

**最后更新**: 2025-11-25
