/**
 * V1 统计控制器
 */

import { Request, Response, NextFunction } from 'express'
import * as statisticsService from '../../services/v1/statisticsService'

/**
 * 获取月度统计
 */
export const getMonthlyStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { accountBookId, year, month } = req.query

    if (!accountBookId) {
      return res.status(400).json({ error: '缺少必填参数：accountBookId' })
    }

    const now = new Date()
    const stats = await statisticsService.getMonthlyStats(
      accountBookId as string,
      year ? parseInt(year as string) : now.getFullYear(),
      month ? parseInt(month as string) : now.getMonth() + 1
    )

    res.json(stats)
  } catch (error) {
    next(error)
  }
}

/**
 * 获取分类统计
 */
export const getCategoryStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { accountBookId, type, startDate, endDate } = req.query

    if (!accountBookId) {
      return res.status(400).json({ error: '缺少必填参数：accountBookId' })
    }

    const stats = await statisticsService.getCategoryStats(
      accountBookId as string,
      (type as 'income' | 'expense') || 'expense',
      startDate as string,
      endDate as string
    )

    res.json(stats)
  } catch (error) {
    next(error)
  }
}

/**
 * 获取趋势数据
 */
export const getTrendData = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { accountBookId, months } = req.query

    if (!accountBookId) {
      return res.status(400).json({ error: '缺少必填参数：accountBookId' })
    }

    const data = await statisticsService.getTrendData(
      accountBookId as string,
      months ? parseInt(months as string) : 6
    )

    res.json(data)
  } catch (error) {
    next(error)
  }
}

/**
 * 获取交易统计
 */
export const getTransactionStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { accountBookId, type, startDate, endDate } = req.query

    if (!accountBookId) {
      return res.status(400).json({ error: '缺少必填参数：accountBookId' })
    }

    const stats = await statisticsService.getTransactionStats(
      accountBookId as string,
      {
        type: type as 'income' | 'expense',
        startDate: startDate as string,
        endDate: endDate as string,
      }
    )

    res.json(stats)
  } catch (error) {
    next(error)
  }
}

/**
 * 获取日历数据
 */
export const getCalendarData = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { accountBookId, year, month } = req.query

    if (!accountBookId) {
      return res.status(400).json({ error: '缺少必填参数：accountBookId' })
    }

    const now = new Date()
    const data = await statisticsService.getCalendarData(
      accountBookId as string,
      year ? parseInt(year as string) : now.getFullYear(),
      month ? parseInt(month as string) : now.getMonth() + 1
    )

    res.json(data)
  } catch (error) {
    next(error)
  }
}

/**
 * 获取标签使用统计
 */
export const getTagUsageStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { accountBookId } = req.query

    if (!accountBookId) {
      return res.status(400).json({ error: '缺少必填参数：accountBookId' })
    }

    const stats = await statisticsService.getTagUsageStats(accountBookId as string)
    res.json(stats)
  } catch (error) {
    next(error)
  }
}
