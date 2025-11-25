import prisma from '../config/database'
import { Prisma } from '@prisma/client'

/**
 * 标签服务层 - 处理标签相关的业务逻辑
 *
 * 简化后的标签系统：
 * - 统一使用Transaction模型，不再区分Income/Expense/Investment
 * - 分类标签(category): 所有交易类型都必须有
 * - 普通标签(label): 仅支出类型交易可选使用
 * - 支持全局标签和账本专属标签
 * - applicableTypes: 标记分类标签适用于哪些交易类型 ['income','expense','investment']
 */

// 有效的交易类型
const VALID_TRANSACTION_TYPES = ['income', 'expense', 'investment']

// 验证applicableTypes数组
export const validateApplicableTypes = (types: string[]) => {
  const invalid = types.filter(t => !VALID_TRANSACTION_TYPES.includes(t))

  if (invalid.length > 0) {
    throw new Error(`无效的交易类型: ${invalid.join(', ')}`)
  }

  return true
}

// 获取所有标签（支持筛选）
export const getAllTags = async (filters?: {
  type?: string
  accountBookId?: string | null
  transactionType?: string  // 新增：按交易类型过滤
}) => {
  const where: Prisma.TagWhereInput = {}

  if (filters) {
    if (filters.type) {
      where.type = filters.type
    }
    if (filters.accountBookId !== undefined) {
      // 如果传入 null，获取全局标签
      // 如果传入特定ID，获取该账本的标签（包括全局标签）
      if (filters.accountBookId === null) {
        where.accountBookId = null
      } else {
        where.OR = [
          { accountBookId: null },
          { accountBookId: filters.accountBookId }
        ]
      }
    }
    // 新增：按交易类型过滤
    if (filters.transactionType) {
      // 查找applicableTypes包含指定类型的标签，或者applicableTypes为空（表示全部可用）
      where.AND = [
        {
          OR: [
            { applicableTypes: { has: filters.transactionType } },
            { applicableTypes: { isEmpty: true } }
          ]
        }
      ]
    }
  }

  return await prisma.tag.findMany({
    where,
    include: {
      accountBook: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })
}

// 获取单个标签
export const getTagById = async (id: string) => {
  return await prisma.tag.findUnique({
    where: { id },
    include: {
      accountBook: true,
    },
  })
}

// 按交易类型获取分类标签（新增专用方法）
export const getCategoriesByTransactionType = async (
  transactionType: 'income' | 'expense' | 'investment',
  accountBookId?: string | null
) => {
  const where: Prisma.TagWhereInput = {
    type: 'category',
    OR: [
      { applicableTypes: { has: transactionType } },
      { applicableTypes: { isEmpty: true } }
    ]
  }

  // 处理账本筛选
  if (accountBookId !== undefined) {
    if (accountBookId === null) {
      where.accountBookId = null
    } else {
      where.AND = [
        {
          OR: [
            { accountBookId: null },
            { accountBookId }
          ]
        }
      ]
    }
  }

  return await prisma.tag.findMany({
    where,
    include: {
      accountBook: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })
}

// 创建标签
export const createTag = async (data: Prisma.TagCreateInput & { applicableTypes?: string[] }) => {
  // 验证applicableTypes
  if (data.applicableTypes && data.applicableTypes.length > 0) {
    validateApplicableTypes(data.applicableTypes)
  }

  return await prisma.tag.create({
    data,
    include: {
      accountBook: true,
    },
  })
}

// 更新标签
export const updateTag = async (id: string, data: Prisma.TagUpdateInput & { applicableTypes?: string[] }) => {
  // 验证applicableTypes
  if (data.applicableTypes && Array.isArray(data.applicableTypes) && data.applicableTypes.length > 0) {
    validateApplicableTypes(data.applicableTypes)
  }

  return await prisma.tag.update({
    where: { id },
    data,
    include: {
      accountBook: true,
    },
  })
}

// 删除标签
export const deleteTag = async (id: string) => {
  // 检查是否有交易使用了这个标签
  const transactionCount = await prisma.transaction.count({
    where: {
      OR: [
        { categoryTagId: id },
        { labelTagIds: { has: id } }
      ]
    }
  })

  if (transactionCount > 0) {
    throw new Error(`无法删除标签：有 ${transactionCount} 条交易正在使用此标签`)
  }

  return await prisma.tag.delete({
    where: { id },
  })
}

// 重新计算所有标签的使用次数
export const recalculateAllTagCounts = async () => {
  const tags = await prisma.tag.findMany()

  let updatedCount = 0

  for (const tag of tags) {
    let count = 0

    // 统计作为分类标签的使用次数
    const asCategoryCount = await prisma.transaction.count({
      where: { categoryTagId: tag.id },
    })
    count += asCategoryCount

    // 统计作为普通标签的使用次数（仅支出类交易有标签）
    const asLabelCount = await prisma.transaction.count({
      where: {
        type: 'expense',
        labelTagIds: { has: tag.id }
      },
    })
    count += asLabelCount

    // 更新count（如果与当前值不同）
    if (count !== tag.count) {
      await prisma.tag.update({
        where: { id: tag.id },
        data: { count },
      })
      updatedCount++
    }
  }

  return {
    message: '标签计数重算完成',
    totalTags: tags.length,
    updatedTags: updatedCount,
  }
}
