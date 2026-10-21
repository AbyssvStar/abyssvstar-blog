'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'

interface Comment {
  id: number
  postId?: number
  authorName: string
  content: string
  createdAt?: string
}

interface CommentPage {
  items: Comment[]
  total: number
}

export function CommentSection({ postId }: { postId: number }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [authorName, setAuthorName] = useState('')
  const [email, setEmail] = useState('')
  const [content, setContent] = useState('')
  const [website, setWebsite] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const formStartedAt = useRef(Date.now())

  useEffect(() => {
    let cancelled = false
    void fetch(`/api/v1/comments?postId=${postId}&page=1&size=50`, { cache: 'no-store' })
      .then((response) => response.json())
      .then((body: { code: number; data?: CommentPage }) => {
        if (!cancelled && body.code === 0) setComments(body.data?.items ?? [])
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [postId])

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
          authorName,
          authorEmail: email || undefined,
          content,
          website,
          formStartedAt: formStartedAt.current,
        }),
      })
      const body = (await response.json()) as { code: number; message: string }
      if (!response.ok || body.code !== 0) throw new Error(body.message || '提交失败')
      setMessage('已提交，等待审核。')
      setContent('')
      formStartedAt.current = Date.now()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '提交失败，请稍后重试')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="comments">
      <div className="section__head">
        <div className="section__title">留言</div>
        <span className="faint mono">{comments.length} 条已通过</span>
      </div>

      {loading ? (
        <p className="faint">读取留言中…</p>
      ) : comments.length === 0 ? (
        <p className="faint">还没有留言，欢迎说点什么。</p>
      ) : (
        <div className="comment-list">
          {comments.map((comment) => (
            <article key={comment.id} className="comment">
              <div className="comment__head">
                <strong>{comment.authorName}</strong>
                <span className="faint mono">{formatTime(comment.createdAt)}</span>
              </div>
              <p>{comment.content}</p>
            </article>
          ))}
        </div>
      )}

      <form className="comment-form" onSubmit={submit}>
        <div className="comment-form__row">
          <input className="field" value={authorName} onChange={(e) => setAuthorName(e.target.value)} maxLength={30} placeholder="昵称" required />
          <input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={200} placeholder="邮箱（可选，不会公开）" />
        </div>
        <textarea className="field" value={content} onChange={(e) => setContent(e.target.value)} maxLength={1000} placeholder="写一条留言…" required />
        <label className="comment-honeypot" aria-hidden="true">
          website
          <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </label>
        <div className="comment-form__footer">
          <span className="faint">默认审核后公开</span>
          <button className="btn-primary" type="submit" disabled={busy || !authorName.trim() || !content.trim()}>
            {busy ? '提交中…' : '提交留言'}
          </button>
        </div>
        {message && <p className="comment-message">{message}</p>}
        {error && <p className="comment-error">{error}</p>}
      </form>
    </section>
  )
}

function formatTime(iso?: string): string {
  if (!iso) return ''
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('zh-CN', { hour12: false })
}