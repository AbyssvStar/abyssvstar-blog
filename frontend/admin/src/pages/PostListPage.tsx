import { useEffect, useState } from 'react'
import { ApiError, Code } from '../api/client'
import { postsApi } from '../api/posts'
import type { PageData, PostSummary } from '../api/types'

const STATUS_LABEL: Record<PostSummary['status'], string> = {
  DRAFT: '草稿',
  SCHEDULED: '已排期',
  PUBLISHED: '已发布',
  ARCHIVED: '已归档',
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

  if (loading && !data) return <Hint>加载中…</Hint>
  if (error) return <Hint danger>{error}</Hint>
  if (!data) return null

  if (data.total === 0) {
    return (
      <div>
        <Hint>还没有文章。</Hint>
        <button
          onClick={() => void create()}
          disabled={creating}
          className="mt-3 rounded px-3 py-1.5 text-sm disabled:opacity-40"
          style={{ background: 'var(--accent)', color: '#0a0a0b' }}
        >
          {creating ? '新建中…' : '新建文章'}
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between">
        <h1 className="text-lg font-medium">
          文章 <span style={{ color: 'var(--text-muted)' }}>{data.total}</span>
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
            第 {data.page} / {Math.max(1, data.totalPages)} 页
          </span>
          <button
            onClick={() => void create()}
            disabled={creating}
            className="rounded px-3 py-1 text-sm disabled:opacity-40"
            style={{ background: 'var(--accent)', color: '#0a0a0b' }}
          >
            {creating ? '新建中…' : '新建'}
          </button>
        </div>
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr style={{ color: 'var(--text-muted)' }} className="text-left">
            <th className="border-b py-2 font-normal" style={borderStyle}>
              标题
            </th>
            <th className="border-b py-2 font-normal" style={borderStyle}>
              状态
            </th>
            <th className="border-b py-2 font-normal" style={borderStyle}>
              可见性
            </th>
            <th className="border-b py-2 font-normal" style={borderStyle}>
              标签
            </th>
            <th className="border-b py-2 font-normal" style={borderStyle}>
              最后修改
            </th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((post) => (
            <tr key={post.id}>
              <td className="border-b py-2" style={borderStyle}>
                {/* 「有未发布的修改」那个圆点，见 docs/04 §4.1 */}
                {post.hasUnpublishedChanges && (
                  <span title="有未发布的修改" className="mr-2" style={{ color: 'var(--accent)' }}>
                    ●
                  </span>
                )}
                <button
                  onClick={() => onOpen(post.id)}
                  className="text-left hover:underline"
                >
                  {post.title}
                </button>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {post.slug}
                </div>
              </td>
              <td className="border-b py-2" style={borderStyle}>
                {STATUS_LABEL[post.status]}
              </td>
              <td className="border-b py-2" style={borderStyle}>
                <VisibilityBadge visibility={post.visibility} />
              </td>
              <td className="border-b py-2" style={borderStyle}>
                {post.tags.length > 0 ? post.tags.join(' / ') : '—'}
              </td>
              <td className="border-b py-2" style={borderStyle}>
                {formatTime(post.updatedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {data.totalPages > 1 && (
        <div className="mt-4 flex gap-4 text-sm">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="underline disabled:opacity-30 disabled:no-underline"
          >
            上一页
          </button>
          <button
            onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
            disabled={page >= data.totalPages}
            className="underline disabled:opacity-30 disabled:no-underline"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * 私密文章必须一眼看得出来。
 *
 * 这是 docs/04 §3.3 四条硬规则里的第 4 条：防的是「自己看错」——
 * 把私密内容当公开的，或者反过来。所以不能只靠一个不起眼的字段。
 */
function VisibilityBadge({ visibility }: { visibility: PostSummary['visibility'] }) {
  if (visibility === 'PRIVATE') {
    return (
      <span
        className="rounded px-2 py-0.5 text-xs"
        style={{ background: 'rgba(248,113,113,.15)', color: 'var(--danger)' }}
      >
        私密
      </span>
    )
  }
  return (
    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
      公开
    </span>
  )
}

function Hint({ children, danger }: { children: React.ReactNode; danger?: boolean }) {
  return <p style={{ color: danger ? 'var(--danger)' : 'var(--text-muted)' }}>{children}</p>
}

const borderStyle: React.CSSProperties = { borderColor: 'var(--border)' }

function formatTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('zh-CN', { hour12: false })
}
