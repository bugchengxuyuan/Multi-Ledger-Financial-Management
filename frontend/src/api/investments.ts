import { api, ApiResponse } from './client'
import type { Investment } from '../store/types'

/**
 * 投资 API
 */

export interface InvestmentFilters {
  type?: string
  status?: string
  accountBookId?: string
}

export interface InvestmentStats {
  totalAmount: number | string
  totalCount: number
  byType: Array<{
    type: string
    amount: number | string
    count: number
  }>
  byStatus: Array<{
    status: string
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

export const investmentsApi = {
  /**
   * 获取所有投资
   */
  getAll: async (filters?: InvestmentFilters): Promise<Investment[]> => {
    const response: ApiResponse<Investment[]> = await api.get('/investments', filters)
    return response.data || []
  },

  /**
   * 获取单个投资
   */
  getOne: async (id: string): Promise<Investment | null> => {
    const response: ApiResponse<Investment> = await api.get(`/investments/${id}`)
    return response.data || null
  },

  /**
   * 创建投资
   */
  create: async (investment: Omit<Investment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Investment> => {
    const response: ApiResponse<Investment> = await api.post('/investments', investment)
    return response.data!
  },

  /**
   * 更新投资
   */
  update: async (id: string, investment: Partial<Investment>): Promise<Investment> => {
    const response: ApiResponse<Investment> = await api.put(`/investments/${id}`, investment)
    return response.data!
  },

  /**
   * 删除投资
   */
  delete: async (id: string): Promise<void> => {
    await api.delete(`/investments/${id}`)
  },

  /**
   * 获取投资统计
   */
  getStats: async (filters?: InvestmentFilters): Promise<InvestmentStats> => {
    const response: ApiResponse<InvestmentStats> = await api.get('/investments/stats', filters)
    return response.data!
  },
}
