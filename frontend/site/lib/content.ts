import { site } from './site'

/**
 * 构建期的内容来源：`GET /api/v1/export`（见 05-api-contract.md 的导出接口一节）。
 *
 * 只在构建时跑一次，拿到的就是「发布快照」的全量，静态站和 ES 都读同一份，天然一致。
 */
export interface ExportPost {
  slug: string
  title: string
  summary: string
  html: string
  coverUrl?: string
  tags: string[]
  wordCount: number
  readingMinutes: number
  publishedAt?: string
}

export interface ExportNote {
  id: number
  content: string
  publishedAt?: string
}

export interface ExportTag {
  name: string
  slug: string
  count: number
}

export interface ExportSiteConfig {
  title: string
  description: string
  /** 关于页正文。后端渲染好的 HTML，和文章正文是同一种东西 */
  aboutHtml: string
}

export interface ExportPayload {
  posts: ExportPost[]
  notes: ExportNote[]
  tags: ExportTag[]
  siteConfig?: ExportSiteConfig | null
}

const EXPORT_URL = process.env.EXPORT_URL ?? 'http://127.0.0.1:8080/api/v1/export'
const EXPORT_TOKEN = process.env.EXPORT_TOKEN ?? ''

let pending: Promise<ExportPayload> | null = null

/** 一次构建只拉一次：页面多的时候也只是一次请求 */
export function loadContent(): Promise<ExportPayload> {
  if (!pending) pending = fetchExport()
  return pending
}

/** Node 的 fetch 把真正的原因包在 cause 里，只打印 message 会只剩一句 "fetch failed" */
function describeError(cause: unknown): string {
  if (!(cause instanceof Error)) return String(cause)
  const nested = (cause as { cause?: unknown }).cause
  return nested instanceof Error ? `${cause.message}: ${nested.message}` : cause.message
}

async function fetchExport(): Promise<ExportPayload> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (EXPORT_TOKEN) headers['X-Export-Token'] = EXPORT_TOKEN

  let res: Response
  try {
    /*
     * 这一步的缓存语义要拿捏：
     *
     *  - 不带任何缓存选项 ⇒ Next 把这次 fetch 当成动态数据，整页被判成动态渲染，导出直接失败
     *  - `force-cache`（永不过期）⇒ Next 把结果写进 .next/cache，**下次构建还会用它**。
     *    本地实测过：后端内容明明改了，重新构建出来的还是前天的页面，最难发现的一种错
     *
     * 所以用「静态 + 30 秒过期」：一次构建里多个 worker 共用同一份结果（只拉一次），
     * 而下一个构建会重新去问后端。CI 每次都是干净的文件系统，永远是拉新的。
     */
    res = await fetch(EXPORT_URL, { headers, next: { revalidate: 30 } })
  } catch (cause) {
    // 宁可让构建失败，也不要发一个空站上去 —— 那比构建失败难发现得多
    throw new Error(`拉取内容失败（${EXPORT_URL}）：${describeError(cause)}`)
  }
  if (res.status === 401 || res.status === 403) {
    throw new Error(
      `导出接口拒绝了这次请求（${res.status}）：EXPORT_TOKEN 没配、或者和服务端的不一致。` +
        '本地开发写进 frontend/site/.env.local（已在 .gitignore 里），CI 用 Secrets 传。',
    )
  }
  if (!res.ok) {
    throw new Error(`导出接口返回 ${res.status}（${EXPORT_URL}）`)
  }

  const body = (await res.json()) as { code: number; message: string; data: ExportPayload }
  if (body.code !== 0) throw new Error(`导出接口 code=${body.code}：${body.message}`)
  return body.data
}

/** 全部文章，按发布时间倒序（发布快照本身就有序，这里再兜一次） */
export async function getPosts(): Promise<ExportPost[]> {
  const { posts } = await loadContent()
  return [...posts].sort((a, b) => time(b.publishedAt) - time(a.publishedAt))
}

export async function getPost(slug: string): Promise<ExportPost | undefined> {
  return (await getPosts()).find((p) => p.slug === slug)
}

/**
 * 上下篇。
 *
 * 导出接口里没有上下篇字段（它是公开详情接口的），所以按时间顺序在本地算：
 * 与后端的语义一致 —— 「上一篇」是更早的那篇。
 */
export async function getNeighbours(slug: string): Promise<{ prev?: ExportPost; next?: ExportPost }> {
  const posts = await getPosts()
  const index = posts.findIndex((p) => p.slug === slug)
  if (index < 0) return {}
  return { prev: posts[index + 1], next: posts[index - 1] }
}

export async function getTags(): Promise<ExportTag[]> {
  const { tags } = await loadContent()
  return tags
}

/**
 * 站点配置：站名、SEO 简介、关于页正文。
 *
 * 这三样都在后台的「站点」页里改，改完会重建站。`lib/site.ts` 里那份是兜底 ——
 * 导出里没有 siteConfig 时（后端还没升上来）站点照样得能开。
 */
export async function getSiteConfig(): Promise<ExportSiteConfig> {
  const { siteConfig } = await loadContent()
  return {
    title: siteConfig?.title?.trim() || site.title,
    description: siteConfig?.description?.trim() || site.description,
    aboutHtml: siteConfig?.aboutHtml ?? '',
  }
}

/** 按标签筛文章（标签是快照里的名字） */
export async function getPostsByTag(tag: string): Promise<ExportPost[]> {
  const posts = await getPosts()
  return posts.filter((p) => p.tags.includes(tag))
}

/** 按年月分组，给归档页用 */
export async function getArchive(): Promise<{ year: string; months: { month: string; posts: ExportPost[] }[] }[]> {
  const posts = await getPosts()
  const years = new Map<string, Map<string, ExportPost[]>>()
  for (const post of posts) {
    const date = new Date(post.publishedAt ?? 0)
    const year = String(date.getFullYear())
    const month = String(date.getMonth() + 1).padStart(2, '0')
    if (!years.has(year)) years.set(year, new Map())
    const months = years.get(year)!
    months.set(month, [...(months.get(month) ?? []), post])
  }
  return [...years.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([year, months]) => ({
      year,
      months: [...months.entries()]
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([month, list]) => ({ month, posts: list })),
    }))
}

/** 站点统计：首页 hero 那三个数字 */
export async function getStats(): Promise<{ posts: number; words: number; days: number }> {
  const posts = await getPosts()
  const words = posts.reduce((sum, p) => sum + (p.wordCount ?? 0), 0)
  const days = Math.max(1, Math.floor((Date.now() - Date.parse(site.startedAt)) / 86_400_000))
  return { posts: posts.length, words, days }
}


function time(iso?: string): number {
  return iso ? Date.parse(iso) : 0
}