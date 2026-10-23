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
  /** 封面的公开 URL，后台用它显示缩略图 */
  coverUrl?: string
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
  /** 0 表示「清掉封面」：JSON 里区分不了「没传」和「传了 null」 */
  coverAssetId?: number
  visibility?: Visibility
  tags?: string[]
  version: number
}

export interface CreatePostBody {
  title: string
  summary?: string
  contentMd?: string
  coverAssetId?: number
  tags?: string[]
  visibility?: Visibility
}

/** 实时预览的结果。渲染器与发布时是同一个，所以这就是上线后的样子。 */
export interface PreviewResponse {
  html: string
  wordCount: number
  readingMinutes: number
}

/** POST /assets 的返回：url 可以直接写进 Markdown */
export interface AssetInfo {
  id: number
  url: string
  mime: string
  sizeBytes: number
  width?: number
  height?: number
  originalName?: string
  variants?: Record<string, string>
  createdAt?: string
}

export type NoteStatus = 'PUBLISHED' | 'ARCHIVED'

export interface NoteInfo {
  id: number
  content: string
  status: NoteStatus
  visibility: Visibility
  publishedAt: string
  viewCount: number
  images: AssetInfo[]
  createdAt?: string
  updatedAt?: string
}

export type CommentStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SPAM'

export interface CommentInfo {
  id: number
  postId?: number
  noteId?: number
  authorName: string
  authorEmail?: string
  content: string
  status: CommentStatus
  createdAt?: string
  reviewedAt?: string
}

export interface CommentStats {
  total: number
  pending: number
  approved: number
  rejected: number
  spam: number
}

export interface AdminStats {
  monthAiCost: number
  monthAiCalls: number
  monthAiCached: number
  viewsLast7Days: number
  publishedPosts: number
  publishedNotes: number
  pendingComments: number
  heapUsedBytes: number
  heapMaxBytes: number
}

/** POST /posts/slug-suggest 的返回 */
export interface SlugSuggestResponse {
  slug: string
}

export type BuildStatus = 'PENDING' | 'FIRED' | 'FAILED' | 'CANCELLED'

/**
 * 站点配置。关于页正文给的是 Markdown 原文 —— 编辑器要改的就是它。
 *
 * 站名、简介、关于页正文是同一类东西：作者手写、改完要重建站。导航、许可、
 * 背景图那些仍然在公开站的代码里（改了要连着改模板），不搬进来。
 */
export interface SiteConfig {
  title: string
  description: string
  aboutMarkdown: string
  /** 关于页的封面图 / 头像（media 地址）。没设就是 undefined */
  aboutCoverUrl?: string
  aboutAvatarUrl?: string
  updatedAt?: string
}

/**
 * PUT /site-config 的请求体。保存就是上线动作，没有单独的「发布」。
 *
 * 后端按**整份替换**处理：这两个图字段传空串就等于「移除那张图」。
 */
export interface UpdateSiteConfigBody {
  title: string
  description: string
  aboutMarkdown: string
  aboutCoverUrl: string
  aboutAvatarUrl: string
}

/** 一条静态站构建记录 */
export interface SiteBuildInfo {
  id: number
  reason?: string
  status: BuildStatus
  requestedAt?: string
  firedAt?: string
  /** GitHub Actions 页面。dispatch 拿不到精确的 run，只能给列表页 */
  runUrl?: string
  error?: string
}
