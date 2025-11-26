/**
 * V1 类型定义
 * 基于业界最佳实践的简化数据模型
 */

// ============================================================================
// 基础类型
// ============================================================================

export type AccountBookType = 'personal' | 'business' | 'partner'
export type TransactionType = 'income' | 'expense'
export type TagType = 'category' | 'label'
export type TagScope = 'global' | 'account_book'

// ============================================================================
// 账本相关
// ============================================================================

export interface AccountBook {
  id: string
  name: string
  type: AccountBookType
  openingBalance: number
  currentBalance: number
  color: string
  icon: string
  isDefault: boolean
  description: string | null
  createdAt: string
  updatedAt: string
  _count?: {
    transactions: number
    tags: number
  }
}

export interface CreateAccountBookInput {
  name: string
  type?: AccountBookType
  openingBalance?: number
  color?: string
  icon?: string
  isDefault?: boolean
  description?: string
}

export interface UpdateAccountBookInput {
  name?: string
  type?: AccountBookType
  color?: string
  icon?: string
  description?: string
}

export interface AccountBookStats {
  accountBook: AccountBook
  totalIncome: number
  totalExpense: number
  transactionCount: number
}

// ============================================================================
// 交易相关
// ============================================================================

export interface Transaction {
  id: string
  accountBookId: string
  type: TransactionType
  amount: number
  date: string
  categoryTagId: string
  description: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  accountBook?: {
    id: string
    name: string
    color: string
    icon: string
  }
  categoryTag?: Tag
  labelTags?: TransactionTag[]
}

export interface TransactionTag {
  id: string
  transactionId: string
  tagId: string
  tag?: Tag
}

export interface CreateTransactionInput {
  accountBookId: string
  type: TransactionType
  amount: number
  date: string
  categoryTagId: string
  labelTagIds?: string[]
  description?: string
  notes?: string
}

export interface UpdateTransactionInput {
  type?: TransactionType
  amount?: number
  date?: string
  categoryTagId?: string
  labelTagIds?: string[]
  description?: string
  notes?: string
}

export interface TransactionFilters {
  accountBookId?: string
  type?: TransactionType
  categoryTagId?: string
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}

export interface PaginatedTransactions {
  data: Transaction[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

// ============================================================================
// 标签相关
// ============================================================================

export interface Tag {
  id: string
  name: string
  tagType: TagType
  scope: TagScope
  accountBookId: string | null
  color: string
  icon: string | null
  createdAt: string
  updatedAt: string
  accountBook?: {
    id: string
    name: string
  } | null
  _count?: {
    categoryTransactions: number
    labelTransactions: number
  }
}

export interface CreateTagInput {
  name: string
  tagType: TagType
  scope?: TagScope
  accountBookId?: string
  color?: string
  icon?: string
}

export interface UpdateTagInput {
  name?: string
  color?: string
  icon?: string
}

export interface TagFilters {
  tagType?: TagType
  scope?: TagScope
  accountBookId?: string
}

// ============================================================================
// 统计相关
// ============================================================================

export interface MonthlyStats {
  accountBook: {
    id: string
    name: string
    currentBalance: number
    openingBalance: number
  }
  month: string
  income: {
    amount: number
    count: number
  }
  expense: {
    amount: number
    count: number
  }
  balance: number
}

export interface CategoryStats {
  categoryTagId: string
  name: string
  color: string
  icon: string | null
  amount: number
  count: number
  percentage: string
}

export interface TrendData {
  month: string
  income: number
  expense: number
  net: number
}

export interface TransactionStats {
  totalAmount: number
  totalCount: number
  byType: {
    type: string
    amount: number
    count: number
  }[]
}

export interface CalendarData {
  year: number
  month: number
  data: Record<string, { income: number; expense: number }>
}

export interface TagUsageStats {
  tagId: string
  name: string
  tagType: string
  color: string | null
  icon: string | null
  count: number
  totalAmount: number
}

// ============================================================================
// 余额相关
// ============================================================================

export interface BalanceLog {
  id: string
  accountBookId: string
  changeType: string
  amountBefore: number
  amountAfter: number
  changeAmount: number
  note: string | null
  transactionId: string | null
  createdAt: string
}

export interface BalanceInfo {
  accountBook: {
    id: string
    name: string
    icon: string
    openingBalance: number
    currentBalance: number
  }
  recentLogs: BalanceLog[]
}

// ============================================================================
// API 响应类型
// ============================================================================

export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface ApiError {
  error: string
  message?: string
}
