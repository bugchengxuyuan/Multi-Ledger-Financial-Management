// 支出记录
export interface Expense {
  id: string
  date: string
  categoryTagId: string         // 分类标签ID（必填，关联到type="category"的Tag）
  amount: number
  description: string
  needsReimbursement?: boolean  // 是否需要报销
  reimbursementId?: string      // 关联的报销记录ID
  labelTagIds?: string[]        // 普通标签ID列表（可选，关联到type="label"的Tag）
  accountBookId?: string        // 所属账本ID
  note?: string                 // 备注
  receiptPhoto?: string         // 发票照片URL
  location?: string             // 消费地点

  // 还款相关
  isDebtRepayment?: boolean     // 是否是还债支出
  relatedCreditAccountId?: string // 如果是还款，关联的信用账户ID

  createdAt: string
  updatedAt: string
}

// 支出模板
export interface ExpenseTemplate {
  id: string
  name: string                  // 模板名称（如"工作日午餐"）
  categoryTagId: string         // 分类标签ID
  amount: number
  description: string
  needsReimbursement: boolean
  labelTagIds?: string[]        // 普通标签ID列表
  createdAt: string
  updatedAt: string
}

// 周期性支出
export interface RecurringExpense {
  id: string
  name: string                  // 名称（如"房租"）
  categoryTagId: string         // 分类标签ID
  amount: number
  description: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'  // 周期
  dayOfWeek?: number            // 周几（weekly时使用，0=周日）
  dayOfMonth?: number           // 几号（monthly时使用）
  monthOfYear?: number          // 几月（yearly时使用）
  startDate: string             // 开始日期
  endDate?: string              // 结束日期（可选）
  lastExecuted?: string         // 最后执行日期
  enabled: boolean              // 是否启用
  autoCreate: boolean           // 是否自动创建支出记录
  createdAt: string
  updatedAt: string
}

// 账本
export interface AccountBook {
  id: string
  name: string                  // 账本名称
  description?: string          // 描述
  icon: string                  // 图标
  color: string                 // 颜色
  isDefault: boolean            // 是否默认账本
  initialBalance: number        // 初始余额
  currentBalance: number        // 当前余额
  balanceMode: string           // 余额模式：'manual' | 'auto' | 'mixed'
  createdAt: string
  updatedAt: string
}

// 预算
export interface Budget {
  id: string
  categoryTagId: string | null  // 分类标签ID（null表示总预算）
  amount: number                // 预算金额
  period: 'daily' | 'weekly' | 'monthly' | 'yearly'  // 预算周期
  startDate: string             // 预算开始日期
  accountBookId?: string        // 所属账本（可选，为空表示全局）
  warningThreshold: number      // 预警阈值（百分比，如80表示80%时预警）
  createdAt: string
  updatedAt: string
}

// 标签类型
export type TagType = 'category' | 'label'

// 标签
export interface Tag {
  id: string
  name: string                  // 标签名称
  type: TagType                 // 标签类型：category（分类）或 label（普通标签）
  color: string                 // 标签颜色
  accountBookId?: string        // 所属账本ID（null/undefined = 全局标签，有值 = 账本专属）
  count?: number                // 使用次数（用于智能推荐）
  createdAt: string
  updatedAt: string
}

// 报销记录
export interface Reimbursement {
  id: string
  date: string
  item: string
  amount: number
  note: string
  status: 'pending' | 'reimbursed'
  reimbursedDate?: string
  expenseId?: string            // 关联的支出记录ID
  createdAt: string
  updatedAt: string
}

// 投资记录
export interface Investment {
  id: string
  name: string
  type: 'precious_metal' | 'equity' | 'fixed_income'
  amount: number
  status: 'holding' | 'sold'
  note?: string
  purchaseDate: string
  accountBookId?: string  // 所属账本ID
  createdAt: string
  updatedAt: string
}

// 收入记录
export interface Income {
  id: string
  date: string
  categoryTagId: string    // 收入分类标签ID
  amount: number
  description: string
  accountBookId?: string
  note?: string
  createdAt: string
  updatedAt: string
}

// 余额变动日志
export interface BalanceLog {
  id: string
  accountBookId: string
  changeType: 'income' | 'expense' | 'manual_adjust' | 'initial'
  amountBefore: number
  amountAfter: number
  changeAmount: number     // 正数=增加，负数=减少
  note?: string
  relatedIncomeId?: string
  relatedExpenseId?: string
  createdAt: string
}

// 信用账户类型
export type CreditAccountType =
  | 'alipay_huabei'      // 支付宝花呗
  | 'jd_baitiao'         // 京东白条
  | '1688_xiancai'       // 1688先采后付
  | 'credit_card'        // 信用卡
  | 'other'              // 其他

// 信用账户状态
export type CreditAccountStatus =
  | 'active'             // 激活中
  | 'settled'            // 已结清
  | 'suspended'          // 暂停使用

// 信用账户
export interface CreditAccount {
  id: string
  name: string                    // 账户名称，如"支付宝-花呗"
  provider: string                // 提供方，如"支付宝"
  type: CreditAccountType         // 账户类型

  // 财务信息
  currentDebt: number             // 当前欠款（核心字段）
  creditLimit?: number            // 信用额度（可选）

  // 还款设置
  repaymentDay: number            // 每月还款日（1-31）
  monthlyRepayment?: number       // 每月固定还款额（可选）

  // 状态
  status: CreditAccountStatus

  // 关联
  accountBookId: string           // 所属账本

  // 元数据
  note?: string                   // 备注
  createdAt: string
  updatedAt: string
}

// 负债变更日志
export interface DebtChangeLog {
  id: string
  creditAccountId: string
  changeType: 'repayment' | 'manual_update' | 'debt_increase'
  amountBefore: number
  amountAfter: number
  changeAmount: number
  note?: string
  relatedExpenseId?: string
  createdAt: string
}

// 财务配置
export interface FinanceConfig {
  id?: string
  creditLimit: number        // 信用额度
  salary: number             // 工资
  salaryDate: string         // 工资到账日
  creditDueDate: string      // 信用还款日
  investmentCapital: number  // 投资本金
  currentAccountBookId?: string  // 当前账本ID
}

// 财务统计
export interface FinanceStats {
  totalSpent: number           // 总支出
  availableCredit: number      // 可用信用额度
  mustKeep: number             // 必须保留
  safeToSpend: number          // 安全可花
  totalInvestment: number      // 已投资
  remainingInvestment: number  // 剩余可投
  pendingReimbursement: number // 待报销

  // 负债相关统计
  totalDebt: number            // 总负债
  monthlyRepayment: number     // 本月已还款
  upcomingRepayments: Array<{  // 即将到期的还款
    creditAccountId: string
    accountName: string
    dueDate: string
    amount: number
    daysUntil: number
  }>
}

// 异常检测结果
export interface AnomalyDetection {
  id: string
  type: 'large_amount' | 'unusual_increase' | 'late_night' | 'unusual_category'
  severity: 'low' | 'medium' | 'high'
  message: string
  expenseId?: string
  category?: string
  amount?: number
  date: string
  suggestions?: string[]
}

// 消费习惯分析结果
export interface ConsumptionHabit {
  type: 'high_frequency' | 'periodic' | 'time_pattern'
  category: string
  description: string
  frequency: number             // 频率（每周/月次数）
  averageAmount: number         // 平均金额
  pattern?: string              // 模式描述
  suggestion?: string           // 建议
}

// 预算状态
export interface BudgetStatus {
  budget: Budget
  spent: number                 // 已花费
  remaining: number             // 剩余
  percentage: number            // 使用百分比
  status: 'safe' | 'warning' | 'exceeded'  // 状态
  daysLeft: number              // 剩余天数
}

// 搜索筛选条件
export interface ExpenseFilter {
  keyword?: string              // 关键词
  categoryTagIds?: string[]     // 分类标签ID列表
  labelTagIds?: string[]        // 普通标签ID列表
  minAmount?: number            // 最小金额
  maxAmount?: number            // 最大金额
  startDate?: string            // 开始日期
  endDate?: string              // 结束日期
  accountBookId?: string        // 账本ID
  needsReimbursement?: boolean  // 是否需要报销
}

// 排序选项
export type SortOption = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc' | 'category'

// ============= 统一交易类型（新增） =============

// 交易类型
export type TransactionType = 'income' | 'expense' | 'investment'

// 统一交易类型（对应后端Transaction表）
export interface Transaction {
  id: string
  type: TransactionType
  subType?: string
  date: string
  categoryTagId: string
  amount: number
  description: string
  accountBookId?: string
  note?: string

  // Expense特有字段
  needsReimbursement?: boolean
  labelTagIds?: string[]
  receiptPhoto?: string
  location?: string

  // Investment特有字段（通过metadata存储）
  metadata?: {
    status?: 'holding' | 'sold'
    purchaseDate?: string
    name?: string
    originalType?: string
    originalStatus?: string
    originalId?: string
  }

  // 关联数据
  accountBook?: AccountBook
  categoryTag?: Tag
  reimbursement?: Reimbursement

  createdAt: string
  updatedAt: string
}

// ============= 类型转换工具函数 =============

/**
 * 将Transaction转换为Expense
 */
export const transactionToExpense = (t: Transaction): Expense | null => {
  if (t.type !== 'expense') return null
  return {
    id: t.id,
    date: t.date,
    categoryTagId: t.categoryTagId,
    amount: t.amount,
    description: t.description,
    needsReimbursement: t.needsReimbursement,
    labelTagIds: t.labelTagIds,
    accountBookId: t.accountBookId,
    note: t.note,
    receiptPhoto: t.receiptPhoto,
    location: t.location,
    reimbursementId: t.reimbursement?.id,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }
}

/**
 * 将Transaction转换为Income
 */
export const transactionToIncome = (t: Transaction): Income | null => {
  if (t.type !== 'income') return null
  return {
    id: t.id,
    date: t.date,
    categoryTagId: t.categoryTagId,
    amount: t.amount,
    description: t.description,
    accountBookId: t.accountBookId,
    note: t.note,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }
}

/**
 * 将Transaction转换为Investment
 */
export const transactionToInvestment = (t: Transaction): Investment | null => {
  if (t.type !== 'investment') return null
  return {
    id: t.id,
    name: t.metadata?.name || t.description,
    type: (t.subType as any) || 'fixed_income',
    amount: t.amount,
    status: t.metadata?.status || 'holding',
    note: t.note,
    purchaseDate: t.metadata?.purchaseDate || t.date,
    accountBookId: t.accountBookId,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }
}

/**
 * 将Expense转换为Transaction
 */
export const expenseToTransaction = (e: Expense): Transaction => {
  return {
    id: e.id,
    type: 'expense',
    date: e.date,
    categoryTagId: e.categoryTagId,
    amount: e.amount,
    description: e.description,
    accountBookId: e.accountBookId,
    note: e.note,
    needsReimbursement: e.needsReimbursement,
    labelTagIds: e.labelTagIds,
    receiptPhoto: e.receiptPhoto,
    location: e.location,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  }
}

/**
 * 将Income转换为Transaction
 */
export const incomeToTransaction = (i: Income): Transaction => {
  return {
    id: i.id,
    type: 'income',
    date: i.date,
    categoryTagId: i.categoryTagId,
    amount: i.amount,
    description: i.description,
    accountBookId: i.accountBookId,
    note: i.note,
    createdAt: i.createdAt,
    updatedAt: i.updatedAt,
  }
}

/**
 * 将Investment转换为Transaction
 */
export const investmentToTransaction = (inv: Investment): Transaction => {
  return {
    id: inv.id,
    type: 'investment',
    subType: inv.type,
    date: inv.purchaseDate,
    categoryTagId: '', // 投资可能没有分类标签，需要特殊处理
    amount: inv.amount,
    description: inv.name,
    accountBookId: inv.accountBookId,
    note: inv.note,
    metadata: {
      name: inv.name,
      status: inv.status,
      purchaseDate: inv.purchaseDate,
      originalType: inv.type,
      originalStatus: inv.status,
      originalId: inv.id,
    },
    createdAt: inv.createdAt,
    updatedAt: inv.updatedAt,
  }
}
