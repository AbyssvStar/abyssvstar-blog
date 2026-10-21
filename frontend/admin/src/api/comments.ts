import { api } from './client'
import type { CommentInfo, CommentStats, CommentStatus, PageData } from './types'

export const commentsApi = {
  list: (status: CommentStatus | null, page: number, size: number) => {
    const query = new URLSearchParams({ page: String(page), size: String(size) })
    if (status) query.set('status', status)
    return api.get<PageData<CommentInfo>>(`/comments?${query}`)
  },
  stats: () => api.get<CommentStats>('/comments/stats'),
  review: (id: number, action: 'approve' | 'reject' | 'spam' | 'pending') =>
    api.post<unknown>(`/comments/${id}/${action}`),
  remove: (id: number) => api.del<unknown>(`/comments/${id}`),
}