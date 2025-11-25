import { api, ApiResponse } from './client'
import type { AccountBook } from '../store/types'

/**
 * 账本 API
 */

export interface AccountBookStats {
  expenseCount: number
  budgetCount: number
  totalExpense: number | string
}

export const accountBooksApi = {
  /**
   * 获取所有账本
   */
  getAll: async (): Promise<AccountBook[]> => {
    const response: ApiResponse<AccountBook[]> = await api.get('/account-books')
    return response.data || []
  },

  /**
   * 获取单个账本
   */
  getOne: async (id: string): Promise<AccountBook | null> => {
    const response: ApiResponse<AccountBook> = await api.get(`/account-books/${id}`)
    return response.data || null
  },

  /**
   * 创建账本
   */
  create: async (accountBook: Omit<AccountBook, 'id' | 'createdAt' | 'updatedAt'>): Promise<AccountBook> => {
    const response: ApiResponse<AccountBook> = await api.post('/account-books', accountBook)
    return response.data!
  },

  /**
   * 更新账本
   */
  update: async (id: string, accountBook: Partial<AccountBook>): Promise<AccountBook> => {
    const response: ApiResponse<AccountBook> = await api.put(`/account-books/${id}`, accountBook)
    return response.data!
  },

  /**
   * 删除账本
   */
  delete: async (id: string): Promise<void> => {
    await api.delete(`/account-books/${id}`)
  },

  /**
   * 设置默认账本
   */
  setDefault: async (id: string): Promise<AccountBook> => {
    const response: ApiResponse<AccountBook> = await api.put(`/account-books/${id}/set-default`)
    return response.data!
  },

  /**
   * 获取默认账本
   */
  getDefault: async (): Promise<AccountBook | null> => {
    const response: ApiResponse<AccountBook> = await api.get('/account-books/default')
    return response.data || null
  },

  /**
   * 获取账本统计
   */
  getStats: async (id: string, filters?: { startDate?: string; endDate?: string }): Promise<AccountBookStats> => {
    const response: ApiResponse<AccountBookStats> = await api.get(`/account-books/${id}/stats`, filters)
    return response.data!
  },
}
