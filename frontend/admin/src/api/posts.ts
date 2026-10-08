import { api, upload } from './client'
import type {
  AssetInfo,
  CreatePostBody,
  PageData,
  PostDetail,
  PostSummary,
  PreviewResponse,
  SlugSuggestResponse,
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

  /**
   * 实时预览。**没有任何副作用**：不写库、不碰发布快照、不触发构建。
   * 正文从请求里带上去，所以看到的是编辑器里**还没保存**的内容 —— 这正是它的意义。
   */
  preview: (id: number, contentMd: string) =>
    api.post<PreviewResponse>(`/posts/${id}/preview`, { contentMd }),

  publish: (id: number) => api.post<PostDetail>(`/posts/${id}/publish`),
  archive: (id: number) => api.post<PostDetail>(`/posts/${id}/archive`),
  restore: (id: number) => api.post<PostDetail>(`/posts/${id}/restore`),

  /** 删除。工作副本软删（列表里不再出现），发布快照直接删掉 —— 上线了的话线上那篇跟着消失 */
  remove: (id: number) => api.del<unknown>(`/posts/${id}`),

  /** 排期发布。到点由后端定时任务走与手动发布完全相同的流程，时间必须是未来 */
  schedule: (id: number, publishAt: string) => api.post<PostDetail>(`/posts/${id}/schedule`, { publishAt }),

  /** 取消排期，回到草稿 */
  cancelSchedule: (id: number) => api.post<PostDetail>(`/posts/${id}/cancel-schedule`),

  /**
   * 按标题要一个当前没被占用的 slug。
   *
   * 用在编辑器里：用户没手动改过 slug 时，它跟着标题走 ——
   * 否则「新建」时按「未命名文章」生成的 slug 会一直挂着，成为那篇文章的永久 URL。
   */
  suggestSlug: (title: string) => api.post<SlugSuggestResponse>('/posts/slug-suggest', { title }),

  /**
   * 传一张图，拿回可以直接写进 Markdown 的 URL。
   * 后端按文件内容判断格式、按 sha256 去重，同一张图重复上传只有一条记录。
   */
  uploadAsset: (file: File) => upload<AssetInfo>('/assets', file),
}

/**
 * 标签输入框用逗号分隔，这里拆成数组。
 *
 * 只按逗号切，不像早先那样连空白也切：标签名里带空格很常见（Spring Boot），
 * 按空白切会让它变成两个标签。
 */
export function parseTags(input: string): string[] {
  return input
    .split(/[,，]/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
}
