'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/format'

interface SearchItem {
  type: 'POST'
  id: number
  slug: string
  title: string
  summaryHtml: string
  bodySnippet?: string
  tags: string[]
  publishedAt?: string
}

interface SearchData {
  degraded: boolean
  items: SearchItem[]
  page: number
  size: number
  total: number
  totalPages: number
}

interface ApiEnvelope<T> {
  code: number
  message: string
  data?: T
}

// 带上 from=search：关于页读到它会让头像自己转一圈、换一句签名（那条路唯一能给的回音）
const ABOUT_HREF = '/about/?from=search'

/**
 * 站名和常见的错拼。
 *
 * 搜这几个词的人其实不是在找文章，是在问「这是谁的站」—— 与其给出一堆零散命中，
 * 不如直接送到关于页。比对时去掉空白、忽略大小写，`AbyssvStar` 和 `abystar` 都算。
 */
const SITE_ALIASES = new Set(['abyssvstar', 'abyssstar', 'abystar'])

function resolveAlias(value: string): string | null {
  const key = value.trim().toLowerCase().replace(/\s+/g, '')
  return SITE_ALIASES.has(key) ? ABOUT_HREF : null
}

export function SearchClient({ hotTags }: { hotTags: string[] }) {
  const router = useRouter()
  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<SearchData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** 一次搜索的往返耗时（ms）。后端只回 degraded，不回 took，所以这里自己掐表 */
  const [elapsed, setElapsed] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const initial = (params.get('q') ?? '').trim()
    // 带 ?q=abyssvstar 进来的（书签、外链）也走别名
    const alias = resolveAlias(initial)
    if (alias) {
      router.replace(alias)
      return
    }
    const initialPage = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1)
    setInput(initial)
    setQuery(initial)
    setPage(initialPage)
    inputRef.current?.focus()
  }, [router])

  useEffect(() => {
    if (!query) {
      setData(null)
      setLoading(false)
      setError(null)
      setElapsed(null)
      return
    }

    const controller = new AbortController()
    const started = performance.now()
    setLoading(true)
    setError(null)
    setElapsed(null)

    fetch(`/api/v1/search?q=${encodeURIComponent(query)}&page=${page}&size=10`, {
      signal: controller.signal,
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })
      .then(async (response) => {
        const body = (await response.json()) as ApiEnvelope<SearchData>
        if (!body.data || (body.code !== 0 && body.code !== 60001)) {
          throw new Error(body.message || `搜索失败（HTTP ${response.status}）`)
        }
        setData(body.data)
        setElapsed(Math.round(performance.now() - started))
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return
        setError(reason instanceof Error ? reason.message : '搜索失败，请稍后重试')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [query, page])

  function changePage(nextPage: number) {
    setPage(nextPage)
    syncUrl(query, nextPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    runSearch(input)
  }

  /** 搜索框提交和「试试搜索」的 chip 走同一条路，别名判断只有一处 */
  function runSearch(term: string) {
    const next = term.trim()
    const alias = resolveAlias(next)
    if (alias) {
      router.push(alias)
      return
    }
    setInput(next)
    setPage(1)
    syncUrl(next, 1)
    setQuery(next)
  }

  function syncUrl(value: string, pageNumber: number) {
    const params = new URLSearchParams()
    if (value) params.set('q', value)
    if (pageNumber > 1) params.set('page', String(pageNumber))
    const suffix = params.toString()
    window.history.replaceState(null, '', suffix ? `/search/?${suffix}` : '/search/')
  }

  const suggestions = [{ label: 'abyssvstar', alias: true }, ...hotTags.map((label) => ({ label, alias: false }))]

  return (
    <div className="wrap search-page">
      <header className="search-page__head">
        <div className="kicker">SEARCH / PUBLISHED ONLY</div>
        <h1>搜索</h1>
        <p className="muted">检索已经发布的文章</p>
      </header>

      <form className="search-form" onSubmit={submit} role="search">
        <span className="search-form__icon" aria-hidden="true">
          <SearchIcon />
        </span>
        <input
          ref={inputRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          maxLength={100}
          placeholder="输入标题、摘要或正文里的关键词…"
          aria-label="搜索关键词"
          className="field search-form__input"
        />
        <button type="submit" className="search-form__submit" disabled={!input.trim() || loading}>
          {loading ? '搜索中…' : '搜索'}
        </button>
      </form>

      {error && <div className="banner banner--danger search-banner">{error}</div>}

      {/* 空状态：一行提示 + 一串可以点的词，比一个虚线框有用得多 */}
      {!query && !loading && !error && (
        <div className="search-start">
          <p className="faint mono search-start__hint">输入关键词开始搜索 · 或直接点一个</p>
          <div className="search-start__chips">
            {suggestions.map((item) => (
              <button
                key={item.label}
                type="button"
                className="chip search-start__chip"
                onClick={() => runSearch(item.label)}
              >
                {item.label}
                {item.alias && <span aria-hidden="true">↗</span>}
              </button>
            ))}
          </div>
          <p className="search-start__note faint"></p>
        </div>
      )}

      {/* 结果行：条数 + 往返耗时 + 走的是主路径还是降级，这三样才是"搜索真的在跑"的证据 */}
      {query && data && (
        <p className="muted mono search-count" role="status">
          {data.total} 条结果
          {elapsed !== null && ` · ${elapsed}ms`}
          <span
            title={
              data.degraded
                ? '搜索服务降级，结果来自 PostgreSQL 模糊匹配，排序和相关性会差一些'
                : '结果来自 Elasticsearch 主路径'
            }
          >
            {data.degraded ? ' · PG 降级' : ' · ES'}
          </span>
        </p>
      )}

      {query && !loading && data?.items.length === 0 && (
        <div className="search-empty faint">没有找到已发布文章里的相关内容。</div>
      )}

      {data && data.items.length > 0 && (
        <div className="search-results">
          {data.items.map((item) => {
            // 有正文命中片段就只显示它：摘要和片段并排时读者不知道该先读哪个，而且片段更重、层级是反的
            const bodyHtml =
              item.bodySnippet && item.bodySnippet !== item.summaryHtml ? item.bodySnippet : item.summaryHtml
            return (
              <Link
                key={item.id}
                href={`/posts/${item.slug}/`}
                className="search-result"
                aria-label={`阅读文章：${item.title}`}
              >
                <div className="search-result__head">
                  <h2 className="search-result__title">{item.title}</h2>
                  {/* 标签和日期并到标题这一行的右端：右半边有东西压着，行才不会显得空 */}
                  <div className="search-result__meta">
                    {item.tags.map((tag) => (
                      <span key={tag} className="chip">
                        {tag}
                      </span>
                    ))}
                    <span className="mono faint search-result__date">{formatDate(item.publishedAt)}</span>
                  </div>
                </div>
                <p className="search-result__text" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
              </Link>
            )
          })}
        </div>
      )}

      {data && data.totalPages > 1 && (
        <nav className="search-pager" aria-label="搜索结果分页">
          <button type="button" className="chip" disabled={data.page <= 1 || loading} onClick={() => changePage(data.page - 1)}>
            ← 上一页
          </button>
          <span className="mono faint">
            {data.page} / {data.totalPages}
          </span>
          <button
            type="button"
            className="chip"
            disabled={data.page >= data.totalPages || loading}
            onClick={() => changePage(data.page + 1)}
          >
            下一页 →
          </button>
        </nav>
      )}
    </div>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10.7" cy="10.7" r="6.7" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="m15.7 15.7 4.1 4.1" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
