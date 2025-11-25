import prisma from '../config/database'
import { Decimal } from '@prisma/client/runtime/library'

/**
 * 数据迁移脚本：初始化账本余额管理
 *
 * 目标：为所有现有账本创建初始余额日志
 *
 * 注意：
 * - 账本的余额字段已通过 SQL migration 自动添加，默认值为 0
 * - 本脚本主要创建初始余额变动日志，用于记录历史
 *
 * 使用方法：
 *   npx ts-node src/scripts/migrateBalances.ts
 */

interface MigrationResult {
  success: boolean
  totalAccountBooks: number
  logsCreated: number
  message: string
  accountBooks: Array<{
    id: string
    name: string
    initialBalance: number
    currentBalance: number
  }>
  errors?: string[]
}

async function migrateBalances(): Promise<MigrationResult> {
  console.log('===========================================')
  console.log('余额管理数据迁移脚本 - 初始化账本余额')
  console.log('===========================================\n')

  try {
    // 第一步：查找所有账本
    console.log('📋 第一步：查找所有账本...')
    const accountBooks = await prisma.accountBook.findMany({
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    })

    if (accountBooks.length === 0) {
      throw new Error('未找到任何账本，请先创建账本')
    }

    console.log(`✓ 找到 ${accountBooks.length} 个账本\n`)

    // 第二步：显示账本列表
    console.log('💰 账本列表：')
    accountBooks.forEach((book, index) => {
      console.log(
        `  [${index + 1}] ${book.icon} ${book.name} ${book.isDefault ? '(默认)' : ''} | 初始余额: ¥${book.initialBalance} | 当前余额: ¥${book.currentBalance}`
      )
    })
    console.log()

    // 第三步：检查是否已有余额日志
    console.log('🔍 第三步：检查现有余额日志...')
    const existingLogs = await prisma.balanceLog.count()
    console.log(`现有余额日志数: ${existingLogs}`)

    if (existingLogs > 0) {
      console.warn('⚠️  已存在余额日志，跳过初始日志创建\n')
      return {
        success: true,
        totalAccountBooks: accountBooks.length,
        logsCreated: 0,
        message: '已存在余额日志，无需创建初始日志',
        accountBooks: accountBooks.map((book) => ({
          id: book.id,
          name: book.name,
          initialBalance: Number(book.initialBalance),
          currentBalance: Number(book.currentBalance),
        })),
      }
    }

    // 第四步：为每个账本创建初始余额日志
    console.log('🚀 第四步：创建初始余额日志...\n')

    let logsCreated = 0
    const errors: string[] = []

    await prisma.$transaction(async (tx) => {
      for (const book of accountBooks) {
        try {
          // 只有当初始余额或当前余额不为0时，才创建日志
          const hasBalance = !book.initialBalance.equals(new Decimal(0)) || !book.currentBalance.equals(new Decimal(0))

          if (hasBalance) {
            await tx.balanceLog.create({
              data: {
                accountBookId: book.id,
                changeType: 'initial',
                amountBefore: new Decimal(0),
                amountAfter: book.currentBalance,
                changeAmount: book.currentBalance,
                note: `初始化账本余额：${book.name}`,
                createdAt: new Date(),
              },
            })

            logsCreated++
            console.log(`  ✓ ${book.icon} ${book.name}: 创建初始日志（余额 ¥${book.currentBalance}）`)
          } else {
            console.log(`  ○ ${book.icon} ${book.name}: 余额为0，跳过`)
          }
        } catch (error) {
          const errorMsg = `创建 ${book.name} 的余额日志失败: ${error instanceof Error ? error.message : String(error)}`
          errors.push(errorMsg)
          console.error(`  ✗ ${errorMsg}`)
        }
      }
    })

    console.log(`\n✓ 成功创建 ${logsCreated} 条初始余额日志\n`)

    // 第五步：验证结果
    console.log('✅ 验证迁移结果...')
    const totalLogs = await prisma.balanceLog.count()
    console.log(`总余额日志数: ${totalLogs}`)

    // 显示每个账本的余额统计
    console.log('\n📊 账本余额汇总：')
    for (const book of accountBooks) {
      const logCount = await prisma.balanceLog.count({
        where: { accountBookId: book.id },
      })
      console.log(`  ${book.icon} ${book.name}: 余额 ¥${book.currentBalance} | 日志 ${logCount} 条`)
    }

    console.log('\n===========================================')
    console.log('✨ 迁移完成！')
    console.log('===========================================')

    return {
      success: true,
      totalAccountBooks: accountBooks.length,
      logsCreated,
      message: '迁移成功完成',
      accountBooks: accountBooks.map((book) => ({
        id: book.id,
        name: book.name,
        initialBalance: Number(book.initialBalance),
        currentBalance: Number(book.currentBalance),
      })),
      errors: errors.length > 0 ? errors : undefined,
    }
  } catch (error) {
    console.error('\n❌ 迁移失败:', error)
    return {
      success: false,
      totalAccountBooks: 0,
      logsCreated: 0,
      message: '迁移失败',
      accountBooks: [],
      errors: [error instanceof Error ? error.message : String(error)],
    }
  } finally {
    await prisma.$disconnect()
  }
}

// 执行迁移
if (require.main === module) {
  migrateBalances()
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

export { migrateBalances }
