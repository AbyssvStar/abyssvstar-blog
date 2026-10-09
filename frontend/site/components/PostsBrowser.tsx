'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ExportPost } from '@/lib/content'
import { PAGE_SIZE } from '@/lib/site'
import { EmptyState, PostRows } from '@/components/PostList'

/**
 * 列表页的交互：标签筛选 + 翻页。
 *
 * 都在浏览器里做，因为静态导出没有服务端，而且**全部文章本来就在 HTML 里** ——
 * 爬虫拿到的是完整列表，筛选和翻页只是给人的快捷方式。状态放在地址栏（?tag=&page=）便于分享。
 */
export function PostsBrowser({ posts, tags }: { posts: ExportPost[]; tags: string[] }) {
  const [tag, setTag] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  // 地址栏只能在 effect 里读：服务端渲染时没有 window，直接读会让 hydration 对不上
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setTag(params.get('tag'))
    setPage(Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1))
  }, [])

  const filtered = useMemo(() => (tag ? posts.filter((post) => post.tags.includes(tag)) : posts), [posts, tag])
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, totalPages)
  const slice = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  /** 切筛选/翻页：改状态 + 同步地址栏，不做整页跳转 */
  function update(next: { tag?: string | null; page?: number }) {
    const nextTag = next.tag !== undefined ? next.tag : tag
    const nextPage = next.page !== undefined ? next.page : 1
    setTag(nextTag)
    setPage(nextPage)

    const params = new URLSearchParams()
    if (nextTag) params.set('tag', nextTag)
    if (nextPage > 1) params.set('page', String(nextPage))
    const query = params.toString()
    window.history.replaceState(null, '', query ? `?${query}` : window.location.pathname)
  }

  return (
    <>
      {tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.35rem' }}>
          <button type="button" className="chip" style={tag === null ? chipActive : undefined} onClick={() => update({ tag: null })}>
            全部
          </button>
          {tags.map((name) => (
            <button
              key={name}
              type="button"
              className="chip"
              style={tag === name ? chipActive : undefined}
              onClick={() => update({ tag: name })}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      <p className="muted mono" style={{ fontSize: '0.74rem', marginBottom: '0.8rem' }}>
        {filtered.length} 篇{tag ? ` · 标签：${tag}` : ''}
        {totalPages > 1 ? ` · 第 ${current} / ${totalPages} 页` : ''}
      </p>

      {slice.length === 0 ? (
        <EmptyState text={tag ? `没有标着「${tag}」的文章。` : '这里还没有文章。'} />
      ) : (
        <PostRows posts={slice} />
      )}

      {totalPages > 1 && (
        <nav
          className="mono"
          style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', marginTop: '2.25rem', fontSize: '0.78rem' }}
        >
          <button type="button" className="chip" disabled={current <= 1} onClick={() => update({ page: current - 1 })}>
            ← 上一页
          </button>
          <button type="button" className="chip" disabled={current >= totalPages} onClick={() => update({ page: current + 1 })}>
            下一页 →
          </button>
        </nav>
      )}
    </>
  )
}

const chipActive: React.CSSProperties = {
  borderColor: 'var(--accent)',
  color: 'var(--accent)',
}