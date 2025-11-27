import { api, ApiResponse } from './client'

/**
 * 统一交易API客户端
 * 处理所有交易类型（income, expense, investment）的API调用
 */

export type TransactionType = 'income' | 'expense' | 'investment'

export interface Transaction {
  id: string
  type: TransactionType
  subType?: string
  date: string
  categoryTagId: string
  amount: number
  description: string
  accountBookId?: string
  note?: string

  // Expense特有字段
  needsReimbursement?: boolean
  labelTagIds?: string[]
  receiptPhoto?: string
  location?: string

  // Investment特有字段（通过metadata存储）
  metadata?: {
    status?: 'holding' | 'sold'
    purchaseDate?: string
    name?: string
    originalType?: string
    originalStatus?: string
    originalId?: string
  }

  // 关联数据
  accountBook?: any
  categoryTag?: any
  reimbursement?: any

  createdAt: string
  updatedAt: string
}

export interface TransactionFilters {
  type?: TransactionType
  accountBookId?: string
  categoryTagId?: string
  startDate?: string
  endDate?: string
  needsReimbursement?: boolean
}

export interface TransactionStats {
  totalIncome: number
  totalExpense: number
  totalInvestment: number
  balance: number
  byCategory: Array<{
    categoryId: string
    categoryName: string
    total: number
    count: number
  }>
  byMonth: Array<{
    month: string
    income: number
    expense: number
    investment: number
  }>
}

export const transactionsApi = {
  /**
   * 获取所有交易（支持筛选）
   */
  getAll: async (filters?: TransactionFilters): Promise<Transaction[]> => {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, String(value))
        }
      })
    }

    // 添加大的分页参数以获取所有数据
    params.append('page', '1')
    params.append('pageSize', '1000')

    const response: ApiResponse<any> = await api.get(
      `/v1/transactions${params.toString() ? `?${params.toString()}` : ''}`
    )

    // 处理分页响应格式 { data: [...], pagination: {...} }
    if (response.data && typeof response.data === 'object' && 'data' in response.data) {
      return response.data.data || []
    }

    // 兼容直接返回数组的格式
    return response.data || []
  },

  /**
   * 获取单个交易
   */
  getOne: async (id: string): Promise<Transaction | null> => {
    const response: ApiResponse<Transaction> = await api.get(`/transactions/${id}`)
    return response.data || null
  },

  /**
   * 创建交易
   */
  create: async (transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction> => {
    const response: ApiResponse<Transaction> = await api.post('/transactions', transaction)
    return response.data!
  },

  /**
   * 更新交易
   */
  update: async (id: string, transaction: Partial<Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Transaction> => {
    const response: ApiResponse<Transaction> = await api.put(`/transactions/${id}`, transaction)
    return response.data!
  },

  /**
   * 删除交易
   */
  delete: async (id: string): Promise<void> => {
    await api.delete(`/transactions/${id}`)
  },

  /**
   * 获取交易统计
   */
  getStats: async (filters?: TransactionFilters): Promise<TransactionStats> => {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, String(value))
        }
      })
    }

    const response: ApiResponse<TransactionStats> = await api.get(
      `/transactions/stats${params.toString() ? `?${params.toString()}` : ''}`
    )
    return response.data!
  },

  /**
   * 按日期范围获取分组交易
   */
  getGrouped: async (startDate: string, endDate: string, accountBookId?: string) => {
    const params = new URLSearchParams({
      startDate,
      endDate,
    })
    if (accountBookId) {
      params.append('accountBookId', accountBookId)
    }

    const response: ApiResponse<any> = await api.get(`/transactions/grouped?${params.toString()}`)
    return response.data!
  },

  /**
   * 批量创建交易（用于数据迁移）
   */
  createMany: async (transactions: Array<Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>>) => {
    const response: ApiResponse<{ count: number }> = await api.post('/transactions/bulk', {
      transactions
    })
    return response.data!
  }
}

// 类型转换辅助函数
export const convertToTransaction = (
  type: TransactionType,
  data: any
): Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'> => {
  const base = {
    type,
    date: data.date,
    categoryTagId: data.categoryTagId || data.category,
    amount: data.amount,
    description: data.description || data.name || '',
    accountBookId: data.accountBookId,
    note: data.note,
  }

  switch (type) {
    case 'expense':
      return {
        ...base,
        needsReimbursement: data.needsReimbursement,
        labelTagIds: data.labelTagIds || data.tags || [],
        receiptPhoto: data.receiptPhoto,
        location: data.location,
      }

    case 'income':
      return base

    case 'investment':
      return {
        ...base,
        subType: data.type || 'fixed_income',
        metadata: {
          name: data.name,
          status: data.status || 'holding',
          purchaseDate: data.purchaseDate || data.date,
        }
      }

    default:
      return base
  }
}

export default transactionsApi