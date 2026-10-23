import { useEffect, useState } from 'react'
import { ApiError } from '../api/client'
import { commentsApi } from '../api/comments'
import type { CommentInfo, CommentStats, CommentStatus } from '../api/types'

const FILTERS: { value: CommentStatus | null; label: string }[] = [
  { value: 'PENDING', label: '待审' },
  { value: 'APPROVED', label: '已通过' },
  { value: 'REJECTED', label: '已拒绝' },
  { value: 'SPAM', label: '垃圾' },
  { value: null, label: '全部' },
]

export function CommentsPage() {
  const [filter, setFilter] = useState<CommentStatus | null>('PENDING')
  const [items, setItems] = useState<CommentInfo[]>([])
  const [stats, setStats] = useState<CommentStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    try {
      const [data, summary] = await Promise.all([commentsApi.list(filter, 1, 100), commentsApi.stats()])
      setItems(data.items)
      setStats(summary)
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : '留言加载失败')
    }
  }

  useEffect(() => { void load() }, [filter]) // eslint-disable-line react-hooks/exhaustive-deps

  async function act(id: number, action: 'approve' | 'reject' | 'spam' | 'pending' | 'delete') {
    setBusy(true)
    try {
      if (action === 'delete') await commentsApi.remove(id)
      else await commentsApi.review(id, action)
      await load()
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : '操作失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      {stats && (
        <div className="stat-grid">
          <Stat label="待审" value={stats.pending} />
          <Stat label="已通过" value={stats.approved} />
          <Stat label="垃圾" value={stats.spam} />
          <Stat label="全部" value={stats.total} />
        </div>
      )}
      <div className="flex flex-wrap gap-2 my-4">
        {FILTERS.map((item) => (
          <button key={item.label} className={`btn ${filter === item.value ? 'btn--primary' : 'btn--ghost'}`} onClick={() => setFilter(item.value)}>
            {item.label}
          </button>
        ))}
      </div>
      {error && <div className="banner banner--danger">{error}</div>}
      <div className="comment-admin-list">
        {items.map((comment) => (
          <article key={comment.id} className="comment-admin">
            <div className="comment-admin__head">
              <strong>{comment.authorName}</strong>
              <span className={`badge badge--${comment.status.toLowerCase()}`}>{comment.status}</span>
              <span className="faint">
                {comment.postId
                  ? `文章 · ${comment.postTitle?.trim() || `#${comment.postId}`}`
                  : comment.noteId
                    ? `动态 · ${comment.noteTitle?.trim() || `#${comment.noteId}`}`
                    : '站内留言'}
              </span>
            </div>
            <p>{comment.content}</p>
            <div className="comment-admin__meta">
              <span>{comment.authorEmail ?? '无邮箱'}</span>
              <span>{comment.createdAt ? new Date(comment.createdAt).toLocaleString('zh-CN', { hour12: false }) : ''}</span>
            </div>
            <div className="comment-admin__actions">
              <button className="btn btn--primary" disabled={busy} onClick={() => void act(comment.id, 'approve')}>通过</button>
              <button className="btn" disabled={busy} onClick={() => void act(comment.id, 'reject')}>拒绝</button>
              <button className="btn" disabled={busy} onClick={() => void act(comment.id, 'spam')}>垃圾</button>
              <button className="btn btn--ghost" disabled={busy} onClick={() => void act(comment.id, 'pending')}>待审</button>
              {comment.status !== 'SPAM' && <button className="btn btn--danger" disabled={busy} onClick={() => void act(comment.id, 'delete')}>删除</button>}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="stat-card"><span className="stat-card__label">{label}</span><strong>{value}</strong></div>
}