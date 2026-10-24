import { api } from './client'
import type { NoteInfo, PageData, Visibility } from './types'

export const notesApi = {
  list: (page: number, size: number) => api.get<PageData<NoteInfo>>(`/notes?page=${page}&size=${size}`),
  create: (body: { content: string; visibility: Visibility; assetIds: number[] }) =>
    api.post<NoteInfo>('/notes', body),
  update: (id: number, body: { content: string; visibility: Visibility; assetIds: number[] }) =>
    api.patch<NoteInfo>(`/notes/${id}`, body),
  archive: (id: number) => api.post<NoteInfo>(`/notes/${id}/archive`),
  restore: (id: number) => api.post<NoteInfo>(`/notes/${id}/restore`),
  remove: (id: number) => api.del<unknown>(`/notes/${id}`),
}