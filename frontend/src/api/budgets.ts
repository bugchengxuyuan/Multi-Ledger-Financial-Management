import { api, ApiResponse } from './client'
import type { Budget } from '../store/types'

/**
 * 预算 API
 */

export interface BudgetFilters {
  accountBookId?: string
  category?: string
  period?: string
}

export interface BudgetUsage {
  budget: Budget
  spent: number | string
  remaining: number | string
  percentage: number
  isOverBudget: boolean
  warningThreshold: number
  shouldWarn: boolean
}

export interface BudgetStats {
  totalBudget: number | string
  totalCount: number
  byPeriod: Array<{
    period: string
    amount: number | string
    count: number
  }>
}

export const budgetsApi = {
  /**
   * 获取所有预算
   */
  getAll: async (filters?: BudgetFilters): Promise<Budget[]> => {
    const response: ApiResponse<Budget[]> = await api.get('/budgets', filters)
    return response.data || []
  },

  /**
   * 获取单个预算
   */
  getOne: async (id: string): Promise<Budget | null> => {
    const response: ApiResponse<Budget> = await api.get(`/budgets/${id}`)
    return response.data || null
  },

  /**
   * 创建预算
   */
  create: async (budget: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>): Promise<Budget> => {
    const response: ApiResponse<Budget> = await api.post('/budgets', budget)
    return response.data!
  },

  /**
   * 更新预算
   */
  update: async (id: string, budget: Partial<Budget>): Promise<Budget> => {
    const response: ApiResponse<Budget> = await api.put(`/budgets/${id}`, budget)
    return response.data!
  },

  /**
   * 删除预算
   */
  delete: async (id: string): Promise<void> => {
    await api.delete(`/budgets/${id}`)
  },

  /**
   * 获取预算使用情况
   */
  getUsage: async (id: string): Promise<BudgetUsage> => {
    const response: ApiResponse<BudgetUsage> = await api.get(`/budgets/${id}/usage`)
    return response.data!
  },

  /**
   * 获取预算统计
   */
  getStats: async (filters?: BudgetFilters): Promise<BudgetStats> => {
    const response: ApiResponse<BudgetStats> = await api.get('/budgets/stats', filters)
    return response.data!
  },
}
