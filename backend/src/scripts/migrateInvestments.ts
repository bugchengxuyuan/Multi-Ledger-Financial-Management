import prisma from '../config/database'

/**
 * 数据迁移脚本：将现有投资关联到默认账本
 *
 * 目标：为所有未关联账本的投资自动关联到默认账本
 *
 * 使用方法：
 *   npx ts-node src/scripts/migrateInvestments.ts
 */

interface MigrationResult {
  success: boolean
  defaultAccountBookId: string
  defaultAccountBookName: string
  totalInvestments: number
  migratedCount: number
  alreadyLinkedCount: number
  message: string
  errors?: string[]
}

async function migrateInvestments(): Promise<MigrationResult> {
  console.log('===========================================')
  console.log('投资数据迁移脚本 - 关联默认账本')
  console.log('===========================================\n')

  try {
    // 第一步：查找默认账本
    console.log('📋 第一步：查找默认账本...')
    const defaultBook = await prisma.accountBook.findFirst({
      where: { isDefault: true },
    })

    if (!defaultBook) {
      throw new Error('未找到默认账本，请先设置默认账本')
    }

    console.log(`✓ 找到默认账本: ${defaultBook.name} (ID: ${defaultBook.id})\n`)

    // 第二步：统计投资数据
    console.log('📊 第二步：统计投资数据...')
    const totalInvestments = await prisma.investment.count()
    const unlinkedInvestments = await prisma.investment.findMany({
      where: { accountBookId: null },
    })
    const linkedInvestments = await prisma.investment.count({
      where: { accountBookId: { not: null } },
    })

    console.log(`总投资数: ${totalInvestments}`)
    console.log(`未关联账本: ${unlinkedInvestments.length}`)
    console.log(`已关联账本: ${linkedInvestments}\n`)

    if (unlinkedInvestments.length === 0) {
      return {
        success: true,
        defaultAccountBookId: defaultBook.id,
        defaultAccountBookName: defaultBook.name,
        totalInvestments,
        migratedCount: 0,
        alreadyLinkedCount: linkedInvestments,
        message: '所有投资已经关联账本，无需迁移',
      }
    }

    // 第三步：显示待迁移投资
    console.log('💼 待迁移投资列表：')
    unlinkedInvestments.forEach((inv, index) => {
      console.log(
        `  [${index + 1}] ${inv.name} | ${inv.type} | ¥${inv.amount} | ${inv.purchaseDate.toISOString().split('T')[0]}`
      )
    })
    console.log()

    // 第四步：执行迁移
    console.log('🚀 第四步：执行迁移...\n')

    const result = await prisma.$transaction(async (tx) => {
      // 批量更新未关联的投资
      const updateResult = await tx.investment.updateMany({
        where: { accountBookId: null },
        data: {
          accountBookId: defaultBook.id,
          updatedAt: new Date(),
        },
      })

      console.log(`✓ 成功迁移 ${updateResult.count} 条投资记录到默认账本\n`)

      return updateResult.count
    })

    // 第五步：验证结果
    console.log('✅ 验证迁移结果...')
    const remainingUnlinked = await prisma.investment.count({
      where: { accountBookId: null },
    })
    const nowLinked = await prisma.investment.count({
      where: { accountBookId: defaultBook.id },
    })

    console.log(`剩余未关联: ${remainingUnlinked}`)
    console.log(`现在关联到默认账本: ${nowLinked}\n`)

    if (remainingUnlinked > 0) {
      console.warn(`⚠️  仍有 ${remainingUnlinked} 条投资未关联，请检查！`)
    } else {
      console.log('✓ 所有投资已成功关联到账本\n')
    }

    console.log('===========================================')
    console.log('✨ 迁移完成！')
    console.log('===========================================')

    return {
      success: true,
      defaultAccountBookId: defaultBook.id,
      defaultAccountBookName: defaultBook.name,
      totalInvestments,
      migratedCount: result,
      alreadyLinkedCount: linkedInvestments,
      message: '迁移成功完成',
      errors: remainingUnlinked > 0 ? [`仍有 ${remainingUnlinked} 条投资未关联`] : undefined,
    }
  } catch (error) {
    console.error('\n❌ 迁移失败:', error)
    return {
      success: false,
      defaultAccountBookId: '',
      defaultAccountBookName: '',
      totalInvestments: 0,
      migratedCount: 0,
      alreadyLinkedCount: 0,
      message: '迁移失败',
      errors: [error instanceof Error ? error.message : String(error)],
    }
  } finally {
    await prisma.$disconnect()
  }
}

// 执行迁移
if (require.main === module) {
  migrateInvestments()
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

export { migrateInvestments }
