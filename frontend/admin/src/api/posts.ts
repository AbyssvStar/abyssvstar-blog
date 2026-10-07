import { api } from './client'
import type {
  CreatePostBody,
  PageData,
  PostDetail,
  PostSummary,
  UpdatePostBody,
} from './types'

export const postsApi = {
  list: (page: number, size: number) =>
    api.get<PageData<PostSummary>>(`/posts?page=${page}&size=${size}`),

  get: (id: number) => api.get<PostDetail>(`/posts/${id}`),

  create: (body: CreatePostBody) => api.post<PostDetail>('/posts', body),

  /**
   * 更新，也是自动保存用的接口。只写工作副本。
   *
   * **`version` 必须带上它加载时看到的那一个**：后端用它拼 `WHERE version = ?`，
   * 对不上就返回 409，说明这份内容在别处已经被改过了。
   */
  update: (id: number, body: UpdatePostBody) => api.patch<PostDetail>(`/posts/${id}`, body),
}

/** 标签输入框用逗号或空格分隔，这里拆成数组。 */
export function parseTags(input: string): string[] {
  return input
    .split(/[,，\s]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
}
