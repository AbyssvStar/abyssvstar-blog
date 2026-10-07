/** 后端 DTO 的前端映射。字段名与 Kotlin 侧保持一致。 */

export interface Me {
  userId: number
  username: string
  /** 非 GET 请求都要带这个头 */
  csrfToken: string
}

export type PostStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED'
export type Visibility = 'PUBLIC' | 'PRIVATE'

export interface PostSummary {
  id: number
  slug: string
  title: string
  summary: string | null
  status: PostStatus
  visibility: Visibility
  publishedAt: string | null
  updatedAt: string | null
  version: number
  tags: string[]
  /** 工作副本与最新发布快照不一致 —— 列表上那个「还没上线」的圆点 */
  hasUnpublishedChanges: boolean
}

export interface PageData<T> {
  items: T[]
  page: number
  size: number
  total: number
  totalPages: number
}
