import { db } from './database'
import { AccountBook, CreditAccount, Tag, Expense, Budget, ExpenseTemplate, RecurringExpense } from '@/store/types'
import { DEFAULT_CATEGORY_TAGS, LEGACY_EXPENSE_CATEGORIES } from '@/utils/constants'

/**
 * 数据迁移工具集
 */

/**
 * 创建默认账本
 */
export async function ensureDefaultAccountBook(): Promise<AccountBook> {
  // 检查是否已有默认账本
  const defaultBook = await db.accountBooks.where('isDefault').equals(1).first()

  if (defaultBook) {
    return defaultBook
  }

  // 创建默认账本
  const now = new Date().toISOString()
  const newDefaultBook: AccountBook = {
    id: 'account_book_default',
    name: '日常账本',
    description: '个人日常支出记录',
    icon: 'Wallet',
    color: 'violet',
    isDefault: true,
    createdAt: now,
    updatedAt: now,
  }

  await db.accountBooks.add(newDefaultBook)
  return newDefaultBook
}

/**
 * 将所有未关联账本的支出归入默认账本
 */
export async function migrateExpensesToDefaultAccountBook() {
  // 确保有默认账本
  const defaultBook = await ensureDefaultAccountBook()

  // 查找所有没有 accountBookId 的支出
  const expenses = await db.expenses.toArray()
  const unassignedExpenses = expenses.filter(e => !e.accountBookId)

  if (unassignedExpenses.length === 0) {
    console.log('没有需要迁移的支出')
    return
  }

  // 批量更新
  const now = new Date().toISOString()
  await Promise.all(
    unassignedExpenses.map(expense =>
      db.expenses.update(expense.id, {
        accountBookId: defaultBook.id,
        updatedAt: now,
      })
    )
  )

  console.log(`已将 ${unassignedExpenses.length} 条支出归入默认账本`)
}

/**
 * 批量迁移支出到指定账本
 * @param expenseIds 要迁移的支出ID数组
 * @param targetAccountBookId 目标账本ID
 */
export async function batchMigrateExpenses(
  expenseIds: string[],
  targetAccountBookId: string
): Promise<void> {
  const now = new Date().toISOString()

  await Promise.all(
    expenseIds.map(id =>
      db.expenses.update(id, {
        accountBookId: targetAccountBookId,
        updatedAt: now,
      })
    )
  )

  console.log(`已将 ${expenseIds.length} 条支出迁移到账本 ${targetAccountBookId}`)
}

/**
 * 删除账本前的数据迁移
 * @param accountBookId 要删除的账本ID
 * @param targetAccountBookId 目标账本ID（可选，不提供则删除关联）
 */
export async function migrateBeforeDeleteAccountBook(
  accountBookId: string,
  targetAccountBookId?: string
): Promise<number> {
  // 查找该账本下的所有支出
  const expenses = await db.expenses
    .where('accountBookId')
    .equals(accountBookId)
    .toArray()

  if (expenses.length === 0) {
    return 0
  }

  const now = new Date().toISOString()

  if (targetAccountBookId) {
    // 迁移到目标账本
    await Promise.all(
      expenses.map(e =>
        db.expenses.update(e.id, {
          accountBookId: targetAccountBookId,
          updatedAt: now,
        })
      )
    )
  } else {
    // 清除账本关联
    await Promise.all(
      expenses.map(e =>
        db.expenses.update(e.id, {
          accountBookId: undefined,
          updatedAt: now,
        })
      )
    )
  }

  // 同时迁移该账本下的预算
  const budgets = await db.budgets
    .where('accountBookId')
    .equals(accountBookId)
    .toArray()

  if (budgets.length > 0) {
    if (targetAccountBookId) {
      await Promise.all(
        budgets.map(b =>
          db.budgets.update(b.id!, {
            accountBookId: targetAccountBookId,
            updatedAt: now,
          })
        )
      )
    } else {
      // 将预算转为全局预算
      await Promise.all(
        budgets.map(b =>
          db.budgets.update(b.id!, {
            accountBookId: undefined,
            updatedAt: now,
          })
        )
      )
    }
  }

  return expenses.length
}

/**
 * 版本 4 迁移：添加信用账户功能
 * - 为每个账本创建默认信用账户
 * - 迁移现有的信用配置到默认信用账户
 */
export async function migrateToV4() {
  console.log('开始执行 V4 迁移...')

  try {
    // 检查是否已经执行过迁移
    const existingAccounts = await db.creditAccounts.toArray()
    if (existingAccounts.length > 0) {
      console.log('V4 迁移已执行过，跳过')
      return
    }

    // 获取全局配置
    const config = await db.config.get('main')
    if (!config) {
      console.log('未找到配置，跳过迁移')
      return
    }

    // 获取所有账本
    const accountBooks = await db.accountBooks.toArray()
    if (accountBooks.length === 0) {
      console.log('未找到账本，跳过迁移')
      return
    }

    // 为每个账本创建默认信用账户
    const defaultAccounts: CreditAccount[] = []
    const now = new Date().toISOString()

    for (const book of accountBooks) {
      const defaultCreditAccount: CreditAccount = {
        id: `credit_${book.id}_default`,
        name: '默认信用账户',
        provider: '系统',
        type: 'other',
        currentDebt: 0,
        creditLimit: config.creditLimit || 10000,
        repaymentDay: parseInt(config.creditDueDate?.split('-')[2]) || 9,
        status: 'active',
        accountBookId: book.id,
        note: '系统自动创建的默认信用账户',
        createdAt: now,
        updatedAt: now,
      }
      defaultAccounts.push(defaultCreditAccount)
    }

    // 批量插入默认信用账户
    await db.creditAccounts.bulkAdd(defaultAccounts)
    console.log(`成功创建 ${defaultAccounts.length} 个默认信用账户`)

    console.log('V4 迁移完成')
  } catch (error) {
    console.error('V4 迁移失败:', error)
    throw error
  }
}

/**
 * 版本 5 迁移：统一分类和标签系统
 * - 将硬编码的分类转换为可管理的Tag记录（type='category'）
 * - 将所有Expense的category字段迁移为categoryTagId
 * - 将所有Budget的category字段迁移为categoryTagId
 * - 将所有ExpenseTemplate的category字段迁移为categoryTagId
 * - 将所有RecurringExpense的category字段迁移为categoryTagId
 */
export async function migrateToV5() {
  console.log('开始执行 V5 迁移：统一分类和标签系统...')

  try {
    // 检查是否已经执行过迁移（检查是否有type字段的tag）
    const existingTags = await db.tags.toArray()
    const hasCategoryTags = existingTags.some((tag: any) => tag.type === 'category')

    if (hasCategoryTags) {
      console.log('V5 迁移已执行过，跳过')
      return
    }

    const now = new Date().toISOString()

    // 1. 创建默认分类标签
    console.log('创建默认分类标签...')
    const categoryTagMap = new Map<string, string>() // 旧category名称 -> 新tag ID
    const categoryTags: Tag[] = []

    for (const defaultCat of DEFAULT_CATEGORY_TAGS) {
      const tagId = `tag_category_${crypto.randomUUID()}`
      const tag: Tag = {
        id: tagId,
        name: defaultCat.name,
        type: 'category',
        color: defaultCat.color,
        count: 0,
        createdAt: now,
        updatedAt: now,
      }
      categoryTags.push(tag)
      categoryTagMap.set(defaultCat.name, tagId)
    }

    // 插入分类标签
    await db.tags.bulkAdd(categoryTags)
    console.log(`成功创建 ${categoryTags.length} 个分类标签`)

    // 2. 迁移现有的非默认标签（将其设置为type='label'）
    console.log('迁移现有标签...')
    for (const tag of existingTags) {
      await db.tags.update(tag.id, {
        type: 'label',
        updatedAt: now,
      })
    }

    // 3. 迁移Expense数据
    console.log('迁移支出数据...')
    const expenses = await db.expenses.toArray()
    let migratedExpenses = 0
    let defaultCategoryTagId = categoryTags[0].id // 使用第一个分类作为默认

    for (const expense of expenses) {
      const oldExpense = expense as any
      if (oldExpense.category) {
        const categoryTagId = categoryTagMap.get(oldExpense.category) || defaultCategoryTagId

        // 将旧的tags数组转换为labelTagIds
        const labelTagIds = oldExpense.tags || []

        await db.expenses.update(expense.id, {
          categoryTagId,
          labelTagIds,
          updatedAt: now,
        })

        migratedExpenses++
      }
    }
    console.log(`成功迁移 ${migratedExpenses} 条支出记录`)

    // 4. 迁移Budget数据
    console.log('迁移预算数据...')
    const budgets = await db.budgets.toArray()
    let migratedBudgets = 0

    for (const budget of budgets) {
      const oldBudget = budget as any
      if (oldBudget.category) {
        // 如果是"总预算"，设置为null
        const categoryTagId = oldBudget.category === '总预算'
          ? null
          : (categoryTagMap.get(oldBudget.category) || null)

        await db.budgets.update(budget.id!, {
          categoryTagId,
          updatedAt: now,
        })

        migratedBudgets++
      }
    }
    console.log(`成功迁移 ${migratedBudgets} 条预算记录`)

    // 5. 迁移ExpenseTemplate数据
    console.log('迁移支出模板数据...')
    const templates = await db.expenseTemplates.toArray()
    let migratedTemplates = 0

    for (const template of templates) {
      const oldTemplate = template as any
      if (oldTemplate.category) {
        const categoryTagId = categoryTagMap.get(oldTemplate.category) || defaultCategoryTagId
        const labelTagIds = oldTemplate.tags || []

        await db.expenseTemplates.update(template.id, {
          categoryTagId,
          labelTagIds,
          updatedAt: now,
        })

        migratedTemplates++
      }
    }
    console.log(`成功迁移 ${migratedTemplates} 条模板记录`)

    // 6. 迁移RecurringExpense数据
    console.log('迁移周期性支出数据...')
    const recurringExpenses = await db.recurringExpenses.toArray()
    let migratedRecurring = 0

    for (const recurring of recurringExpenses) {
      const oldRecurring = recurring as any
      if (oldRecurring.category) {
        const categoryTagId = categoryTagMap.get(oldRecurring.category) || defaultCategoryTagId

        await db.recurringExpenses.update(recurring.id, {
          categoryTagId,
          updatedAt: now,
        })

        migratedRecurring++
      }
    }
    console.log(`成功迁移 ${migratedRecurring} 条周期性支出记录`)

    console.log('V5 迁移完成！统一分类和标签系统已启用')
  } catch (error) {
    console.error('V5 迁移失败:', error)
    throw error
  }
}

/**
 * 执行所有必要的数据迁移
 * 在应用启动时调用
 */
export async function runMigrations() {
  console.log('开始执行数据迁移...')

  // 1. 确保有默认账本
  await ensureDefaultAccountBook()

  // 2. 迁移未关联的支出
  await migrateExpensesToDefaultAccountBook()

  // 3. 执行 V4 迁移（添加信用账户）
  await migrateToV4()

  // 4. 执行 V5 迁移（统一分类和标签系统）
  await migrateToV5()

  console.log('数据迁移完成')
}
