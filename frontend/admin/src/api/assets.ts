import { api } from './client'
import type { AssetInfo, PageData } from './types'

export const assetsApi = {
  list: (page: number, size: number) => api.get<PageData<AssetInfo>>(`/assets?page=${page}&size=${size}`),
  remove: (id: number) => api.del<unknown>(`/assets/${id}`),
}