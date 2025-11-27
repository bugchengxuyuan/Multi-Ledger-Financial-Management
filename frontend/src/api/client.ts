import axios, { AxiosInstance, AxiosError } from 'axios'

/**
 * API 响应格式
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

/**
 * 创建 Axios 实例
 */
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api',
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  // 请求拦截器
  client.interceptors.request.use(
    (config) => {
      // 可以在这里添加认证token等
      return config
    },
    (error) => {
      return Promise.reject(error)
    }
  )

  // 响应拦截器
  client.interceptors.response.use(
    (response) => {
      // 兼容两种响应格式：
      // 1. 包装格式: { success, data, message }
      // 2. 直接返回: 数组或对象
      const responseData = response.data

      // 如果已经是包装格式，直接返回
      if (responseData && typeof responseData === 'object' && 'success' in responseData) {
        return responseData
      }

      // 如果是直接返回的数据，包装成标准格式
      return {
        success: true,
        data: responseData,
        timestamp: new Date().toISOString(),
      }
    },
    (error: AxiosError<ApiResponse>) => {
      // 统一错误处理
      const errorMessage = error.response?.data?.error?.message || error.message || '网络请求失败'

      console.error('API Error:', errorMessage, error.response?.data)

      // 返回标准错误格式
      return Promise.reject({
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'NETWORK_ERROR',
          message: errorMessage,
          details: error.response?.data?.error?.details,
        },
      })
    }
  )

  return client
}

// 导出单例实例
export const apiClient = createApiClient()

/**
 * 通用请求方法
 */
export const api = {
  get: <T = any>(url: string, params?: any): Promise<ApiResponse<T>> => {
    return apiClient.get(url, { params })
  },

  post: <T = any>(url: string, data?: any): Promise<ApiResponse<T>> => {
    return apiClient.post(url, data)
  },

  put: <T = any>(url: string, data?: any): Promise<ApiResponse<T>> => {
    return apiClient.put(url, data)
  },

  delete: <T = any>(url: string): Promise<ApiResponse<T>> => {
    return apiClient.delete(url)
  },
}
