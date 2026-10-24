'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { formatDate } from '@/lib/format'

interface Comment {
  id: number
  postId?: number
  noteId?: number
  authorName: string
  content: string
  createdAt?: string
}

interface CommentPage {
  items: Comment[]
  total: number
}

const EMPTY_LINE: Record<'idle' | 'loading' | 'error', string> = {
  idle: '还没有留言。第一句会落在这里。',
  loading: '正在读取留言…',
  error: '留言暂时没加载出来，稍后刷新再试。',
}

/**
 * card：文章页用。表单是一整块平面卡片，先写后读。
 * thread：动态详情用。读完再写，表单是一条带字段名的横带。
 */
type Variant = 'card' | 'thread'

export function CommentSection({
  postId,
  noteId,
  variant = 'thread',
}: {
  postId?: number
  noteId?: number
  variant?: Variant
}) {
  const [comments, setComments] = useState<Comment[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [authorName, setAuthorName] = useState('')
  const [email, setEmail] = useState('')
  const [content, setContent] = useState('')
  const [website, setWebsite] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState(false)
  const formStartedAt = useRef(Date.now())

  useEffect(() => {
    let cancelled = false
    const query = postId != null ? `postId=${postId}` : `noteId=${noteId}`
    setLoadError(false)
    void fetch(`/api/v1/comments?${query}&page=1&size=50`, { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('comments unavailable')
        return response.json()
      })
      .then((body: { code: number; data?: CommentPage }) => {
        if (cancelled) return
        if (body.code !== 0) throw new Error('comments unavailable')
        const items = body.data?.items ?? []
        setComments(items)
        setTotal(body.data?.total ?? items.length)
      })
      .catch(() => {
        if (!cancelled) setLoadError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [noteId, postId])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const response = await fetch('/api/v1/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          noteId,
          authorName,
          authorEmail: email || undefined,
          content,
          website,
          formStartedAt: formStartedAt.current,
        }),
      })
      const body = (await response.json()) as { code: number; message: string }
      if (!response.ok || body.code !== 0) throw new Error(body.message || '提交失败')
      setMessage('收到了。审核通过后，它会出现在这里。')
      setContent('')
      formStartedAt.current = Date.now()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '提交失败，请稍后重试')
    } finally {
      setBusy(false)
    }
  }

  const state: 'idle' | 'loading' | 'error' = loading ? 'loading' : loadError ? 'error' : 'idle'
  const count = String(total).padStart(2, '0')
  // 楼层要从 1 楼开始数，所以按时间正序排；接口默认给的是倒序
  const ordered = [...comments].sort((a, b) => timeOf(a.createdAt) - timeOf(b.createdAt))

  const form = (
    <form className={`comment-form comment-form--${variant}`} onSubmit={submit}>
      <div className="comment-form__fields">
        <label className="comment-field">
          <span className="comment-field__label">昵称</span>
          <input
            value={authorName}
            onChange={(event) => setAuthorName(event.target.value)}
            maxLength={30}
            autoComplete="nickname"
            placeholder="请输入昵称"
            required
          />
        </label>
        <label className="comment-field">
          <span className="comment-field__label">
            邮箱 <em>选填，不公开</em>
          </span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            maxLength={200}
            autoComplete="email"
            placeholder="留一个吧 awa"
          />
        </label>
      </div>

      <label className="comment-field comment-field--body">
        <span className="comment-field__label">内容</span>
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          maxLength={1000}
          rows={4}
          placeholder="说点什么…"
          required
        />
      </label>

      <label className="comment-honeypot" aria-hidden="true">
        website
        <input tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
      </label>

      <div className="comment-form__foot">
        <span className="comment-form__note">不需要账号</span>
        <span className="comment-form__count">
          {content.length > 0 ? `${content.length} / 1000` : '0 字'}
        </span>
        {/* 空署名/空内容交给 required 拦，按钮本身保持常态——禁用态会把唯一的动作压暗 */}
        <button className="comment-submit" type="submit" disabled={busy}>
          {busy ? '发送中…' : '发送'}
          <span aria-hidden="true">→</span>
        </button>
      </div>

      {message && (
        <p className="comment-message" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="comment-error" role="alert">
          {error}
        </p>
      )}
    </form>
  )

  return (
    <section id="comments" className={`comments comments--${variant}`} aria-labelledby="comments-title">
      {/* 表单在清单之前：先写后读，两个页面一致 */}
      {form}

      <header className="comments__head">
        <h2 id="comments-title">留言</h2>
        <span className="comments__count">{loading ? '--' : count} 条</span>
      </header>

      <p className="comments__hint">按时间顺序 · 审核通过后显示</p>

      {(state !== 'idle' || ordered.length === 0) && (
        <p className="comments__empty">{EMPTY_LINE[state]}</p>
      )}

      {ordered.length > 0 && (
        <ol className="comment-list">
          {ordered.map((comment, index) => (
            <li key={comment.id} className="comment">
              <span className="comment__avatar" aria-hidden="true">
                {initial(comment.authorName)}
              </span>
              <div className="comment__body">
                <div className="comment__head">
                  <strong>{comment.authorName}</strong>
                  <time dateTime={comment.createdAt} title={formatTime(comment.createdAt)}>
                    {relativeTime(comment.createdAt)}
                  </time>
                  <span className="comment__floor">{index + 1} 楼</span>
                </div>
                <p>{comment.content}</p>
              </div>
            </li>
          ))}
        </ol>
      )}

    </section>
  )
}

function initial(name: string): string {
  return Array.from(name.trim())[0]?.toUpperCase() || '?'
}

function timeOf(iso?: string): number {
  if (!iso) return 0
  const value = new Date(iso).getTime()
  return Number.isNaN(value) ? 0 : value
}

function formatTime(iso?: string): string {
  if (!iso) return ''
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('zh-CN', { hour12: false })
}

/**
 * 留言区一眼要看的是"新不新"，完整时间放进 title。
 * 这个站点是静态导出，评论区只在客户端跑，所以这里用当前时间做相对量没有水合风险。
 */
function relativeTime(iso?: string): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const diff = Date.now() - date.getTime()
  if (diff < 0) return formatDate(iso)
  if (diff < 60_000) return '刚刚'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)} 天前`
  return formatDate(iso)
}
