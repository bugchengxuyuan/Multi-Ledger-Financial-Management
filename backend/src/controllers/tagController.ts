import { Request, Response, NextFunction } from 'express'
import * as tagService from '../services/tagService'
import { successResponse } from '../utils/response'

/**
 * 标签控制器 - 处理HTTP请求和响应
 */

// 获取所有标签
export const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, accountBookId, transactionType } = req.query

    // 如果指定了transactionType和type=category，使用专用方法
    if (transactionType && type === 'category') {
      const tags = await tagService.getCategoriesByTransactionType(
        transactionType as 'income' | 'expense' | 'investment',
        accountBookId === 'null' ? null : (accountBookId as string | undefined)
      )
      return res.json(successResponse(tags, '获取分类标签成功'))
    }

    // 常规获取
    const tags = await tagService.getAllTags({
      type: type as string | undefined,
      accountBookId: accountBookId === 'null' ? null : (accountBookId as string | undefined),
      transactionType: transactionType as string | undefined,
    })

    res.json(successResponse(tags, '获取标签列表成功'))
  } catch (error) {
    next(error)
  }
}

// 获取单个标签
export const getOne = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const tag = await tagService.getTagById(id)

    if (!tag) {
      return res.status(404).json(successResponse(null, '标签不存在'))
    }

    res.json(successResponse(tag, '获取标签详情成功'))
  } catch (error) {
    next(error)
  }
}

// 创建标签
export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      name,
      type,
      color,
      icon,
      accountBookId,
      applicableTypes,  // 新增字段
    } = req.body

    const tag = await tagService.createTag({
      name,
      type,
      color,
      icon,
      accountBookId: accountBookId || null,
      applicableTypes: applicableTypes || [],  // 新增：默认空数组
    })

    res.status(201).json(successResponse(tag, '创建标签成功'))
  } catch (error) {
    next(error)
  }
}

// 更新标签
export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const updateData: any = {}

    // 只更新提供的字段
    if (req.body.name !== undefined) updateData.name = req.body.name
    if (req.body.type !== undefined) updateData.type = req.body.type
    if (req.body.color !== undefined) updateData.color = req.body.color
    if (req.body.icon !== undefined) updateData.icon = req.body.icon
    if (req.body.accountBookId !== undefined) updateData.accountBookId = req.body.accountBookId || null
    if (req.body.applicableTypes !== undefined) updateData.applicableTypes = req.body.applicableTypes  // 新增

    const tag = await tagService.updateTag(id, updateData)

    res.json(successResponse(tag, '更新标签成功'))
  } catch (error) {
    next(error)
  }
}

// 删除标签
export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    await tagService.deleteTag(id)

    res.json(successResponse(null, '删除标签成功'))
  } catch (error) {
    next(error)
  }
}

// 重新计算所有标签的使用次数
export const recalculateCounts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await tagService.recalculateAllTagCounts()
    res.json(successResponse(result, result.message))
  } catch (error) {
    next(error)
  }
}
