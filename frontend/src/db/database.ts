import Dexie, { Table } from 'dexie'
import { ExpenseTemplate, RecurringExpense } from '@/store/types'

/**
 * V1简化版数据库
 * 仅保留支出模板和周期性支出（本地存储），其他数据通过API获取
 */
export class FinanceDatabase extends Dexie {
  expenseTemplates!: Table<ExpenseTemplate>
  recurringExpenses!: Table<RecurringExpense>

  constructor() {
    super('FinanceDatabase')

    this.version(1).stores({
      expenseTemplates: 'id, name, categoryTagId',
      recurringExpenses: 'id, name, categoryTagId, frequency, enabled',
    })
  }
}

export const db = new FinanceDatabase()
