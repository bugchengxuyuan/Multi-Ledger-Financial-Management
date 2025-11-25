import Dexie, { Table } from 'dexie'
import {
  Expense,
  Reimbursement,
  Investment,
  FinanceConfig,
  ExpenseTemplate,
  RecurringExpense,
  AccountBook,
  Budget,
  Tag,
  CreditAccount,
  DebtChangeLog
} from '@/store/types'

export class FinanceDatabase extends Dexie {
  expenses!: Table<Expense>
  reimbursements!: Table<Reimbursement>
  investments!: Table<Investment>
  config!: Table<FinanceConfig>
  expenseTemplates!: Table<ExpenseTemplate>
  recurringExpenses!: Table<RecurringExpense>
  accountBooks!: Table<AccountBook>
  budgets!: Table<Budget>
  tags!: Table<Tag>
  creditAccounts!: Table<CreditAccount>
  debtChangeLogs!: Table<DebtChangeLog>

  constructor() {
    super('FinanceDatabase')

    // 版本 1：初始版本
    this.version(1).stores({
      expenses: 'id, date, category, amount',
      reimbursements: 'id, date, status, amount',
      investments: 'id, type, status, amount',
      config: 'id',
    })

    // 版本 2：添加支出和报销关联字段
    this.version(2).stores({
      expenses: 'id, date, category, amount, needsReimbursement, reimbursementId',
      reimbursements: 'id, date, status, amount, expenseId',
      investments: 'id, type, status, amount',
      config: 'id',
    })

    // 版本 3：添加标签、账本、预算、模板、周期性支出功能
    this.version(3).stores({
      expenses: 'id, date, category, amount, needsReimbursement, reimbursementId, accountBookId, *tags',
      reimbursements: 'id, date, status, amount, expenseId',
      investments: 'id, type, status, amount',
      config: 'id',
      expenseTemplates: 'id, name, category',
      recurringExpenses: 'id, name, frequency, enabled',
      accountBooks: 'id, name, isDefault',
      budgets: 'id, category, period, accountBookId',
      tags: 'id, name',
    })

    // 版本 4：添加信用账户和负债变更日志
    this.version(4).stores({
      expenses: 'id, date, category, amount, needsReimbursement, reimbursementId, accountBookId, isDebtRepayment, relatedCreditAccountId, *tags',
      reimbursements: 'id, date, status, amount, expenseId',
      investments: 'id, type, status, amount',
      config: 'id',
      expenseTemplates: 'id, name, category',
      recurringExpenses: 'id, name, frequency, enabled',
      accountBooks: 'id, name, isDefault',
      budgets: 'id, category, period, accountBookId',
      tags: 'id, name',
      creditAccounts: 'id, accountBookId, status, type',
      debtChangeLogs: 'id, creditAccountId, createdAt',
    })

    // 版本 5：统一分类和标签系统（合并category和tag为统一的Tag系统）
    this.version(5).stores({
      expenses: 'id, date, categoryTagId, amount, needsReimbursement, reimbursementId, accountBookId, isDebtRepayment, relatedCreditAccountId, *labelTagIds',
      reimbursements: 'id, date, status, amount, expenseId',
      investments: 'id, type, status, amount',
      config: 'id',
      expenseTemplates: 'id, name, categoryTagId',
      recurringExpenses: 'id, name, categoryTagId, frequency, enabled',
      accountBooks: 'id, name, isDefault',
      budgets: 'id, categoryTagId, period, accountBookId',
      tags: 'id, name, type',
      creditAccounts: 'id, accountBookId, status, type',
      debtChangeLogs: 'id, creditAccountId, createdAt',
    }).upgrade(async (trans) => {
      // 数据迁移逻辑将在 initialData.ts 中处理
      console.log('Database upgraded to version 5: Unified tag system')
    })

    // 版本 6：为标签添加账本作用域（accountBookId）
    this.version(6).stores({
      expenses: 'id, date, categoryTagId, amount, needsReimbursement, reimbursementId, accountBookId, isDebtRepayment, relatedCreditAccountId, *labelTagIds',
      reimbursements: 'id, date, status, amount, expenseId',
      investments: 'id, type, status, amount',
      config: 'id',
      expenseTemplates: 'id, name, categoryTagId',
      recurringExpenses: 'id, name, categoryTagId, frequency, enabled',
      accountBooks: 'id, name, isDefault',
      budgets: 'id, categoryTagId, period, accountBookId',
      tags: 'id, name, type, accountBookId',
      creditAccounts: 'id, accountBookId, status, type',
      debtChangeLogs: 'id, creditAccountId, createdAt',
    }).upgrade(async (trans) => {
      // 将现有所有标签设置为全局标签（accountBookId = null）
      console.log('Database upgraded to version 6: Tag account book scope')
      const tags = await trans.table('tags').toArray()
      console.log(`Setting ${tags.length} existing tags as global tags`)
      for (const tag of tags) {
        if (!tag.accountBookId) {
          await trans.table('tags').update(tag.id, {
            accountBookId: null,
            updatedAt: new Date().toISOString()
          })
        }
      }
    })
  }
}

export const db = new FinanceDatabase()
