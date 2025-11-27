/**
 * V1 API 客户端
 * 基于业界最佳实践的简化API设计
 */

import axios from 'axios'
import type {
  AccountBook,
  CreateAccountBookInput,
  UpdateAccountBookInput,
  AccountBookStats,
  Transaction,
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionFilters,
  PaginatedTransactions,
  Tag,
  CreateTagInput,
  UpdateTagInput,
  TagFilters,
  MonthlyStats,
  CategoryStats,
  TrendData,
  TransactionStats,
  CalendarData,
  TagUsageStats,
} from '../../types/v1'

// API 基础配置
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ============================================================================
// 账本 API
// ============================================================================

export const accountBookApi = {
  // 获取所有账本
  getAll: () => api.get<AccountBook[]>('/account-books'),

  // 获取默认账本
  getDefault: () => api.get<AccountBook>('/account-books/default'),

  // 获取单个账本
  getById: (id: string) => api.get<AccountBook>(`/account-books/${id}`),

  // 获取账本统计
  getStats: (id: string, params?: { startDate?: string; endDate?: string }) =>
    api.get<AccountBookStats>(`/account-books/${id}/stats`, { params }),

  // 创建账本
  create: (data: CreateAccountBookInput) =>
    api.post<AccountBook>('/account-books', data),

  // 更新账本
  update: (id: string, data: UpdateAccountBookInput) =>
    api.put<AccountBook>(`/account-books/${id}`, data),

  // 删除账本
  delete: (id: string) => api.delete(`/account-books/${id}`),

  // 设置默认账本
  setDefault: (id: string) =>
    api.put<AccountBook[]>(`/account-books/${id}/set-default`),
}

// ============================================================================
// 交易 API
// ============================================================================

export const transactionApi = {
  // 获取所有交易（支持筛选和分页）
  getAll: (filters?: TransactionFilters) =>
    api.get<PaginatedTransactions>('/transactions', { params: filters }),

  // 获取按日期分组的交易
  getByDateRange: (params: {
    accountBookId: string
    startDate: string
    endDate: string
  }) =>
    api.get<Record<string, Transaction[]>>('/transactions/by-date-range', {
      params,
    }),

  // 获取单个交易
  getById: (id: string) => api.get<Transaction>(`/transactions/${id}`),

  // 创建交易
  create: (data: CreateTransactionInput) =>
    api.post<Transaction>('/transactions', data),

  // 更新交易
  update: (id: string, data: UpdateTransactionInput) =>
    api.put<Transaction>(`/transactions/${id}`, data),

  // 删除交易
  delete: (id: string) => api.delete(`/transactions/${id}`),
}

// ============================================================================
// 标签 API
// ============================================================================

export const tagApi = {
  // 获取所有标签
  getAll: (filters?: TagFilters) =>
    api.get<Tag[]>('/tags', { params: filters }),

  // 获取账本可用的标签
  getAvailable: (accountBookId: string, tagType?: 'category' | 'label') =>
    api.get<Tag[]>('/tags/available', { params: { accountBookId, tagType } }),

  // 获取单个标签
  getById: (id: string) => api.get<Tag>(`/tags/${id}`),

  // 创建标签
  create: (data: CreateTagInput) => api.post<Tag>('/tags', data),

  // 创建默认分类标签
  createDefaults: () => api.post<Tag[]>('/tags/defaults'),

  // 更新标签
  update: (id: string, data: UpdateTagInput) =>
    api.put<Tag>(`/tags/${id}`, data),

  // 删除标签
  delete: (id: string) => api.delete(`/tags/${id}`),
}

// ============================================================================
// 统计 API
// ============================================================================

export const statisticsApi = {
  // 获取月度统计
  getMonthly: (params: { accountBookId: string; year?: number; month?: number }) =>
    api.get<MonthlyStats>('/statistics/monthly', { params }),

  // 获取分类统计
  getCategory: (params: {
    accountBookId: string
    type?: 'income' | 'expense'
    startDate?: string
    endDate?: string
  }) => api.get<CategoryStats[]>('/statistics/category', { params }),

  // 获取趋势数据
  getTrend: (params: { accountBookId: string; months?: number }) =>
    api.get<TrendData[]>('/statistics/trend', { params }),

  // 获取交易统计
  getTransactions: (params: {
    accountBookId: string
    type?: 'income' | 'expense'
    startDate?: string
    endDate?: string
  }) => api.get<TransactionStats>('/statistics/transactions', { params }),

  // 获取日历数据
  getCalendar: (params: { accountBookId: string; year?: number; month?: number }) =>
    api.get<CalendarData>('/statistics/calendar', { params }),

  // 获取标签使用统计
  getTagUsage: (params: { accountBookId: string }) =>
    api.get<TagUsageStats[]>('/statistics/tag-usage', { params }),
}

// ============================================================================
// 导出
// ============================================================================

export default {
  accountBook: accountBookApi,
  transaction: transactionApi,
  tag: tagApi,
  statistics: statisticsApi,
}
