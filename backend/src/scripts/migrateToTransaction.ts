import prisma from '../config/database'

/**
 * 数据迁移脚本 - 将Income、Expense、Investment数据迁移到Transaction表
 */

async function migrateData() {
  console.log('🚀 开始数据迁移...')

  try {
    // 1. 迁移Income数据
    console.log('\n📊 迁移Income数据...')
    const incomes = await prisma.income.findMany({
      include: {
        accountBook: true,
        categoryTag: true,
      },
    })

    if (incomes.length > 0) {
      const incomeTransactions = incomes.map(income => ({
        id: income.id, // 保留原ID便于关联
        type: 'income' as const,
        subType: null,
        date: income.date,
        categoryTagId: income.categoryTagId,
        amount: income.amount,
        description: income.description,
        accountBookId: income.accountBookId,
        note: income.note,
        needsReimbursement: false,
        labelTagIds: [],
        receiptPhoto: null,
        location: null,
        metadata: undefined,
        createdAt: income.createdAt,
        updatedAt: income.updatedAt,
      }))

      await prisma.transaction.createMany({
        data: incomeTransactions,
        skipDuplicates: true,
      })

      console.log(`✅ 成功迁移 ${incomes.length} 条收入记录`)
    } else {
      console.log('ℹ️ 没有收入数据需要迁移')
    }

    // 2. 迁移Expense数据
    console.log('\n📊 迁移Expense数据...')
    const expenses = await prisma.expense.findMany({
      include: {
        accountBook: true,
        categoryTag: true,
        reimbursement: true,
      },
    })

    if (expenses.length > 0) {
      const expenseTransactions = expenses.map(expense => ({
        id: expense.id, // 保留原ID便于关联
        type: 'expense' as const,
        subType: null,
        date: expense.date,
        categoryTagId: expense.categoryTagId,
        amount: expense.amount,
        description: expense.description,
        accountBookId: expense.accountBookId,
        note: expense.note,
        needsReimbursement: expense.needsReimbursement,
        labelTagIds: expense.labelTagIds || [],
        receiptPhoto: expense.receiptPhoto,
        location: expense.location,
        metadata: undefined,
        createdAt: expense.createdAt,
        updatedAt: expense.updatedAt,
      }))

      await prisma.transaction.createMany({
        data: expenseTransactions,
        skipDuplicates: true,
      })

      console.log(`✅ 成功迁移 ${expenses.length} 条支出记录`)

      // 更新Reimbursement表的关联
      for (const expense of expenses) {
        if (expense.reimbursement) {
          await prisma.reimbursement.update({
            where: { id: expense.reimbursement.id },
            data: { transactionId: expense.id },
          })
        }
      }
      console.log('✅ 更新报销关联')
    } else {
      console.log('ℹ️ 没有支出数据需要迁移')
    }

    // 3. 迁移Investment数据
    console.log('\n📊 迁移Investment数据...')
    const investments = await prisma.investment.findMany({
      include: {
        accountBook: true,
      },
    })

    if (investments.length > 0) {
      const investmentTransactions = await Promise.all(
        investments.map(async (investment) => ({
          type: 'investment' as const,
          subType: investment.status === 'holding' ? 'buy' : 'sell',
          date: investment.purchaseDate,
          categoryTagId: await getOrCreateInvestmentTag(investment.type),
          amount: investment.amount,
          description: investment.name,
          accountBookId: investment.accountBookId,
          note: investment.note,
          needsReimbursement: false,
          labelTagIds: [],
          receiptPhoto: null,
          location: null,
          metadata: {
            originalType: investment.type,
            originalStatus: investment.status,
            originalId: investment.id,
          },
          createdAt: investment.createdAt,
          updatedAt: investment.updatedAt,
        }))
      )

      await prisma.transaction.createMany({
        data: investmentTransactions,
        skipDuplicates: true,
      })

      console.log(`✅ 成功迁移 ${investments.length} 条投资记录`)
    } else {
      console.log('ℹ️ 没有投资数据需要迁移')
    }

    // 4. 更新BalanceLog表的关联
    console.log('\n📊 更新BalanceLog关联...')

    // 更新Income相关的BalanceLog
    const incomeLogs = await prisma.balanceLog.findMany({
      where: {
        relatedIncomeId: { not: null },
      },
    })

    for (const log of incomeLogs) {
      if (log.relatedIncomeId) {
        await prisma.balanceLog.update({
          where: { id: log.id },
          data: { relatedTransactionId: log.relatedIncomeId },
        })
      }
    }

    // 更新Expense相关的BalanceLog
    const expenseLogs = await prisma.balanceLog.findMany({
      where: {
        relatedExpenseId: { not: null },
      },
    })

    for (const log of expenseLogs) {
      if (log.relatedExpenseId) {
        await prisma.balanceLog.update({
          where: { id: log.id },
          data: { relatedTransactionId: log.relatedExpenseId },
        })
      }
    }

    console.log('✅ 更新BalanceLog关联完成')

    // 5. 统计迁移结果
    const totalTransactions = await prisma.transaction.count()
    const byType = await prisma.transaction.groupBy({
      by: ['type'],
      _count: true,
    })

    console.log('\n📈 迁移统计：')
    console.log(`总交易记录：${totalTransactions}`)
    byType.forEach(item => {
      console.log(`- ${item.type}: ${item._count} 条`)
    })

    console.log('\n✅ 数据迁移完成！')
    console.log('ℹ️ 原表数据保留，可在验证后手动删除')

  } catch (error) {
    console.error('❌ 数据迁移失败：', error)
    throw error
  }
}

// 获取或创建投资分类标签
async function getOrCreateInvestmentTag(investmentType: string): Promise<string> {
  const tagName = investmentType === 'precious_metal' ? '贵金属' :
                   investmentType === 'equity' ? '股权投资' :
                   investmentType === 'fixed_income' ? '固收理财' : '其他投资'

  let tag = await prisma.tag.findFirst({
    where: {
      name: tagName,
      type: 'category',
    },
  })

  if (!tag) {
    tag = await prisma.tag.create({
      data: {
        name: tagName,
        type: 'category',
        color: '#8B5CF6',
        icon: '💰',
      },
    })
  }

  return tag.id
}

// 执行迁移
if (require.main === module) {
  migrateData()
    .then(() => {
      console.log('✅ 迁移脚本执行成功')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ 迁移脚本执行失败：', error)
      process.exit(1)
    })
}

export default migrateData