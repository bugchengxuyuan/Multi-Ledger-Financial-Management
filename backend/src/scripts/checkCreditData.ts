import prisma from '../config/database'

async function checkData() {
  // 1. 查找个人账本
  const personalBook = await prisma.accountBook.findFirst({
    where: { name: { contains: '个人' } },
  })

  if (!personalBook) {
    console.log('未找到个人账本')
    await prisma.$disconnect()
    return
  }

  console.log('=== 个人账本信息 ===')
  console.log('账本名称:', personalBook.name)
  console.log('账本ID:', personalBook.id)
  console.log()

  // 2. 统计个人账本的支出总数
  const totalExpenses = await prisma.expense.count({
    where: { accountBookId: personalBook.id },
  })
  console.log('个人账本支出总数:', totalExpenses)
  console.log()

  // 3. 查看信用还款标签
  const creditTag = await prisma.tag.findFirst({
    where: { name: '信用还款', type: 'category' },
  })

  if (creditTag) {
    console.log('=== 信用还款标签 ===')
    console.log('标签ID:', creditTag.id)
    console.log('使用次数:', creditTag.count)

    const creditExpenses = await prisma.expense.count({
      where: {
        accountBookId: personalBook.id,
        categoryTagId: creditTag.id,
      },
    })
    console.log('个人账本中使用此标签的支出数:', creditExpenses)
    console.log()
  }

  // 4. 查看个人账本中的支出记录
  const expenses = await prisma.expense.findMany({
    where: { accountBookId: personalBook.id },
    include: { categoryTag: true },
    orderBy: { date: 'desc' },
    take: 30,
  })

  console.log('=== 个人账本最近30条支出记录 ===')
  expenses.forEach((exp, i) => {
    console.log(
      `[${i + 1}] ${exp.date.toISOString().split('T')[0]} | ${exp.description} | ¥${exp.amount} | 分类: ${exp.categoryTag?.name || '未知'}`
    )
  })
  console.log()

  // 5. 统计各分类的使用情况
  const categoryStats = await prisma.expense.groupBy({
    by: ['categoryTagId'],
    where: { accountBookId: personalBook.id },
    _count: true,
  })

  console.log('=== 个人账本分类统计 ===')
  for (const stat of categoryStats) {
    const tag = await prisma.tag.findUnique({
      where: { id: stat.categoryTagId },
    })
    console.log(`${tag?.name || '未知'}: ${stat._count} 条`)
  }

  await prisma.$disconnect()
}

checkData().catch((error) => {
  console.error('错误:', error)
  process.exit(1)
})
