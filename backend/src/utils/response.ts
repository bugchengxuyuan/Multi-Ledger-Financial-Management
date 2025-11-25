/**
 * 统一 API 响应格式
 */

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: {
    code: string
    message: string
    details?: any
  }
  timestamp: string
}

export const successResponse = <T = any>(data?: T, message?: string): ApiResponse<T> => {
  return {
    success: true,
    data,
    message: message || '操作成功',
    timestamp: new Date().toISOString(),
  }
}

export const errorResponse = (
  code: string,
  message: string,
  details?: any
): ApiResponse => {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
    timestamp: new Date().toISOString(),
  }
}

export const validationErrorResponse = (errors: any): ApiResponse => {
  return errorResponse('VALIDATION_ERROR', '请求参数验证失败', errors)
}
