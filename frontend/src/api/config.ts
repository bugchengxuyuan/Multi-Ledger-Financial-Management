import { api, ApiResponse } from './client'
import type { FinanceConfig } from '../store/types'

/**
 * 配置 API
 */

export const configApi = {
  /**
   * 获取配置
   */
  get: async (): Promise<FinanceConfig> => {
    const response: ApiResponse<FinanceConfig> = await api.get('/config')
    return response.data || {
      id: 'main',
      creditLimit: 0,
      salary: 0,
      salaryDate: '每月1日',
      creditDueDate: '每月15日',
      investmentCapital: 0,
      currentAccountBookId: undefined,
    }
  },

  /**
   * 更新配置
   */
  update: async (config: Partial<FinanceConfig>): Promise<FinanceConfig> => {
    const response: ApiResponse<FinanceConfig> = await api.put('/config', config)
    return response.data!
  },

  /**
   * 设置当前账本
   */
  setCurrentAccountBook: async (accountBookId: string | null): Promise<FinanceConfig> => {
    const response: ApiResponse<FinanceConfig> = await api.put('/config/current-account-book', {
      accountBookId,
    })
    return response.data!
  },

  /**
   * 获取当前账本
   */
  getCurrentAccountBook: async (): Promise<any | null> => {
    const response: ApiResponse<any> = await api.get('/config/current-account-book')
    return response.data || null
  },
}
