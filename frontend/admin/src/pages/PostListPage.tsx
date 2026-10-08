import { useEffect, useState } from 'react'
import { ApiError, Code } from '../api/client'
import { postsApi } from '../api/posts'
import type { PageData, PostStatus, PostSummary, Visibility } from '../api/types'

const STATUS_LABEL: Record<PostStatus, string> = {
  DRAFT: '草稿',
  SCHEDULED: '已排期',
  PUBLISHED: '已发布',
  ARCHIVED: '已归档',
}

const STATUS_CLASS: Record<PostStatus, string> = {
  DRAFT: 'badge--draft',
  SCHEDULED: 'badge--scheduled',
  PUBLISHED: 'badge--published',
  ARCHIVED: 'badge--archived',
}

const PAGE_SIZE = 20

export function PostListPage({
  onUnauthenticated,
  onOpen,
}: {
  onUnauthenticated: () => void
  onOpen: (id: number) => void
}) {
  const [data, setData] = useState<PageData<PostSummary> | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    postsApi
      .list(page, PAGE_SIZE)
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        // 会话过期就把人踢回登录页，而不是显示一个看不懂的错误
        if (err instanceof ApiError && err.code === Code.UNAUTHENTICATED) {
          onUnauthenticated()
          return
        }
        setError(err instanceof ApiError ? `${err.message}（${err.code}）` : '加载失败')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [page, onUnauthenticated])

  async function create() {
    setCreating(true)
    setError(null)
    try {
      const created = await postsApi.create({ title: '未命名文章' })
      onOpen(created.id)
    } catch (err) {
      setError(err instanceof ApiError ? `${err.message}（${err.code}）` : '新建失败')
    } finally {
      setCreating(false)
    }
  }

  if (error) return <div className="banner banner--danger">{error}</div>
  if (loading && !data) return <p className="muted">加载中…</p>
  if (!data) return null

  const newButton = (
    <button className="btn btn--primary" onClick={() => void create()} disabled={creating}>
      {creating ? '新建中…' : '新建文章'}
    </button>
  )

  if (data.total === 0) {
    return (
      <div className="panel">
        <div className="panel__header">
          <span className="panel__title">文章</span>
          {newButton}
        </div>
        <div className="panel__body">
          <p className="muted" style={{ margin: 0 }}>
            还没有文章。点右上角「新建文章」开始写第一篇。
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="panel">
      <div className="panel__header">
        <span className="panel__title">
          文章 <span className="faint">{data.total}</span>
        </span>
        <div style={{ alignItems: 'center', display: 'flex', gap: 12 }}>
          <span className="muted" style={{ fontSize: 12 }}>
            第 {data.page} / {Math.max(1, data.totalPages)} 页
          </span>
          {newButton}
        </div>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>标题</th>
            <th style={{ width: 90 }}>状态</th>
            <th style={{ width: 80 }}>可见性</th>
            <th style={{ width: 160 }}>标签</th>
            <th style={{ width: 150 }}>最后修改</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((post) => (
            <tr key={post.id}>
              <td>
                <div style={{ alignItems: 'center', display: 'flex', gap: 8 }}>
                  {/* 「有未发布的修改」那个圆点：后端算的 hasUnpublishedChanges */}
                  {post.hasUnpublishedChanges && (
                    <span
                      title="有未发布的修改"
                      style={{
                        background: 'var(--accent)',
                        borderRadius: '50%',
                        flexShrink: 0,
                        height: 7,
                        width: 7,
                      }}
                    />
                  )}
                  <button className="link-cell" onClick={() => onOpen(post.id)}>
                    {post.title}
                  </button>
                  {post.visibility === 'PRIVATE' && <VisibilityBadge visibility={post.visibility} />}
                </div>
                <div className="mono faint" style={{ marginTop: 3 }}>
                  {post.slug}
                </div>
              </td>
              <td>
                <span className={`badge ${STATUS_CLASS[post.status]}`}>{STATUS_LABEL[post.status]}</span>
              </td>
              <td>
                <VisibilityBadge visibility={post.visibility} />
              </td>
              <td className="muted" style={{ fontSize: 13 }}>
                {post.tags.length > 0 ? post.tags.join(' / ') : '—'}
              </td>
              <td className="muted" style={{ fontSize: 13 }}>
                {formatTime(post.updatedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {data.totalPages > 1 && (
        <div
          style={{
            borderTop: '1px solid var(--border-weak)',
            display: 'flex',
            gap: 8,
            justifyContent: 'flex-end',
            padding: '10px 14px',
          }}
        >
          <button className="btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
            上一页
          </button>
          <button
            className="btn"
            onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
            disabled={page >= data.totalPages}
          >
            下一页
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * 私密内容必须一眼看得出来。
 *
 * 私密内容必须一眼看得出来：前三条硬规则防泄漏（永不写快照、永不进公开 API、
 * 永不进公开索引），**这一条防的是「自己看错」**。
 * 所以用醒目的红色徽章，而不是一个不起眼的字段。
 */
function VisibilityBadge({ visibility }: { visibility: Visibility }) {
  if (visibility === 'PRIVATE') {
    return <span className="badge badge--private">私密</span>
  }
  return <span className="badge badge--public">公开</span>
}

function formatTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('zh-CN', { hour12: false })
}
