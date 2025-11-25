import { api, ApiResponse } from './client'
import type { BalanceLog } from '../store/types'

/**
 * 余额 API
 */

export interface BalanceDetail {
  accountBook: {
    id: string
    name: string
    icon: string
    initialBalance: number
    currentBalance: number
    balanceMode: string
  }
  recentLogs: BalanceLog[]
}

export interface BalanceStats {
  accountBookId: string
  accountBookName: string
  initialBalance: number | string
  currentBalance: number | string
  totalIncome: number | string
  totalExpense: number
  logCount: number
}

export interface BalanceLogsResult {
  logs: BalanceLog[]
  total: number
  limit: number
  offset: number
}

export const balanceApi = {
  /**
   * 获取账本余额详情
   */
  getBalance: async (accountBookId: string): Promise<BalanceDetail> => {
    const response: ApiResponse<BalanceDetail> = await api.get(
      `/account-books/${accountBookId}/balance`
    )
    return response.data!
  },

  /**
   * 手动调整余额
   */
  adjustBalance: async (
    accountBookId: string,
    newBalance: number,
    note?: string
  ): Promise<any> => {
    const response: ApiResponse<any> = await api.put(
      `/account-books/${accountBookId}/balance/adjust`,
      { newBalance, note }
    )
    return response.data!
  },

  /**
   * 设置初始余额
   */
  setInitialBalance: async (accountBookId: string, initialBalance: number): Promise<any> => {
    const response: ApiResponse<any> = await api.post(
      `/account-books/${accountBookId}/balance/init`,
      { initialBalance }
    )
    return response.data!
  },

  /**
   * 获取余额变动历史
   */
  getBalanceLogs: async (
    accountBookId: string,
    filters?: {
      startDate?: string
      endDate?: string
      changeType?: string
      limit?: number
      offset?: number
    }
  ): Promise<BalanceLogsResult> => {
    const response: ApiResponse<BalanceLogsResult> = await api.get(
      `/account-books/${accountBookId}/balance/logs`,
      filters
    )
    return response.data!
  },

  /**
   * 获取余额统计
   */
  getBalanceStats: async (accountBookId: string): Promise<BalanceStats> => {
    const response: ApiResponse<BalanceStats> = await api.get(
      `/account-books/${accountBookId}/balance/stats`
    )
    return response.data!
  },
}
