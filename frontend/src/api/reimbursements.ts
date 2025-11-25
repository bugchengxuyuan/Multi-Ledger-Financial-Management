import { api, ApiResponse } from './client'
import type { Reimbursement } from '../store/types'

/**
 * 报销 API
 */

export interface ReimbursementFilters {
  status?: string
  startDate?: string
  endDate?: string
}

export interface ReimbursementStats {
  totalAmount: number | string
  totalCount: number
  byStatus: Array<{
    status: string
    amount: number | string
    count: number
  }>
}

export const reimbursementsApi = {
  /**
   * 获取所有报销
   */
  getAll: async (filters?: ReimbursementFilters): Promise<Reimbursement[]> => {
    const response: ApiResponse<Reimbursement[]> = await api.get('/reimbursements', filters)
    return response.data || []
  },

  /**
   * 获取单个报销
   */
  getOne: async (id: string): Promise<Reimbursement | null> => {
    const response: ApiResponse<Reimbursement> = await api.get(`/reimbursements/${id}`)
    return response.data || null
  },

  /**
   * 创建报销
   */
  create: async (reimbursement: Omit<Reimbursement, 'id' | 'createdAt' | 'updatedAt'>): Promise<Reimbursement> => {
    const response: ApiResponse<Reimbursement> = await api.post('/reimbursements', reimbursement)
    return response.data!
  },

  /**
   * 更新报销
   */
  update: async (id: string, reimbursement: Partial<Reimbursement>): Promise<Reimbursement> => {
    const response: ApiResponse<Reimbursement> = await api.put(`/reimbursements/${id}`, reimbursement)
    return response.data!
  },

  /**
   * 删除报销
   */
  delete: async (id: string): Promise<void> => {
    await api.delete(`/reimbursements/${id}`)
  },

  /**
   * 更新报销状态
   */
  updateStatus: async (id: string, status: string, reimbursedDate?: Date): Promise<Reimbursement> => {
    const response: ApiResponse<Reimbursement> = await api.put(`/reimbursements/${id}/status`, {
      status,
      reimbursedDate,
    })
    return response.data!
  },

  /**
   * 获取报销统计
   */
  getStats: async (filters?: ReimbursementFilters): Promise<ReimbursementStats> => {
    const response: ApiResponse<ReimbursementStats> = await api.get('/reimbursements/stats', filters)
    return response.data!
  },
}
