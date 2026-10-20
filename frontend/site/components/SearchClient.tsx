'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useRef, useState } from 'react'
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

export function SearchClient() {
  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<SearchData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const initial = (params.get('q') ?? '').trim()
    const initialPage = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1)
    setInput(initial)
    setQuery(initial)
    setPage(initialPage)
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!query) {
      setData(null)
      setLoading(false)
      setError(null)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setError(null)
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
    const next = input.trim()
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

  return (
    <div className="wrap search-page">
      <header className="search-page__head">
        <div className="kicker">SEARCH / PUBLISHED ONLY</div>
        <h1>搜索</h1>
        <p className="muted">只检索已经发布的文章，草稿、私密与归档内容不会出现。</p>
      </header>

      <form className="search-form" onSubmit={submit} role="search">
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

      {data?.degraded && (
        <div className="search-notice" role="status">
          搜索服务正在降级，当前结果来自本地模糊匹配。
        </div>
      )}

      {error && <div className="banner banner--danger search-banner">{error}</div>}

      {!query && !loading && (
        <div className="search-empty faint">输入关键词开始搜索。</div>
      )}

      {query && data && (
        <p className="muted mono search-count">
          {data.total} 条结果{query ? ` · ${query}` : ''}
        </p>
      )}

      {query && !loading && data?.items.length === 0 && (
        <div className="search-empty faint">没有找到已发布文章里的相关内容。</div>
      )}

      {data && data.items.length > 0 && (
        <div className="search-results">
          {data.items.map((item) => (
            <article key={item.id} className="search-result">
              <div className="mono faint search-result__meta">{formatDate(item.publishedAt)}</div>
              <h2 className="search-result__title">
                <Link href={`/posts/${item.slug}/`}>{item.title}</Link>
              </h2>
              <p
                className="search-result__summary"
                dangerouslySetInnerHTML={{ __html: item.summaryHtml }}
              />
              {item.bodySnippet && item.bodySnippet !== item.summaryHtml && (
                <p
                  className="search-result__snippet"
                  dangerouslySetInnerHTML={{ __html: item.bodySnippet }}
                />
              )}
              {item.tags.length > 0 && (
                <div className="search-result__tags">
                  {item.tags.map((tag) => (
                    <Link key={tag} href={`/posts/?tag=${encodeURIComponent(tag)}`} className="chip">
                      {tag}
                    </Link>
                  ))}
                </div>
              )}
            </article>
          ))}
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