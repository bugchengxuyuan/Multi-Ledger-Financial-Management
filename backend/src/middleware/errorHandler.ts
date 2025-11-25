import { Request, Response, NextFunction } from 'express'
import { errorResponse } from '../utils/response'

/**
 * 全局错误处理中间件
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('❌ Error:', err)

  // Prisma错误处理
  if (err.code && err.code.startsWith('P')) {
    if (err.code === 'P2002') {
      return res.status(409).json(
        errorResponse('UNIQUE_CONSTRAINT', '数据已存在，违反唯一性约束', err.meta)
      )
    }
    if (err.code === 'P2025') {
      return res.status(404).json(
        errorResponse('NOT_FOUND', '记录不存在')
      )
    }
  }

  // 参数验证错误
  if (err.name === 'ValidationError') {
    return res.status(400).json(
      errorResponse('VALIDATION_ERROR', err.message, err.details)
    )
  }

  // 默认服务器错误
  const statusCode = err.statusCode || 500
  const message = err.message || '服务器内部错误'

  res.status(statusCode).json(
    errorResponse('INTERNAL_ERROR', message, process.env.NODE_ENV === 'development' ? err.stack : undefined)
  )
}

/**
 * 404处理中间件
 */
export const notFoundHandler = (
  req: Request,
  res: Response
) => {
  res.status(404).json(
    errorResponse('NOT_FOUND', `路由 ${req.method} ${req.path} 不存在`)
  )
}
