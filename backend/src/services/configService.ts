import prisma from '../config/database'
import { Prisma } from '@prisma/client'

/**
 * 配置服务层 - 处理系统配置相关的业务逻辑
 */

const CONFIG_ID = 'main'

// 获取配置
export const getConfig = async () => {
  let config = await prisma.config.findUnique({
    where: { id: CONFIG_ID },
  })

  // 如果配置不存在，创建默认配置
  if (!config) {
    config = await prisma.config.create({
      data: {
        id: CONFIG_ID,
        jiebeiTotal: 0,
        salary: 0,
        salaryDate: '每月1日',
        jiebeiDueDate: '每月15日',
        investmentCapital: 0,
        currentAccountBookId: null,
      },
    })
  }

  return config
}

// 更新配置
export const updateConfig = async (data: Prisma.ConfigUpdateInput) => {
  // 确保配置存在
  await getConfig()

  return await prisma.config.update({
    where: { id: CONFIG_ID },
    data,
  })
}

// 设置当前账本
export const setCurrentAccountBook = async (accountBookId: string | null) => {
  // 如果设置了账本ID，验证账本是否存在
  if (accountBookId) {
    const accountBook = await prisma.accountBook.findUnique({
      where: { id: accountBookId },
    })

    if (!accountBook) {
      throw new Error('Account book not found')
    }
  }

  return await updateConfig({
    currentAccountBookId: accountBookId,
  })
}

// 获取当前账本
export const getCurrentAccountBook = async () => {
  const config = await getConfig()

  if (!config.currentAccountBookId) {
    return null
  }

  return await prisma.accountBook.findUnique({
    where: { id: config.currentAccountBookId },
    include: {
      _count: {
        select: {
          expenses: true,
          budgets: true,
        },
      },
    },
  })
}

// 初始化配置
export const initializeConfig = async (data: {
  jiebeiTotal: number
  salary: number
  salaryDate: string
  jiebeiDueDate: string
  investmentCapital: number
}) => {
  return await prisma.config.upsert({
    where: { id: CONFIG_ID },
    update: data,
    create: {
      id: CONFIG_ID,
      ...data,
      currentAccountBookId: null,
    },
  })
}
