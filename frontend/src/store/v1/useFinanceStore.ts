/**
 * V1 财务管理状态存储
 * 基于 Zustand 的简化状态管理
 */

import { create } from 'zustand'
import { accountBookApi, transactionApi, tagApi, statisticsApi } from '../../api/v1'
import type {
  AccountBook,
  CreateAccountBookInput,
  UpdateAccountBookInput,
  Transaction,
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionFilters,
  Tag,
  CreateTagInput,
  UpdateTagInput,
  MonthlyStats,
  CategoryStats,
  TrendData,
} from '../../types/v1'

interface FinanceState {
  // 账本状态
  accountBooks: AccountBook[]
  currentAccountBook: AccountBook | null
  isLoadingAccountBooks: boolean

  // 交易状态
  transactions: Transaction[]
  transactionPagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
  isLoadingTransactions: boolean

  // 标签状态
  tags: Tag[]
  categoryTags: Tag[]
  labelTags: Tag[]
  isLoadingTags: boolean

  // 统计状态
  monthlyStats: MonthlyStats | null
  categoryStats: CategoryStats[]
  trendData: TrendData[]
  isLoadingStats: boolean

  // 错误状态
  error: string | null

  // 账本操作
  fetchAccountBooks: () => Promise<void>
  fetchDefaultAccountBook: () => Promise<void>
  createAccountBook: (data: CreateAccountBookInput) => Promise<AccountBook>
  updateAccountBook: (id: string, data: UpdateAccountBookInput) => Promise<AccountBook>
  deleteAccountBook: (id: string) => Promise<void>
  setDefaultAccountBook: (id: string) => Promise<void>
  setCurrentAccountBook: (accountBook: AccountBook) => void

  // 交易操作
  fetchTransactions: (filters?: TransactionFilters) => Promise<void>
  createTransaction: (data: CreateTransactionInput) => Promise<Transaction>
  updateTransaction: (id: string, data: UpdateTransactionInput) => Promise<Transaction>
  deleteTransaction: (id: string) => Promise<void>

  // 标签操作
  fetchTags: (accountBookId?: string) => Promise<void>
  createTag: (data: CreateTagInput) => Promise<Tag>
  updateTag: (id: string, data: UpdateTagInput) => Promise<Tag>
  deleteTag: (id: string) => Promise<void>
  createDefaultTags: () => Promise<void>

  // 统计操作
  fetchMonthlyStats: (year?: number, month?: number) => Promise<void>
  fetchCategoryStats: (type?: 'income' | 'expense', startDate?: string, endDate?: string) => Promise<void>
  fetchTrendData: (months?: number) => Promise<void>

  // 工具方法
  clearError: () => void
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  // 初始状态
  accountBooks: [],
  currentAccountBook: null,
  isLoadingAccountBooks: false,
  transactions: [],
  transactionPagination: {
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 0,
  },
  isLoadingTransactions: false,
  tags: [],
  categoryTags: [],
  labelTags: [],
  isLoadingTags: false,
  monthlyStats: null,
  categoryStats: [],
  trendData: [],
  isLoadingStats: false,
  error: null,

  // =========================================================================
  // 账本操作
  // =========================================================================

  fetchAccountBooks: async () => {
    set({ isLoadingAccountBooks: true, error: null })
    try {
      const response = await accountBookApi.getAll()
      set({ accountBooks: response.data })

      // 如果没有当前账本，设置默认账本
      const { currentAccountBook } = get()
      if (!currentAccountBook && response.data.length > 0) {
        const defaultBook = response.data.find((b) => b.isDefault) || response.data[0]
        set({ currentAccountBook: defaultBook })
      }
    } catch (error: any) {
      set({ error: error.response?.data?.error || '获取账本列表失败' })
    } finally {
      set({ isLoadingAccountBooks: false })
    }
  },

  fetchDefaultAccountBook: async () => {
    set({ isLoadingAccountBooks: true, error: null })
    try {
      const response = await accountBookApi.getDefault()
      set({ currentAccountBook: response.data })
    } catch (error: any) {
      set({ error: error.response?.data?.error || '获取默认账本失败' })
    } finally {
      set({ isLoadingAccountBooks: false })
    }
  },

  createAccountBook: async (data) => {
    try {
      const response = await accountBookApi.create(data)
      set((state) => ({
        accountBooks: [...state.accountBooks, response.data],
      }))
      return response.data
    } catch (error: any) {
      set({ error: error.response?.data?.error || '创建账本失败' })
      throw error
    }
  },

  updateAccountBook: async (id, data) => {
    try {
      const response = await accountBookApi.update(id, data)
      set((state) => ({
        accountBooks: state.accountBooks.map((b) =>
          b.id === id ? response.data : b
        ),
        currentAccountBook:
          state.currentAccountBook?.id === id
            ? response.data
            : state.currentAccountBook,
      }))
      return response.data
    } catch (error: any) {
      set({ error: error.response?.data?.error || '更新账本失败' })
      throw error
    }
  },

  deleteAccountBook: async (id) => {
    try {
      await accountBookApi.delete(id)
      set((state) => ({
        accountBooks: state.accountBooks.filter((b) => b.id !== id),
      }))
    } catch (error: any) {
      set({ error: error.response?.data?.error || '删除账本失败' })
      throw error
    }
  },

  setDefaultAccountBook: async (id) => {
    try {
      const response = await accountBookApi.setDefault(id)
      set({ accountBooks: response.data })
    } catch (error: any) {
      set({ error: error.response?.data?.error || '设置默认账本失败' })
      throw error
    }
  },

  setCurrentAccountBook: (accountBook) => {
    set({ currentAccountBook: accountBook })
  },

  // =========================================================================
  // 交易操作
  // =========================================================================

  fetchTransactions: async (filters) => {
    const { currentAccountBook } = get()
    if (!currentAccountBook) return

    set({ isLoadingTransactions: true, error: null })
    try {
      const response = await transactionApi.getAll({
        accountBookId: currentAccountBook.id,
        ...filters,
      })
      set({
        transactions: response.data.data,
        transactionPagination: response.data.pagination,
      })
    } catch (error: any) {
      set({ error: error.response?.data?.error || '获取交易列表失败' })
    } finally {
      set({ isLoadingTransactions: false })
    }
  },

  createTransaction: async (data) => {
    try {
      const response = await transactionApi.create(data)
      set((state) => ({
        transactions: [response.data, ...state.transactions],
      }))
      // 刷新账本余额
      await get().fetchAccountBooks()
      return response.data
    } catch (error: any) {
      set({ error: error.response?.data?.error || '创建交易失败' })
      throw error
    }
  },

  updateTransaction: async (id, data) => {
    try {
      const response = await transactionApi.update(id, data)
      set((state) => ({
        transactions: state.transactions.map((t) =>
          t.id === id ? response.data : t
        ),
      }))
      // 刷新账本余额
      await get().fetchAccountBooks()
      return response.data
    } catch (error: any) {
      set({ error: error.response?.data?.error || '更新交易失败' })
      throw error
    }
  },

  deleteTransaction: async (id) => {
    try {
      await transactionApi.delete(id)
      set((state) => ({
        transactions: state.transactions.filter((t) => t.id !== id),
      }))
      // 刷新账本余额
      await get().fetchAccountBooks()
    } catch (error: any) {
      set({ error: error.response?.data?.error || '删除交易失败' })
      throw error
    }
  },

  // =========================================================================
  // 标签操作
  // =========================================================================

  fetchTags: async (accountBookId) => {
    const { currentAccountBook } = get()
    const bookId = accountBookId || currentAccountBook?.id
    if (!bookId) return

    set({ isLoadingTags: true, error: null })
    try {
      const response = await tagApi.getAvailable(bookId)
      const tags = response.data
      set({
        tags,
        categoryTags: tags.filter((t) => t.tagType === 'category'),
        labelTags: tags.filter((t) => t.tagType === 'label'),
      })
    } catch (error: any) {
      set({ error: error.response?.data?.error || '获取标签列表失败' })
    } finally {
      set({ isLoadingTags: false })
    }
  },

  createTag: async (data) => {
    try {
      const response = await tagApi.create(data)
      set((state) => {
        const newTags = [...state.tags, response.data]
        return {
          tags: newTags,
          categoryTags: newTags.filter((t) => t.tagType === 'category'),
          labelTags: newTags.filter((t) => t.tagType === 'label'),
        }
      })
      return response.data
    } catch (error: any) {
      set({ error: error.response?.data?.error || '创建标签失败' })
      throw error
    }
  },

  updateTag: async (id, data) => {
    try {
      const response = await tagApi.update(id, data)
      set((state) => {
        const newTags = state.tags.map((t) => (t.id === id ? response.data : t))
        return {
          tags: newTags,
          categoryTags: newTags.filter((t) => t.tagType === 'category'),
          labelTags: newTags.filter((t) => t.tagType === 'label'),
        }
      })
      return response.data
    } catch (error: any) {
      set({ error: error.response?.data?.error || '更新标签失败' })
      throw error
    }
  },

  deleteTag: async (id) => {
    try {
      await tagApi.delete(id)
      set((state) => {
        const newTags = state.tags.filter((t) => t.id !== id)
        return {
          tags: newTags,
          categoryTags: newTags.filter((t) => t.tagType === 'category'),
          labelTags: newTags.filter((t) => t.tagType === 'label'),
        }
      })
    } catch (error: any) {
      set({ error: error.response?.data?.error || '删除标签失败' })
      throw error
    }
  },

  createDefaultTags: async () => {
    try {
      await tagApi.createDefaults()
      await get().fetchTags()
    } catch (error: any) {
      set({ error: error.response?.data?.error || '创建默认标签失败' })
      throw error
    }
  },

  // =========================================================================
  // 统计操作
  // =========================================================================

  fetchMonthlyStats: async (year, month) => {
    const { currentAccountBook } = get()
    if (!currentAccountBook) return

    set({ isLoadingStats: true, error: null })
    try {
      const response = await statisticsApi.getMonthly({
        accountBookId: currentAccountBook.id,
        year,
        month,
      })
      set({ monthlyStats: response.data })
    } catch (error: any) {
      set({ error: error.response?.data?.error || '获取月度统计失败' })
    } finally {
      set({ isLoadingStats: false })
    }
  },

  fetchCategoryStats: async (type, startDate, endDate) => {
    const { currentAccountBook } = get()
    if (!currentAccountBook) return

    set({ isLoadingStats: true, error: null })
    try {
      const response = await statisticsApi.getCategory({
        accountBookId: currentAccountBook.id,
        type,
        startDate,
        endDate,
      })
      set({ categoryStats: response.data })
    } catch (error: any) {
      set({ error: error.response?.data?.error || '获取分类统计失败' })
    } finally {
      set({ isLoadingStats: false })
    }
  },

  fetchTrendData: async (months) => {
    const { currentAccountBook } = get()
    if (!currentAccountBook) return

    set({ isLoadingStats: true, error: null })
    try {
      const response = await statisticsApi.getTrend({
        accountBookId: currentAccountBook.id,
        months,
      })
      set({ trendData: response.data })
    } catch (error: any) {
      set({ error: error.response?.data?.error || '获取趋势数据失败' })
    } finally {
      set({ isLoadingStats: false })
    }
  },

  // =========================================================================
  // 工具方法
  // =========================================================================

  clearError: () => set({ error: null }),
}))

export default useFinanceStore
