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
      // 后端统一返回 { success, data, message } 格式
      return response.data
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
