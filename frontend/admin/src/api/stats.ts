import { api } from './client'
import type { AdminStats } from './types'

export const statsApi = {
  get: () => api.get<AdminStats>('/stats'),
}