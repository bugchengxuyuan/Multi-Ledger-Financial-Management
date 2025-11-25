import { api, ApiResponse } from './client'
import type { Income } from '../store/types'

/**
 * 收入 API
 */

export interface IncomeFilters {
  accountBookId?: string
  categoryTagId?: string
  startDate?: string
  endDate?: string
}

export interface IncomeStats {
  totalAmount: number | string
  totalCount: number
  byCategory: Array<{
    categoryTagId: string
    categoryTag?: any
    amount: number | string
    count: number
  }>
  byAccountBook: Array<{
    accountBookId: string | null
    accountBook: any | null
    amount: number | string
    count: number
  }>
}

export const incomesApi = {
  /**
   * 获取所有收入
   */
  getAll: async (filters?: IncomeFilters): Promise<Income[]> => {
    const response: ApiResponse<Income[]> = await api.get('/incomes', filters)
    return response.data || []
  },

  /**
   * 获取单个收入
   */
  getOne: async (id: string): Promise<Income | null> => {
    const response: ApiResponse<Income> = await api.get(`/incomes/${id}`)
    return response.data || null
  },

  /**
   * 创建收入
   */
  create: async (income: Omit<Income, 'id' | 'createdAt' | 'updatedAt'>): Promise<Income> => {
    const response: ApiResponse<Income> = await api.post('/incomes', income)
    return response.data!
  },

  /**
   * 更新收入
   */
  update: async (id: string, income: Partial<Income>): Promise<Income> => {
    const response: ApiResponse<Income> = await api.put(`/incomes/${id}`, income)
    return response.data!
  },

  /**
   * 删除收入
   */
  delete: async (id: string): Promise<void> => {
    await api.delete(`/incomes/${id}`)
  },

  /**
   * 获取收入统计
   */
  getStats: async (filters?: IncomeFilters): Promise<IncomeStats> => {
    const response: ApiResponse<IncomeStats> = await api.get('/incomes/stats', filters)
    return response.data!
  },
}
