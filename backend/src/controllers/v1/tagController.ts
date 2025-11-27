/**
 * V1 标签控制器
 */

import { Request, Response, NextFunction } from 'express'
import * as tagService from '../../services/v1/tagService'

/**
 * 获取所有标签
 */
export const getAllTags = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { tagType, scope, accountBookId } = req.query

    const tags = await tagService.getAllTags({
      tagType: tagType as 'category' | 'label',
      scope: scope as 'global' | 'account_book',
      accountBookId: accountBookId as string,
    })

    res.json(tags)
  } catch (error) {
    next(error)
  }
}

/**
 * 获取单个标签
 */
export const getTagById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params
    const tag = await tagService.getTagById(id)

    if (!tag) {
      return res.status(404).json({ error: '标签不存在' })
    }

    res.json(tag)
  } catch (error) {
    next(error)
  }
}

/**
 * 获取账本可用的标签
 */
export const getAvailableTags = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { accountBookId, tagType } = req.query

    if (!accountBookId) {
      return res.status(400).json({ error: '缺少必填参数：accountBookId' })
    }

    const tags = await tagService.getAvailableTags(
      accountBookId as string,
      tagType as 'category' | 'label'
    )

    res.json(tags)
  } catch (error) {
    next(error)
  }
}

/**
 * 创建标签
 */
export const createTag = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tag = await tagService.createTag(req.body)
    res.status(201).json(tag)
  } catch (error) {
    next(error)
  }
}

/**
 * 更新标签
 */
export const updateTag = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params
    const tag = await tagService.updateTag(id, req.body)
    res.json(tag)
  } catch (error) {
    next(error)
  }
}

/**
 * 删除标签
 */
export const deleteTag = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params
    await tagService.deleteTag(id)
    res.status(204).send()
  } catch (error) {
    next(error)
  }
}

/**
 * 创建默认分类标签
 */
export const createDefaultCategoryTags = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tags = await tagService.createDefaultCategoryTags()
    res.status(201).json(tags)
  } catch (error) {
    next(error)
  }
}
