import { api, ApiResponse } from './client'
import type { CreditAccount } from '../store/types'

/**
 * 信用账户 API
 */

export interface CreditAccountFilters {
  accountBookId?: string
  status?: string
  type?: string
}

export interface RepaymentRequest {
  amount: number
  note?: string
  relatedExpenseId?: string
}

export interface DebtIncreaseRequest {
  amount: number
  note?: string
}

export const creditAccountsApi = {
  /**
   * 获取所有信用账户
   */
  getAll: async (filters?: CreditAccountFilters): Promise<CreditAccount[]> => {
    const response: ApiResponse<CreditAccount[]> = await api.get('/credit-accounts', filters)
    return response.data || []
  },

  /**
   * 获取单个信用账户
   */
  getOne: async (id: string): Promise<CreditAccount | null> => {
    const response: ApiResponse<CreditAccount> = await api.get(`/credit-accounts/${id}`)
    return response.data || null
  },

  /**
   * 创建信用账户
   */
  create: async (
    creditAccount: Omit<CreditAccount, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<CreditAccount> => {
    const response: ApiResponse<CreditAccount> = await api.post(
      '/credit-accounts',
      creditAccount
    )
    return response.data!
  },

  /**
   * 更新信用账户
   */
  update: async (id: string, creditAccount: Partial<CreditAccount>): Promise<CreditAccount> => {
    const response: ApiResponse<CreditAccount> = await api.put(
      `/credit-accounts/${id}`,
      creditAccount
    )
    return response.data!
  },

  /**
   * 删除信用账户
   */
  delete: async (id: string): Promise<void> => {
    await api.delete(`/credit-accounts/${id}`)
  },

  /**
   * 记录还款
   */
  recordRepayment: async (
    id: string,
    request: RepaymentRequest
  ): Promise<CreditAccount> => {
    const response: ApiResponse<CreditAccount> = await api.post(
      `/credit-accounts/${id}/repayment`,
      request
    )
    return response.data!
  },

  /**
   * 增加债务
   */
  increaseDebt: async (
    id: string,
    request: DebtIncreaseRequest
  ): Promise<CreditAccount> => {
    const response: ApiResponse<CreditAccount> = await api.post(
      `/credit-accounts/${id}/increase-debt`,
      request
    )
    return response.data!
  },

  /**
   * 获取债务变更历史
   */
  getDebtLogs: async (id: string): Promise<any[]> => {
    const response: ApiResponse<any[]> = await api.get(`/credit-accounts/${id}/debt-logs`)
    return response.data || []
  },
}
