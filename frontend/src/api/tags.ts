import { api, ApiResponse } from './client'
import type { Tag } from '../store/types'

/**
 * 标签 API 筛选参数
 */
export interface TagFilters {
  type?: 'category' | 'label'
  accountBookId?: string | null
}

/**
 * 标签 API
 */
export const tagsApi = {
  /**
   * 获取所有标签
   */
  getAll: async (filters?: TagFilters): Promise<Tag[]> => {
    const response: ApiResponse<Tag[]> = await api.get('/tags', filters)
    return response.data || []
  },

  /**
   * 获取单个标签
   */
  getOne: async (id: string): Promise<Tag | null> => {
    const response: ApiResponse<Tag> = await api.get(`/tags/${id}`)
    return response.data || null
  },

  /**
   * 创建标签
   */
  create: async (tag: Omit<Tag, 'id' | 'createdAt' | 'updatedAt' | 'count'>): Promise<Tag> => {
    const response: ApiResponse<Tag> = await api.post('/tags', tag)
    return response.data!
  },

  /**
   * 更新标签
   */
  update: async (id: string, tag: Partial<Omit<Tag, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Tag> => {
    const response: ApiResponse<Tag> = await api.put(`/tags/${id}`, tag)
    return response.data!
  },

  /**
   * 删除标签
   */
  delete: async (id: string): Promise<void> => {
    await api.delete(`/tags/${id}`)
  },
}
