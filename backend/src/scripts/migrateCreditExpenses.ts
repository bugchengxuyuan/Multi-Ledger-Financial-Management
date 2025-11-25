import prisma from '../config/database'

/**
 * 数据迁移脚本：个人账本信用消费支出归类
 *
 * 目标：将个人账本中所有信用消费相关支出统一归类为"信用还款"
 *
 * 使用方法：
 *   npx ts-node src/scripts/migrateCreditExpenses.ts
 */

interface MigrationResult {
  success: boolean
  accountBookName: string
  accountBookId: string
  affectedCount: number
  creditTagId: string
  backupTable: string
  message: string
  errors?: string[]
}

async function migrateCreditExpenses(): Promise<MigrationResult> {
  console.log('===========================================')
  console.log('信用消费支出迁移脚本')
  console.log('===========================================\n')

  try {
    // 第一步：查找个人账本
    console.log('📋 第一步：查找个人账本...')
    const personalBook = await prisma.accountBook.findFirst({
      where: {
        name: {
          contains: '个人',
        },
      },
    })

    if (!personalBook) {
      throw new Error('未找到包含"个人"字样的账本')
    }

    console.log(`✓ 找到账本: ${personalBook.name} (ID: ${personalBook.id})\n`)

    // 第二步：查找信用还款标签
    console.log('🏷️  第二步：查找"信用还款"标签...')
    const creditTag = await prisma.tag.findFirst({
      where: {
        name: '信用还款',
        type: 'category',
      },
    })

    if (!creditTag) {
      throw new Error('未找到"信用还款"分类标签')
    }

    console.log(`✓ 找到标签: ${creditTag.name} (ID: ${creditTag.id})`)
    console.log(`  当前使用次数: ${creditTag.count}\n`)

    // 第三步：统计待迁移记录
    console.log('📊 第三步：统计待迁移数据...')
    const targetExpenses = await prisma.expense.findMany({
      where: {
        accountBookId: personalBook.id,
        AND: [
          {
            OR: [
              { description: { contains: '借呗', mode: 'insensitive' } },
              { description: { contains: '花呗', mode: 'insensitive' } },
              { description: { contains: '白条', mode: 'insensitive' } },
              { description: { contains: '信用卡', mode: 'insensitive' } },
              { description: { contains: '还款', mode: 'insensitive' } },
              { description: { contains: '欠款', mode: 'insensitive' } },
            ],
          },
          {
            categoryTagId: {
              not: creditTag.id,
            },
          },
        ],
      },
      include: {
        categoryTag: true,
      },
      orderBy: {
        date: 'desc',
      },
    })

    const totalAmount = targetExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0)

    console.log(`待迁移记录数: ${targetExpenses.length}`)
    console.log(`涉及金额总计: ¥${totalAmount.toFixed(2)}\n`)

    if (targetExpenses.length === 0) {
      return {
        success: true,
        accountBookName: personalBook.name,
        accountBookId: personalBook.id,
        affectedCount: 0,
        creditTagId: creditTag.id,
        backupTable: '',
        message: '没有需要迁移的记录',
      }
    }

    // 第四步：显示样本数据
    console.log('📝 待迁移记录样本（前10条）：')
    targetExpenses.slice(0, 10).forEach((exp, index) => {
      console.log(
        `  [${index + 1}] ${exp.date.toISOString().split('T')[0]} | ${exp.description} | ¥${exp.amount} | 当前分类: ${exp.categoryTag?.name || '未知'}`
      )
    })
    console.log()

    // 第五步：用户确认
    console.log('⚠️  即将开始迁移，以下操作将在事务中执行：')
    console.log('  1. 备份原始数据到 Expense_backup_credit_migration 表')
    console.log('  2. 将所有符合条件的支出分类改为"信用还款"')
    console.log('  3. 更新标签使用计数')
    console.log()

    // 在实际环境中可以添加交互式确认
    // const readline = require('readline')
    // const rl = readline.createInterface({ ... })
    // 这里直接执行

    console.log('🚀 开始执行迁移...\n')

    // 第六步：执行迁移（在事务中）
    const result = await prisma.$transaction(async (tx) => {
      // 1. 创建备份（通过raw SQL，因为backup表不在schema中）
      console.log('💾 创建备份...')
      await tx.$executeRaw`
        CREATE TABLE IF NOT EXISTS "Expense_backup_credit_migration" (
          id TEXT PRIMARY KEY,
          date TIMESTAMP(3) NOT NULL,
          "categoryTagId" TEXT NOT NULL,
          amount DECIMAL(12,2) NOT NULL,
          description TEXT NOT NULL,
          "needsReimbursement" BOOLEAN NOT NULL DEFAULT false,
          "labelTagIds" TEXT[],
          "accountBookId" TEXT,
          note TEXT,
          "receiptPhoto" TEXT,
          location TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          "backupAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `

      const expenseIds = targetExpenses.map((e) => e.id)
      const backupResult = await tx.$executeRaw`
        INSERT INTO "Expense_backup_credit_migration"
        SELECT e.*, NOW() as "backupAt"
        FROM "Expense" e
        WHERE e.id = ANY(${expenseIds})
        ON CONFLICT (id) DO NOTHING
      `
      console.log(`✓ 已备份 ${backupResult} 条记录\n`)

      // 2. 统计受影响的旧标签（用于更新count）
      const oldTagStats: { [key: string]: number } = {}
      targetExpenses.forEach((exp) => {
        if (exp.categoryTagId) {
          oldTagStats[exp.categoryTagId] = (oldTagStats[exp.categoryTagId] || 0) + 1
        }
      })

      // 3. 执行迁移
      console.log('🔄 更新支出分类...')
      const updateResult = await tx.expense.updateMany({
        where: {
          id: {
            in: expenseIds,
          },
        },
        data: {
          categoryTagId: creditTag.id,
          updatedAt: new Date(),
        },
      })
      console.log(`✓ 成功迁移 ${updateResult.count} 条记录\n`)

      // 4. 更新标签计数
      console.log('📈 更新标签使用计数...')

      // 减少旧标签的count
      for (const [tagId, count] of Object.entries(oldTagStats)) {
        await tx.tag.update({
          where: { id: tagId },
          data: {
            count: {
              decrement: count,
            },
          },
        })
        const tag = await tx.tag.findUnique({ where: { id: tagId } })
        console.log(`  标签 [${tag?.name}] 使用次数 -${count}`)
      }

      // 增加信用还款标签的count
      await tx.tag.update({
        where: { id: creditTag.id },
        data: {
          count: {
            increment: updateResult.count,
          },
        },
      })
      console.log(`  标签 [${creditTag.name}] 使用次数 +${updateResult.count}\n`)

      return updateResult.count
    })

    // 第七步：验证结果
    console.log('✅ 验证迁移结果...')

    // 检查是否还有遗漏
    const remaining = await prisma.expense.count({
      where: {
        accountBookId: personalBook.id,
        AND: [
          {
            OR: [
              { description: { contains: '借呗', mode: 'insensitive' } },
              { description: { contains: '花呗', mode: 'insensitive' } },
              { description: { contains: '白条', mode: 'insensitive' } },
              { description: { contains: '信用卡', mode: 'insensitive' } },
              { description: { contains: '还款', mode: 'insensitive' } },
              { description: { contains: '欠款', mode: 'insensitive' } },
            ],
          },
          {
            categoryTagId: {
              not: creditTag.id,
            },
          },
        ],
      },
    })

    // 统计信用还款分类总数
    const creditExpenses = await prisma.expense.findMany({
      where: {
        accountBookId: personalBook.id,
        categoryTagId: creditTag.id,
      },
    })

    const creditTotal = creditExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0)

    console.log(`剩余未迁移记录: ${remaining}`)
    console.log(`个人账本"信用还款"分类总记录数: ${creditExpenses.length}`)
    console.log(`个人账本"信用还款"分类总金额: ¥${creditTotal.toFixed(2)}\n`)

    if (remaining > 0) {
      console.warn(`⚠️  仍有 ${remaining} 条记录未迁移，请检查！`)
    } else {
      console.log('✓ 所有符合条件的记录已成功迁移\n')
    }

    console.log('===========================================')
    console.log('✨ 迁移完成！')
    console.log('===========================================')

    return {
      success: true,
      accountBookName: personalBook.name,
      accountBookId: personalBook.id,
      affectedCount: result,
      creditTagId: creditTag.id,
      backupTable: 'Expense_backup_credit_migration',
      message: '迁移成功完成',
      errors: remaining > 0 ? [`仍有 ${remaining} 条记录未迁移`] : undefined,
    }
  } catch (error) {
    console.error('\n❌ 迁移失败:', error)
    return {
      success: false,
      accountBookName: '',
      accountBookId: '',
      affectedCount: 0,
      creditTagId: '',
      backupTable: '',
      message: '迁移失败',
      errors: [error instanceof Error ? error.message : String(error)],
    }
  } finally {
    await prisma.$disconnect()
  }
}

// 执行迁移
if (require.main === module) {
  migrateCreditExpenses()
    .then((result) => {
      if (result.success) {
        console.log('\n✅ 迁移脚本执行成功')
        process.exit(0)
      } else {
        console.log('\n❌ 迁移脚本执行失败')
        console.log('错误信息:', result.errors)
        process.exit(1)
      }
    })
    .catch((error) => {
      console.error('\n❌ 未捕获的错误:', error)
      process.exit(1)
    })
}

export { migrateCreditExpenses }
