'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'

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

export function CommentSection({ postId, noteId }: { postId?: number; noteId?: number }) {
  const [comments, setComments] = useState<Comment[]>([])
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
        setComments(body.data?.items ?? [])
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
      setMessage('提交成功，审核通过后会出现在这里。')
      setContent('')
      formStartedAt.current = Date.now()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '提交失败，请稍后重试')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section id="comments" className="comments" aria-labelledby="comments-title">
      <header className="comments__head">
        <h2 id="comments-title">留言</h2>
        <span className="comments__count">{loading ? '--' : String(comments.length).padStart(2, '0')} 条</span>
      </header>

      {loading ? (
        <div className="comments__empty">正在读取留言…</div>
      ) : loadError ? (
        <div className="comments__empty">留言暂时没加载出来，稍后刷新再试。</div>
      ) : comments.length === 0 ? (
        <div className="comments__empty">暂时还没有留言。</div>
      ) : (
        <div className="comment-list">
          {comments.map((comment) => (
            <article key={comment.id} className="comment">
              <div className="comment__avatar" aria-hidden="true">
                {initial(comment.authorName)}
              </div>
              <div className="comment__body">
                <div className="comment__head">
                  <strong>{comment.authorName}</strong>
                  <time>{formatTime(comment.createdAt)}</time>
                </div>
                <p>{comment.content}</p>
              </div>
            </article>
          ))}
        </div>
      )}

      <form className="comment-form" onSubmit={submit}>
        <div className="comment-form__head">
          <strong>写留言</strong>
          <span>提交后需审核</span>
        </div>

        <div className="comment-form__row">
          <label className="comment-field">
            <span>昵称</span>
            <input
              value={authorName}
              onChange={(event) => setAuthorName(event.target.value)}
              maxLength={30}
              autoComplete="nickname"
              placeholder="昵称"
              required
            />
          </label>
          <label className="comment-field">
            <span>邮箱 <em>可选，不公开</em></span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              maxLength={200}
              autoComplete="email"
              placeholder="邮箱（可选）"
            />
          </label>
        </div>

        <label className="comment-field">
          <span>内容</span>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            maxLength={1000}
            placeholder="写点什么…"
            required
          />
        </label>

        <label className="comment-honeypot" aria-hidden="true">
          website
          <input tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
        </label>

        <div className="comment-form__footer">
          <span>1000 字以内 · 邮箱不会公开</span>
          <button className="btn-primary" type="submit" disabled={busy || !authorName.trim() || !content.trim()}>
            {busy ? '提交中…' : '提交'}
          </button>
        </div>
        {message && <p className="comment-message">{message}</p>}
        {error && <p className="comment-error">{error}</p>}
      </form>
    </section>
  )
}

function initial(name: string): string {
  return Array.from(name.trim())[0]?.toUpperCase() || '?'
}

function formatTime(iso?: string): string {
  if (!iso) return ''
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('zh-CN', { hour12: false })
}