/**
 * V1 标签服务层
 * 参考: Firefly III的Category + Tag设计
 *
 * 核心功能：
 * - 双标签系统：Category（分类）+ Label（标记）
 * - 作用域管理：全局标签 + 账本专属标签
 * - 标签验证：确保标签可用于目标账本
 */

import prisma from '../../config/database'
import { Prisma } from '@prisma/client'

export type TagType = 'category' | 'label'
export type TagScope = 'global' | 'account_book'

export interface CreateTagInput {
  name: string
  tagType: TagType
  scope?: TagScope
  accountBookId?: string
  color?: string
  icon?: string
}

export interface UpdateTagInput {
  name?: string
  color?: string
  icon?: string
}

/**
 * 获取所有标签
 */
export const getAllTags = async (filters?: {
  tagType?: TagType
  scope?: TagScope
  accountBookId?: string
}) => {
  const where: Prisma.TagWhereInput = {}

  if (filters) {
    if (filters.tagType) {
      where.tagType = filters.tagType
    }
    if (filters.scope) {
      where.scope = filters.scope
    }
    if (filters.accountBookId) {
      where.accountBookId = filters.accountBookId
    }
  }

  return await prisma.tag.findMany({
    where,
    include: {
      accountBook: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          categoryTransactions: true,
          labelTransactions: true,
        },
      },
    },
    orderBy: [
      { tagType: 'asc' },
      { name: 'asc' },
    ],
  })
}

/**
 * 获取单个标签
 */
export const getTagById = async (id: string) => {
  return await prisma.tag.findUnique({
    where: { id },
    include: {
      accountBook: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          categoryTransactions: true,
          labelTransactions: true,
        },
      },
    },
  })
}

/**
 * 获取账本可用的标签列表
 * 返回：全局标签 + 该账本的专属标签
 */
export const getAvailableTags = async (
  accountBookId: string,
  tagType?: TagType
) => {
  const where: Prisma.TagWhereInput = {
    OR: [
      { scope: 'global' },
      { accountBookId },
    ],
  }

  if (tagType) {
    where.tagType = tagType
  }

  return await prisma.tag.findMany({
    where,
    include: {
      accountBook: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          categoryTransactions: true,
          labelTransactions: true,
        },
      },
    },
    orderBy: [
      { tagType: 'asc' },
      { name: 'asc' },
    ],
  })
}

/**
 * 创建标签
 *
 * 业务规则：
 * 1. 如果scope是account_book，必须提供accountBookId
 * 2. 同一范围内标签名不能重复
 */
export const createTag = async (data: CreateTagInput) => {
  // 验证：账本专属标签必须指定账本
  if (data.scope === 'account_book' && !data.accountBookId) {
    throw new Error('账本专属标签必须指定所属账本')
  }

  // 如果是全局标签，清除accountBookId
  const accountBookId = data.scope === 'global' ? null : data.accountBookId

  return await prisma.tag.create({
    data: {
      name: data.name,
      tagType: data.tagType,
      scope: data.scope || 'global',
      accountBookId,
      color: data.color || '#666666',
      icon: data.icon,
    },
    include: {
      accountBook: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          categoryTransactions: true,
          labelTransactions: true,
        },
      },
    },
  })
}

/**
 * 更新标签
 */
export const updateTag = async (id: string, data: UpdateTagInput) => {
  return await prisma.tag.update({
    where: { id },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.color && { color: data.color }),
      ...(data.icon !== undefined && { icon: data.icon }),
    },
    include: {
      accountBook: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          categoryTransactions: true,
          labelTransactions: true,
        },
      },
    },
  })
}

/**
 * 删除标签
 *
 * 业务规则：
 * 1. Category标签如果被交易使用，不能删除（Prisma会抛出错误）
 * 2. Label标签可以直接删除（会级联删除关联）
 */
export const deleteTag = async (id: string) => {
  const tag = await prisma.tag.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          categoryTransactions: true,
          labelTransactions: true,
        },
      },
    },
  })

  if (!tag) {
    throw new Error('标签不存在')
  }

  // Category标签如果被使用，不能删除
  if (tag.tagType === 'category' && tag._count.categoryTransactions > 0) {
    throw new Error(`分类标签"${tag.name}"正在被${tag._count.categoryTransactions}笔交易使用，无法删除`)
  }

  return await prisma.tag.delete({
    where: { id },
  })
}

/**
 * 验证标签是否可用于目标账本
 *
 * 规则：
 * - 全局标签：所有账本都能用
 * - 账本专属标签：只能在对应账本使用
 */
export const isTagAvailableForAccountBook = (
  tag: { scope: string; accountBookId: string | null },
  targetAccountBookId: string
): boolean => {
  if (tag.scope === 'global') {
    return true
  }
  return tag.accountBookId === targetAccountBookId
}

/**
 * 验证分类标签
 */
export const validateCategoryTag = async (
  categoryTagId: string,
  accountBookId: string
) => {
  const tag = await prisma.tag.findUnique({
    where: { id: categoryTagId },
  })

  if (!tag) {
    throw new Error('分类标签不存在')
  }

  if (tag.tagType !== 'category') {
    throw new Error(`标签"${tag.name}"不是分类标签，请选择分类标签`)
  }

  if (!isTagAvailableForAccountBook(tag, accountBookId)) {
    throw new Error(`分类标签"${tag.name}"是账本专属标签，不能在其他账本使用`)
  }

  return tag
}

/**
 * 验证普通标签列表
 */
export const validateLabelTags = async (
  labelTagIds: string[],
  accountBookId: string
) => {
  if (!labelTagIds || labelTagIds.length === 0) {
    return []
  }

  const tags = await prisma.tag.findMany({
    where: { id: { in: labelTagIds } },
  })

  for (const tag of tags) {
    if (tag.tagType !== 'label') {
      throw new Error(`标签"${tag.name}"不是普通标签，请选择普通标签`)
    }

    if (!isTagAvailableForAccountBook(tag, accountBookId)) {
      throw new Error(`标签"${tag.name}"是账本专属标签，不能在其他账本使用`)
    }
  }

  return tags
}

/**
 * 创建默认分类标签（用于新账本或系统初始化）
 */
export const createDefaultCategoryTags = async () => {
  const defaultCategories = [
    // 支出分类
    { name: '餐饮', color: '#ff6b6b', icon: 'utensils' },
    { name: '交通', color: '#4ecdc4', icon: 'car' },
    { name: '购物', color: '#45b7d1', icon: 'shopping-bag' },
    { name: '娱乐', color: '#96ceb4', icon: 'gamepad' },
    { name: '居住', color: '#dda0dd', icon: 'home' },
    { name: '通讯', color: '#98d8c8', icon: 'phone' },
    { name: '医疗', color: '#f7dc6f', icon: 'heart-pulse' },
    { name: '教育', color: '#bb8fce', icon: 'book' },
    { name: '其他支出', color: '#85929e', icon: 'ellipsis' },
    // 收入分类
    { name: '工资', color: '#52c41a', icon: 'briefcase' },
    { name: '奖金', color: '#faad14', icon: 'gift' },
    { name: '投资收益', color: '#1890ff', icon: 'trending-up' },
    { name: '其他收入', color: '#87d068', icon: 'plus-circle' },
  ]

  const createdTags = []
  for (const cat of defaultCategories) {
    try {
      const tag = await prisma.tag.create({
        data: {
          name: cat.name,
          tagType: 'category',
          scope: 'global',
          color: cat.color,
          icon: cat.icon,
        },
      })
      createdTags.push(tag)
    } catch {
      // 忽略重复创建的错误
    }
  }

  return createdTags
}
