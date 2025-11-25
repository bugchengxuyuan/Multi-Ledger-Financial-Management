import { api, ApiResponse } from './client'
import type { Expense } from '../store/types'

/**
 * 支出 API
 */

export interface ExpenseFilters {
  accountBookId?: string
  category?: string
  startDate?: string
  endDate?: string
}

export interface ExpenseStats {
  totalAmount: number | string
  totalCount: number
  byCategory: Array<{
    category: string
    amount: number | string
    count: number
  }>
}

export const expensesApi = {
  /**
   * 获取所有支出
   */
  getAll: async (filters?: ExpenseFilters): Promise<Expense[]> => {
    const response: ApiResponse<Expense[]> = await api.get('/expenses', filters)
    return response.data || []
  },

  /**
   * 获取单个支出
   */
  getOne: async (id: string): Promise<Expense | null> => {
    const response: ApiResponse<Expense> = await api.get(`/expenses/${id}`)
    return response.data || null
  },

  /**
   * 创建支出
   */
  create: async (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>): Promise<Expense> => {
    const response: ApiResponse<Expense> = await api.post('/expenses', expense)
    return response.data!
  },

  /**
   * 更新支出
   */
  update: async (id: string, expense: Partial<Expense>): Promise<Expense> => {
    const response: ApiResponse<Expense> = await api.put(`/expenses/${id}`, expense)
    return response.data!
  },

  /**
   * 删除支出
   */
  delete: async (id: string): Promise<void> => {
    await api.delete(`/expenses/${id}`)
  },

  /**
   * 获取支出统计
   */
  getStats: async (filters?: ExpenseFilters): Promise<ExpenseStats> => {
    const response: ApiResponse<ExpenseStats> = await api.get('/expenses/stats', filters)
    return response.data!
  },
}
