import { create } from 'zustand'
import {
  FinanceConfig,
  Tag,
  AccountBook,
  Transaction,
} from './types'
import { transactionsApi } from '@/api/transactions'
import { accountBooksApi } from '@/api/accountBooks'
import { configApi } from '@/api/config'
import { tagsApi } from '@/api/tags'

interface FinanceStore {
  // 数据
  transactions: Transaction[]
  config: FinanceConfig | null
  tags: Tag[]
  accountBooks: AccountBook[]

  // UI 状态
  selectedAccountBookId: string | null

  // 加载状态
  isLoading: boolean

  // Actions
  loadData: () => Promise<void>
  setSelectedAccountBook: (accountBookId: string | null) => void

  // 配置相关
  updateConfig: (config: Partial<FinanceConfig>) => Promise<void>
  setCurrentAccountBook: (bookId: string | null) => Promise<void>

  // 标签相关
  addTag: (tag: Omit<Tag, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>
  updateTag: (id: string, tag: Partial<Tag>) => Promise<void>
  deleteTag: (id: string) => Promise<void>
  getCategoryTags: () => Tag[]
  getLabelTags: () => Tag[]
  getTagById: (id: string) => Tag | undefined
  getGlobalTags: () => Tag[]
  getTagsForAccountBook: (accountBookId: string | null) => Tag[]
  getCategoryTagsForAccountBook: (accountBookId: string | null) => Tag[]
  getLabelTagsForAccountBook: (accountBookId: string | null) => Tag[]

  // 账本相关
  addAccountBook: (book: Omit<AccountBook, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>
  updateAccountBook: (id: string, book: Partial<AccountBook>) => Promise<void>
  deleteAccountBook: (id: string) => Promise<void>
  setDefaultAccountBook: (id: string) => Promise<void>

  // 统一交易相关
  addTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>
  updateTransaction: (id: string, transaction: Partial<Transaction>) => Promise<void>
  deleteTransaction: (id: string) => Promise<void>
}

export const useFinanceStore = create<FinanceStore>((set, get) => ({
  transactions: [],
  config: null,
  tags: [],
  accountBooks: [],
  selectedAccountBookId: null,
  isLoading: true,

  // 加载所有数据
  loadData: async () => {
    try {
      const [
        transactions,
        config,
        tags,
        accountBooks,
      ] = await Promise.all([
        transactionsApi.getAll(),
        configApi.get(),
        tagsApi.getAll(),
        accountBooksApi.getAll(),
      ])

      set({
        transactions,
        config: config || null,
        tags,
        accountBooks,
        isLoading: false,
      })
    } catch (error) {
      console.error('Failed to load data:', error)
      set({ isLoading: false })
    }
  },

  // 更新配置
  updateConfig: async (configUpdate) => {
    const updated = await configApi.update(configUpdate)
    set({ config: updated })
  },

  // 设置当前账本
  setCurrentAccountBook: async (bookId) => {
    const updated = await configApi.setCurrentAccountBook(bookId)
    set({ config: updated })
  },

  // ===== 标签相关 =====
  addTag: async (tag) => {
    const newTag = await tagsApi.create(tag)
    set(state => ({
      tags: [...state.tags, newTag],
    }))
    return newTag.id
  },

  updateTag: async (id, tag) => {
    const updated = await tagsApi.update(id, tag)
    set(state => ({
      tags: state.tags.map(t => t.id === id ? updated : t),
    }))
  },

  deleteTag: async (id) => {
    const tagToDelete = get().tags.find(t => t.id === id)
    if (!tagToDelete) return

    if (tagToDelete.type === 'category') {
      // 分类标签：检查是否被使用
      const transactionsUsingCategory = get().transactions.filter(t => t.categoryTagId === id)
      if (transactionsUsingCategory.length > 0) {
        throw new Error(`无法删除分类标签"${tagToDelete.name}"：仍有 ${transactionsUsingCategory.length} 条交易在使用此分类`)
      }
    } else {
      // 普通标签：从所有使用该标签的交易中移除
      const transactionsWithLabel = get().transactions.filter(t =>
        t.labelTagIds?.includes(id)
      )

      for (const transaction of transactionsWithLabel) {
        await get().updateTransaction(transaction.id, {
          labelTagIds: transaction.labelTagIds?.filter(tagId => tagId !== id),
        })
      }
    }

    await tagsApi.delete(id)
    set(state => ({
      tags: state.tags.filter(t => t.id !== id),
    }))
  },

  getCategoryTags: () => {
    return get().tags.filter(t => t.type === 'category')
  },

  getLabelTags: () => {
    return get().tags.filter(t => t.type === 'label')
  },

  getTagById: (id) => {
    return get().tags.find(t => t.id === id)
  },

  getGlobalTags: () => {
    return get().tags.filter(t => !t.accountBookId)
  },

  getTagsForAccountBook: (accountBookId) => {
    return get().tags.filter(t => {
      const isGlobalTag = !t.accountBookId || t.accountBookId.trim() === ''
      return isGlobalTag || t.accountBookId === accountBookId
    })
  },

  getCategoryTagsForAccountBook: (accountBookId) => {
    return get().tags.filter(t => {
      if (t.type !== 'category') return false

      const normalizeId = (id: string | null | undefined): string | null => {
        if (id === null || id === undefined) return null
        const trimmed = id.trim()
        return trimmed === '' ? null : trimmed
      }

      const normalizedTagBookId = normalizeId(t.accountBookId)
      const normalizedFilterBookId = normalizeId(accountBookId)

      if (normalizedTagBookId === null) return true
      return normalizedTagBookId === normalizedFilterBookId
    })
  },

  getLabelTagsForAccountBook: (accountBookId) => {
    return get().tags.filter(t => {
      if (t.type !== 'label') return false

      const normalizeId = (id: string | null | undefined): string | null => {
        if (id === null || id === undefined) return null
        const trimmed = id.trim()
        return trimmed === '' ? null : trimmed
      }

      const normalizedTagBookId = normalizeId(t.accountBookId)
      const normalizedFilterBookId = normalizeId(accountBookId)

      if (normalizedTagBookId === null) return true
      return normalizedTagBookId === normalizedFilterBookId
    })
  },

  // ===== 账本相关 =====
  addAccountBook: async (book) => {
    const newBook = await accountBooksApi.create(book)

    set(state => ({
      accountBooks: [...state.accountBooks, newBook],
    }))

    // 如果这是第一个账本，自动设置为默认
    if (get().accountBooks.length === 1) {
      await get().setDefaultAccountBook(newBook.id)
    }

    return newBook.id
  },

  updateAccountBook: async (id, book) => {
    const updated = await accountBooksApi.update(id, book)

    set(state => ({
      accountBooks: state.accountBooks.map(b =>
        b.id === id ? updated : b
      ),
    }))
  },

  deleteAccountBook: async (id) => {
    const book = get().accountBooks.find(b => b.id === id)

    // 不允许删除默认账本
    if (book?.isDefault) {
      throw new Error('不能删除默认账本')
    }

    await accountBooksApi.delete(id)
    set(state => ({
      accountBooks: state.accountBooks.filter(b => b.id !== id),
    }))
  },

  setDefaultAccountBook: async (id) => {
    const oldAccountBooks = get().accountBooks

    // 乐观更新
    set(state => ({
      accountBooks: state.accountBooks.map(ab => ({
        ...ab,
        isDefault: ab.id === id,
      })),
    }))

    try {
      await accountBooksApi.setDefault(id)
      // Reload all account books to get the updated isDefault status
      const updatedAccountBooks = await accountBooksApi.getAll()
      set({ accountBooks: updatedAccountBooks })
      await get().updateConfig({ currentAccountBookId: id })
    } catch (error) {
      set({ accountBooks: oldAccountBooks })
      throw error
    }
  },

  // ===== 统一交易相关 =====
  addTransaction: async (transaction) => {
    const created = await transactionsApi.create(transaction)
    set(state => ({
      transactions: [...state.transactions, created]
    }))
    return created.id
  },

  updateTransaction: async (id, transaction) => {
    const updated = await transactionsApi.update(id, transaction)
    set(state => ({
      transactions: state.transactions.map(t => t.id === id ? updated : t)
    }))
  },

  deleteTransaction: async (id) => {
    await transactionsApi.delete(id)
    set(state => ({
      transactions: state.transactions.filter(t => t.id !== id)
    }))
  },

  // 设置选中的账本
  setSelectedAccountBook: (accountBookId) => {
    set({ selectedAccountBookId: accountBookId })
  },
}))
