/**
 * 后端 DTO 的前端映射。字段名与 Kotlin 侧保持一致。
 *
 * **可空字段一律写成 `?`（可选），不要写 `| null`。**
 * 后端 Jackson 配了 `default-property-inclusion: non_null`，值为 null 的字段
 * 会被整个从 JSON 里省略，运行时拿到的是 `undefined` 而不是 `null`。
 * 写成 `| null` 会在类型层面骗过编译器，实际用起来才发现取不到值。
 */

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
  summary?: string
  status: PostStatus
  visibility: Visibility
  publishedAt?: string
  updatedAt?: string
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

/** 后台的文章详情，含正文。 */
export interface PostDetail {
  id: number
  slug: string
  title: string
  summary?: string
  contentMd: string
  coverAssetId?: number
  status: PostStatus
  visibility: Visibility
  publishAt?: string
  publishedAt?: string
  lastPublishedAt?: string
  viewCount: number
  /** 乐观锁版本号。每次 PATCH 都要把它带回去 */
  version: number
  createdAt?: string
  updatedAt?: string
  tags: string[]
  hasUnpublishedChanges: boolean
}

/** PATCH /posts/{id} 的请求体。只传要改的字段，`version` 必填。 */
export interface UpdatePostBody {
  title?: string
  summary?: string
  contentMd?: string
  slug?: string
  visibility?: Visibility
  tags?: string[]
  version: number
}

export interface CreatePostBody {
  title: string
  summary?: string
  contentMd?: string
  tags?: string[]
  visibility?: Visibility
}
