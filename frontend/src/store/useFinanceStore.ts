import { create } from 'zustand'
import {
  Expense,
  Reimbursement,
  Investment,
  FinanceConfig,
  FinanceStats,
  Tag,
  AccountBook,
  Budget,
  ExpenseTemplate,
  RecurringExpense,
  CreditAccount,
  Transaction,
  transactionToExpense,
  transactionToIncome,
  transactionToInvestment,
  Income
} from './types'
import { db } from '@/db/database'
import { transactionsApi } from '@/api/transactions'
import { expensesApi } from '@/api/expenses'
import { reimbursementsApi } from '@/api/reimbursements'
import { investmentsApi } from '@/api/investments'
import { accountBooksApi } from '@/api/accountBooks'
import { budgetsApi } from '@/api/budgets'
import { configApi } from '@/api/config'
import { creditAccountsApi } from '@/api/creditAccounts'
import { tagsApi } from '@/api/tags'
import { toNumber } from '@/utils/formatters'
import { addMonths, isAfter, isBefore, differenceInDays, format } from 'date-fns'

interface FinanceStore {
  // 数据
  expenses: Expense[]
  reimbursements: Reimbursement[]
  investments: Investment[]
  config: FinanceConfig | null
  tags: Tag[]
  accountBooks: AccountBook[]
  budgets: Budget[]
  expenseTemplates: ExpenseTemplate[]
  recurringExpenses: RecurringExpense[]
  creditAccounts: CreditAccount[]

  // UI 状态
  selectedAccountBookId: string | null  // null表示"全部账本"

  // 统计
  stats: FinanceStats | null

  // 加载状态
  isLoading: boolean

  // Actions
  loadData: () => Promise<void>
  calculateStats: () => void
  setSelectedAccountBook: (accountBookId: string | null) => void

  // 支出相关
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>
  updateExpense: (id: string, expense: Partial<Expense>) => Promise<void>
  deleteExpense: (id: string) => Promise<void>

  // 报销相关
  addReimbursement: (reimb: Omit<Reimbursement, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>
  updateReimbursement: (id: string, reimb: Partial<Reimbursement>) => Promise<void>
  deleteReimbursement: (id: string) => Promise<void>

  // 投资相关
  addInvestment: (inv: Omit<Investment, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateInvestment: (id: string, inv: Partial<Investment>) => Promise<void>
  deleteInvestment: (id: string) => Promise<void>

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

  // 预算相关
  addBudget: (budget: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>
  updateBudget: (id: string, budget: Partial<Budget>) => Promise<void>
  deleteBudget: (id: string) => Promise<void>

  // 支出模板相关
  addExpenseTemplate: (template: Omit<ExpenseTemplate, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>
  updateExpenseTemplate: (id: string, template: Partial<ExpenseTemplate>) => Promise<void>
  deleteExpenseTemplate: (id: string) => Promise<void>

  // 周期性支出相关
  addRecurringExpense: (recurring: Omit<RecurringExpense, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>
  updateRecurringExpense: (id: string, recurring: Partial<RecurringExpense>) => Promise<void>
  deleteRecurringExpense: (id: string) => Promise<void>
  executeRecurringExpense: (id: string) => Promise<void>
  checkAndExecuteRecurring: () => Promise<void>

  // 信用账户相关
  addCreditAccount: (account: Omit<CreditAccount, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>
  updateCreditAccount: (id: string, account: Partial<CreditAccount>) => Promise<void>
  deleteCreditAccount: (id: string) => Promise<void>
  recordRepayment: (creditAccountId: string, amount: number, note?: string) => Promise<void>
  getUpcomingRepayments: (daysAhead?: number) => Array<{
    creditAccountId: string
    accountName: string
    dueDate: string
    amount: number
    daysUntil: number
  }>

  // ===== 统一交易相关（新增） =====
  transactions: Transaction[]
  incomes: Income[]  // 从后端API加载的Income数据

  // 加载统一交易数据
  loadTransactions: () => Promise<void>

  // 统一交易CRUD
  addTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>
  updateTransaction: (id: string, transaction: Partial<Transaction>) => Promise<void>
  deleteTransaction: (id: string) => Promise<void>

  // 从transactions派生数据（辅助方法）
  getExpensesFromTransactions: () => Expense[]
  getIncomesFromTransactions: () => Income[]
  getInvestmentsFromTransactions: () => Investment[]
}

export const useFinanceStore = create<FinanceStore>((set, get) => ({
  expenses: [],
  reimbursements: [],
  investments: [],
  config: null,
  tags: [],
  accountBooks: [],
  budgets: [],
  expenseTemplates: [],
  recurringExpenses: [],
  creditAccounts: [],
  transactions: [],  // 新增：统一交易数据
  incomes: [],      // 新增：收入数据
  selectedAccountBookId: null,  // 新增：选中的账本ID，null表示全部账本
  stats: null,
  isLoading: true,

  // 加载所有数据
  loadData: async () => {
    try {
      const [
        expenses,
        reimbursements,
        investments,
        transactions,  // 新增：统一交易数据
        config,
        tags,
        accountBooks,
        budgets,
        expenseTemplates,
        recurringExpenses,
        creditAccounts
      ] = await Promise.all([
        expensesApi.getAll(),
        reimbursementsApi.getAll(),
        investmentsApi.getAll(),
        transactionsApi.getAll(),  // 新增：加载统一交易数据
        configApi.get(),
        tagsApi.getAll(), // Tags from backend
        accountBooksApi.getAll(),
        budgetsApi.getAll(),
        db.expenseTemplates.toArray(), // Templates still use Dexie
        db.recurringExpenses.toArray(), // Recurring still use Dexie
        creditAccountsApi.getAll(), // Credit accounts from backend
      ])

      // 向后兼容：迁移旧字段名到新字段名
      let finalConfig = config
      if (config) {
        const needsMigration = (config as any).jiebeiTotal !== undefined || (config as any).jiebeiDueDate !== undefined

        if (needsMigration) {
          const migratedConfig = {
            ...config,
            creditLimit: (config as any).jiebeiTotal || config.creditLimit || 10000,
            creditDueDate: (config as any).jiebeiDueDate || config.creditDueDate || '2025-12-09',
          }

          // 更新到新格式
          await configApi.update(migratedConfig)
          finalConfig = migratedConfig
        }
      }

      set({
        expenses,
        reimbursements,
        investments,
        transactions,  // 新增：设置统一交易数据
        config: finalConfig || null,
        tags,
        accountBooks,
        budgets,
        expenseTemplates,
        recurringExpenses,
        creditAccounts,
        isLoading: false,
      })

      get().calculateStats()

      // 检查并执行周期性支出
      await get().checkAndExecuteRecurring()
    } catch (error) {
      console.error('Failed to load data:', error)
      set({ isLoading: false })
    }
  },

  // 计算统计数据
  calculateStats: () => {
    const { expenses, reimbursements, investments, config, creditAccounts } = get()

    if (!config) return

    // 使用安全转换，避免 NaN（backend returns as strings from Decimal type）
    const totalSpent = expenses.reduce((sum, exp) => sum + toNumber(exp.amount), 0)
    const creditLimit = toNumber(config.creditLimit, 10000) // 默认 10000
    const salary = toNumber(config.salary, 5000) // 默认 5000
    const investmentCapital = toNumber(config.investmentCapital, 5000) // 默认 5000

    const availableCredit = creditLimit - totalSpent
    const mustKeep = creditLimit - salary
    const safeToSpend = availableCredit - mustKeep

    const totalInvestment = investments
      .filter(inv => inv.status === 'holding')
      .reduce((sum, inv) => sum + toNumber(inv.amount), 0)
    const remainingInvestment = investmentCapital - totalInvestment

    const pendingReimbursement = reimbursements
      .filter(reimb => reimb.status === 'pending')
      .reduce((sum, reimb) => sum + toNumber(reimb.amount), 0)

    // 计算债务指标
    const totalDebt = creditAccounts
      .filter(acc => acc.status === 'active')
      .reduce((sum, acc) => sum + toNumber(acc.currentDebt), 0)

    const monthlyRepayment = toNumber(config.salary, 0) * 0.1 // 默认为工资的10%

    const upcomingRepayments = get().getUpcomingRepayments(30)

    set({
      stats: {
        totalSpent,
        availableCredit,
        mustKeep,
        safeToSpend,
        totalInvestment,
        remainingInvestment,
        pendingReimbursement,
        totalDebt,
        monthlyRepayment,
        upcomingRepayments,
      },
    })
  },

  // 添加支出
  addExpense: async (expense) => {
    const newExpense = await expensesApi.create(expense)

    set(state => ({
      expenses: [...state.expenses, newExpense],
    }))
    get().calculateStats()
    return newExpense.id
  },

  // 更新支出
  updateExpense: async (id, expense) => {
    const updated = await expensesApi.update(id, expense)

    set(state => ({
      expenses: state.expenses.map(exp =>
        exp.id === id ? updated : exp
      ),
    }))
    get().calculateStats()
  },

  // 删除支出
  deleteExpense: async (id) => {
    const expense = get().expenses.find(exp => exp.id === id)

    // 如果有关联的报销记录，先删除它
    if (expense?.reimbursementId) {
      await reimbursementsApi.delete(expense.reimbursementId)
      set(state => ({
        reimbursements: state.reimbursements.filter(r => r.id !== expense.reimbursementId),
      }))
    }

    await expensesApi.delete(id)
    set(state => ({
      expenses: state.expenses.filter(exp => exp.id !== id),
    }))

    get().calculateStats()
  },

  // 添加报销
  addReimbursement: async (reimb) => {
    const newReimb = await reimbursementsApi.create(reimb)

    set(state => ({
      reimbursements: [...state.reimbursements, newReimb],
    }))

    // 如果关联了支出记录，更新支出记录的 reimbursementId
    if (newReimb.expenseId) {
      await get().updateExpense(newReimb.expenseId, {
        reimbursementId: newReimb.id,
      })
    }

    get().calculateStats()
    return newReimb.id
  },

  // 更新报销
  updateReimbursement: async (id, reimb) => {
    const updated = await reimbursementsApi.update(id, reimb)

    set(state => ({
      reimbursements: state.reimbursements.map(r =>
        r.id === id ? updated : r
      ),
    }))
    get().calculateStats()
  },

  // 删除报销
  deleteReimbursement: async (id) => {
    const reimbursement = get().reimbursements.find(r => r.id === id)

    // 如果有关联的支出记录，清除其 reimbursementId 和 needsReimbursement
    if (reimbursement?.expenseId) {
      await expensesApi.update(reimbursement.expenseId, {
        reimbursementId: undefined,
        needsReimbursement: false,
      })
      set(state => ({
        expenses: state.expenses.map(exp =>
          exp.id === reimbursement.expenseId
            ? { ...exp, reimbursementId: undefined, needsReimbursement: false }
            : exp
        ),
      }))
    }

    await reimbursementsApi.delete(id)
    set(state => ({
      reimbursements: state.reimbursements.filter(r => r.id !== id),
    }))
    get().calculateStats()
  },

  // 添加投资
  addInvestment: async (inv) => {
    const newInv = await investmentsApi.create(inv)

    set(state => ({
      investments: [...state.investments, newInv],
    }))
    get().calculateStats()
  },

  // 更新投资
  updateInvestment: async (id, inv) => {
    const updated = await investmentsApi.update(id, inv)

    set(state => ({
      investments: state.investments.map(i =>
        i.id === id ? updated : i
      ),
    }))
    get().calculateStats()
  },

  // 删除投资
  deleteInvestment: async (id) => {
    await investmentsApi.delete(id)
    set(state => ({
      investments: state.investments.filter(i => i.id !== id),
    }))
    get().calculateStats()
  },

  // 更新配置
  updateConfig: async (configUpdate) => {
    const updated = await configApi.update(configUpdate)
    set({ config: updated })
    get().calculateStats()
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
      const expensesUsingCategory = get().expenses.filter(exp => exp.categoryTagId === id)
      const budgetsUsingCategory = get().budgets.filter(b => b.categoryTagId === id)
      const templatesUsingCategory = get().expenseTemplates.filter(t => t.categoryTagId === id)
      const recurringUsingCategory = get().recurringExpenses.filter(r => r.categoryTagId === id)

      const totalUsage = expensesUsingCategory.length + budgetsUsingCategory.length +
                         templatesUsingCategory.length + recurringUsingCategory.length

      if (totalUsage > 0) {
        throw new Error(`无法删除分类标签"${tagToDelete.name}"：仍有 ${totalUsage} 条记录在使用此分类`)
      }
    } else {
      // 普通标签：从所有使用该标签的支出中移除
      const expensesWithLabel = get().expenses.filter(exp =>
        exp.labelTagIds?.includes(id)
      )

      for (const expense of expensesWithLabel) {
        await get().updateExpense(expense.id, {
          labelTagIds: expense.labelTagIds?.filter(tagId => tagId !== id),
        })
      }

      // 同时从模板中移除
      const templatesWithLabel = get().expenseTemplates.filter(t =>
        t.labelTagIds?.includes(id)
      )

      for (const template of templatesWithLabel) {
        await get().updateExpenseTemplate(template.id, {
          labelTagIds: template.labelTagIds?.filter(tagId => tagId !== id),
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
      // 严格检查是否为全局标签（null、undefined 或空字符串）
      const isGlobalTag = !t.accountBookId || t.accountBookId.trim() === ''
      return isGlobalTag || t.accountBookId === accountBookId
    })
  },

  getCategoryTagsForAccountBook: (accountBookId) => {
    return get().tags.filter(t => {
      // 只处理分类标签
      if (t.type !== 'category') return false

      // 标准化处理：将 null、undefined、空字符串、纯空格 统一视为 "空值"
      const normalizeId = (id: string | null | undefined): string | null => {
        if (id === null || id === undefined) return null
        const trimmed = id.trim()
        return trimmed === '' ? null : trimmed
      }

      const normalizedTagBookId = normalizeId(t.accountBookId)
      const normalizedFilterBookId = normalizeId(accountBookId)

      // 全局标签（accountBookId 为 null）显示在所有账本
      if (normalizedTagBookId === null) return true

      // 账本专属标签：必须精确匹配（标准化后）
      return normalizedTagBookId === normalizedFilterBookId
    })
  },

  getLabelTagsForAccountBook: (accountBookId) => {
    return get().tags.filter(t => {
      // 只处理普通标签
      if (t.type !== 'label') return false

      // 标准化处理：将 null、undefined、空字符串、纯空格 统一视为 "空值"
      const normalizeId = (id: string | null | undefined): string | null => {
        if (id === null || id === undefined) return null
        const trimmed = id.trim()
        return trimmed === '' ? null : trimmed
      }

      const normalizedTagBookId = normalizeId(t.accountBookId)
      const normalizedFilterBookId = normalizeId(accountBookId)

      // 全局标签（accountBookId 为 null）显示在所有账本
      if (normalizedTagBookId === null) return true

      // 账本专属标签：必须精确匹配（标准化后）
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

    // 删除账本时，将该账本下的所有支出移到默认账本
    const defaultBook = get().accountBooks.find(b => b.isDefault)
    if (defaultBook) {
      const expensesInBook = get().expenses.filter(exp => exp.accountBookId === id)
      for (const expense of expensesInBook) {
        await get().updateExpense(expense.id, {
          accountBookId: defaultBook.id,
        })
      }
    }

    await accountBooksApi.delete(id)
    set(state => ({
      accountBooks: state.accountBooks.filter(b => b.id !== id),
    }))
  },

  setDefaultAccountBook: async (id) => {
    await accountBooksApi.setDefault(id)

    // Reload account books to get updated state
    const accountBooks = await accountBooksApi.getAll()
    set({ accountBooks })

    // 更新配置
    await get().updateConfig({ currentAccountBookId: id })
  },

  // ===== 预算相关 =====
  addBudget: async (budget) => {
    const newBudget = await budgetsApi.create(budget)

    set(state => ({
      budgets: [...state.budgets, newBudget],
    }))
    return newBudget.id
  },

  updateBudget: async (id, budget) => {
    const updated = await budgetsApi.update(id, budget)

    set(state => ({
      budgets: state.budgets.map(b =>
        b.id === id ? updated : b
      ),
    }))
  },

  deleteBudget: async (id) => {
    await budgetsApi.delete(id)
    set(state => ({
      budgets: state.budgets.filter(b => b.id !== id),
    }))
  },

  // ===== 支出模板相关 =====
  addExpenseTemplate: async (template) => {
    const newTemplate: ExpenseTemplate = {
      ...template,
      id: `template_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await db.expenseTemplates.add(newTemplate)
    set(state => ({
      expenseTemplates: [...state.expenseTemplates, newTemplate],
    }))
    return newTemplate.id
  },

  updateExpenseTemplate: async (id, template) => {
    await db.expenseTemplates.update(id, {
      ...template,
      updatedAt: new Date().toISOString(),
    })

    set(state => ({
      expenseTemplates: state.expenseTemplates.map(t =>
        t.id === id ? { ...t, ...template, updatedAt: new Date().toISOString() } : t
      ),
    }))
  },

  deleteExpenseTemplate: async (id) => {
    await db.expenseTemplates.delete(id)
    set(state => ({
      expenseTemplates: state.expenseTemplates.filter(t => t.id !== id),
    }))
  },

  // ===== 周期性支出相关 =====
  addRecurringExpense: async (recurring) => {
    const newRecurring: RecurringExpense = {
      ...recurring,
      id: `recurring_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await db.recurringExpenses.add(newRecurring)
    set(state => ({
      recurringExpenses: [...state.recurringExpenses, newRecurring],
    }))
    return newRecurring.id
  },

  updateRecurringExpense: async (id, recurring) => {
    await db.recurringExpenses.update(id, {
      ...recurring,
      updatedAt: new Date().toISOString(),
    })

    set(state => ({
      recurringExpenses: state.recurringExpenses.map(r =>
        r.id === id ? { ...r, ...recurring, updatedAt: new Date().toISOString() } : r
      ),
    }))
  },

  deleteRecurringExpense: async (id) => {
    await db.recurringExpenses.delete(id)
    set(state => ({
      recurringExpenses: state.recurringExpenses.filter(r => r.id !== id),
    }))
  },

  // 执行周期性支出（创建支出记录）
  executeRecurringExpense: async (id) => {
    const recurring = get().recurringExpenses.find(r => r.id === id)
    if (!recurring || !recurring.enabled) return

    const today = new Date().toISOString().split('T')[0]

    // 创建支出记录
    await get().addExpense({
      date: today,
      categoryTagId: recurring.categoryTagId,
      amount: recurring.amount,
      description: `[周期性] ${recurring.description}`,
      needsReimbursement: false,
    })

    // 更新最后执行时间
    await get().updateRecurringExpense(id, {
      lastExecuted: today,
    })
  },

  // 检查并执行所有到期的周期性支出
  checkAndExecuteRecurring: async () => {
    const recurringExpenses = get().recurringExpenses.filter(r => r.enabled)
    const today = new Date()

    for (const recurring of recurringExpenses) {
      let shouldExecute = false
      const lastExecuted = recurring.lastExecuted ? new Date(recurring.lastExecuted) : null

      switch (recurring.frequency) {
        case 'daily':
          // 每天执行
          if (!lastExecuted || lastExecuted.toDateString() !== today.toDateString()) {
            shouldExecute = true
          }
          break

        case 'weekly':
          // 每周特定星期几执行
          if (recurring.dayOfWeek !== undefined && today.getDay() === recurring.dayOfWeek) {
            if (!lastExecuted || today.getTime() - lastExecuted.getTime() > 6 * 24 * 60 * 60 * 1000) {
              shouldExecute = true
            }
          }
          break

        case 'monthly':
          // 每月特定日期执行
          if (recurring.dayOfMonth !== undefined && today.getDate() === recurring.dayOfMonth) {
            if (!lastExecuted || lastExecuted.getMonth() !== today.getMonth()) {
              shouldExecute = true
            }
          }
          break

        case 'yearly':
          // 每年特定月份和日期执行
          if (
            recurring.monthOfYear !== undefined &&
            recurring.dayOfMonth !== undefined &&
            today.getMonth() + 1 === recurring.monthOfYear &&
            today.getDate() === recurring.dayOfMonth
          ) {
            if (!lastExecuted || lastExecuted.getFullYear() !== today.getFullYear()) {
              shouldExecute = true
            }
          }
          break
      }

      // 检查是否在有效期内
      if (shouldExecute) {
        const startDate = new Date(recurring.startDate)
        const endDate = recurring.endDate ? new Date(recurring.endDate) : null

        if (today >= startDate && (!endDate || today <= endDate)) {
          if (recurring.autoCreate) {
            await get().executeRecurringExpense(recurring.id)
          }
        }
      }
    }
  },

  // ==== 信用账户相关方法 ====

  // 添加信用账户
  addCreditAccount: async (account) => {
    const newAccount = await creditAccountsApi.create(account)

    set(state => ({
      creditAccounts: [...state.creditAccounts, newAccount],
    }))
    get().calculateStats()
    return newAccount.id
  },

  // 更新信用账户
  updateCreditAccount: async (id, account) => {
    const updatedAccount = await creditAccountsApi.update(id, account)

    set(state => ({
      creditAccounts: state.creditAccounts.map(acc =>
        acc.id === id ? updatedAccount : acc
      ),
    }))
    get().calculateStats()
  },

  // 删除信用账户
  deleteCreditAccount: async (id) => {
    await creditAccountsApi.delete(id)

    set(state => ({
      creditAccounts: state.creditAccounts.filter(acc => acc.id !== id),
    }))
    get().calculateStats()
  },

  // 记录还款
  recordRepayment: async (creditAccountId, amount, note) => {
    // 调用API记录还款（API会自动更新账户余额和创建债务日志）
    const updatedAccount = await creditAccountsApi.recordRepayment(creditAccountId, {
      amount,
      note,
    })

    // 更新store中的账户信息
    set(state => ({
      creditAccounts: state.creditAccounts.map(acc =>
        acc.id === creditAccountId ? updatedAccount : acc
      ),
    }))

    get().calculateStats()
  },

  // 获取即将到期的还款
  getUpcomingRepayments: (daysAhead = 30) => {
    const { creditAccounts } = get()
    const today = new Date()
    const upcomingList: Array<{
      creditAccountId: string
      accountName: string
      dueDate: string
      amount: number
      daysUntil: number
    }> = []

    creditAccounts
      .filter(acc => acc.status === 'active' && toNumber(acc.currentDebt) > 0)
      .forEach(account => {
        // 计算下次还款日期
        const repaymentDay = account.repaymentDay
        const currentYear = today.getFullYear()
        const currentMonth = today.getMonth()
        const currentDay = today.getDate()

        // 确定下次还款日期（本月或下月）
        let nextRepaymentDate: Date

        if (currentDay < repaymentDay) {
          // 本月还未到还款日
          nextRepaymentDate = new Date(currentYear, currentMonth, repaymentDay)
        } else {
          // 本月已过还款日，计算下月
          const nextMonth = addMonths(new Date(currentYear, currentMonth, 1), 1)
          const nextYear = nextMonth.getFullYear()
          const nextMonthIndex = nextMonth.getMonth()

          // 处理月末日期（如31号在2月不存在）
          const daysInNextMonth = new Date(nextYear, nextMonthIndex + 1, 0).getDate()
          const adjustedDay = Math.min(repaymentDay, daysInNextMonth)

          nextRepaymentDate = new Date(nextYear, nextMonthIndex, adjustedDay)
        }

        const daysUntil = differenceInDays(nextRepaymentDate, today)

        // 只返回在指定天数内的还款
        if (daysUntil >= 0 && daysUntil <= daysAhead) {
          upcomingList.push({
            creditAccountId: account.id,
            accountName: account.name,
            dueDate: format(nextRepaymentDate, 'yyyy-MM-dd'),
            amount: account.monthlyRepayment
              ? toNumber(account.monthlyRepayment)
              : toNumber(account.currentDebt),
            daysUntil,
          })
        }
      })

    // 按到期日期排序
    return upcomingList.sort((a, b) => a.daysUntil - b.daysUntil)
  },

  // ===== 统一交易相关方法实现（新增） =====

  // 加载统一交易数据
  loadTransactions: async () => {
    try {
      const transactions = await transactionsApi.getAll()
      set({ transactions })
    } catch (error) {
      console.error('Failed to load transactions:', error)
    }
  },

  // 添加交易
  addTransaction: async (transaction) => {
    const now = new Date().toISOString()
    const newTransaction = {
      ...transaction,
      createdAt: now,
      updatedAt: now,
    }

    const created = await transactionsApi.create(newTransaction)
    set(state => ({
      transactions: [...state.transactions, created]
    }))

    return created.id
  },

  // 更新交易
  updateTransaction: async (id, transaction) => {
    const updated = await transactionsApi.update(id, transaction)
    set(state => ({
      transactions: state.transactions.map(t => t.id === id ? updated : t)
    }))
  },

  // 删除交易
  deleteTransaction: async (id) => {
    await transactionsApi.delete(id)
    set(state => ({
      transactions: state.transactions.filter(t => t.id !== id)
    }))
  },

  // 从transactions派生expenses
  getExpensesFromTransactions: () => {
    const { transactions } = get()
    return transactions
      .filter(t => t.type === 'expense')
      .map(transactionToExpense)
      .filter(Boolean) as Expense[]
  },

  // 从transactions派生incomes
  getIncomesFromTransactions: () => {
    const { transactions } = get()
    return transactions
      .filter(t => t.type === 'income')
      .map(transactionToIncome)
      .filter(Boolean) as Income[]
  },

  // 从transactions派生investments
  getInvestmentsFromTransactions: () => {
    const { transactions } = get()
    return transactions
      .filter(t => t.type === 'investment')
      .map(transactionToInvestment)
      .filter(Boolean) as Investment[]
  },

  // 设置选中的账本
  setSelectedAccountBook: (accountBookId) => {
    set({ selectedAccountBookId: accountBookId })
  },
}))
