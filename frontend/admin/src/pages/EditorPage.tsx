import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, Code } from '../api/client'
import { parseTags, postsApi } from '../api/posts'
import type { PostDetail } from '../api/types'

/**
 * 自动保存的等待时间。编辑器内容变化后这么久没有新输入才保存。
 * docs/04 §5 定的是 30 秒。
 */
const AUTOSAVE_DELAY_MS = 30_000

const MAX_TAGS = 5

/**
 * 保存状态。
 *
 * `failed` 和 `conflict` 都必须让人**看得见** —— docs/04 §5 的原话是
 * 「服务端保存失败是唯一的丢稿风险」，绝不允许静默失败。
 */
type SaveState =
  | { kind: 'clean' }
  | { kind: 'dirty' }
  | { kind: 'saving' }
  | { kind: 'saved'; at: Date }
  | { kind: 'failed'; message: string }
  | { kind: 'conflict' }

export function EditorPage({ postId, onBack }: { postId: number; onBack: () => void }) {
  const [post, setPost] = useState<PostDetail | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [contentMd, setContentMd] = useState('')
  const [tagsText, setTagsText] = useState('')
  const [save, setSave] = useState<SaveState>({ kind: 'clean' })

  // 这些放 ref 里：它们参与保存逻辑，但变化时不该触发重渲染或副作用
  const versionRef = useRef(0)
  const timerRef = useRef<number | null>(null)
  const inFlightRef = useRef(false)
  // 一旦发生冲突就停止自动保存，等人来处理 —— 继续自动写只会不断覆盖别人的修改
  const conflictRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    postsApi
      .get(postId)
      .then((p) => {
        if (cancelled) return
        setPost(p)
        setTitle(p.title)
        setSummary(p.summary ?? '')
        setContentMd(p.contentMd)
        setTagsText(p.tags.join(', '))
        versionRef.current = p.version
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err instanceof ApiError ? err.message : '加载失败')
      })
    return () => {
      cancelled = true
    }
  }, [postId])

  const doSave = useCallback(async () => {
    if (!post || inFlightRef.current || conflictRef.current) return
    inFlightRef.current = true
    setSave({ kind: 'saving' })
    try {
      const updated = await postsApi.update(post.id, {
        title,
        summary,
        contentMd,
        tags: parseTags(tagsText),
        // 关键：带上版本。后端对不上就 409，而不是覆盖别人的修改
        version: versionRef.current,
      })
      // 版本要从响应里取，不能用旧的 —— 每次成功保存后端都会 +1
      versionRef.current = updated.version
      setSave({ kind: 'saved', at: new Date() })
    } catch (err) {
      if (err instanceof ApiError && err.code === Code.CONFLICT) {
        conflictRef.current = true
        setSave({ kind: 'conflict' })
        return
      }
      setSave({
        kind: 'failed',
        message: err instanceof ApiError ? `${err.message}（${err.code}）` : '保存失败',
      })
    } finally {
      inFlightRef.current = false
    }
  }, [post, title, summary, contentMd, tagsText])

  const scheduleSave = useCallback(() => {
    if (conflictRef.current) return
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      void doSave()
    }, AUTOSAVE_DELAY_MS)
  }, [doSave])

  // 离开页面时清掉待触发的定时器，免得对着已卸载的组件保存
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    }
  }, [])

  function edit(setter: (v: string) => void) {
    return (v: string) => {
      setter(v)
      setSave({ kind: 'dirty' })
      scheduleSave()
    }
  }

  function reload() {
    conflictRef.current = false
    setSave({ kind: 'clean' })
    postsApi.get(postId).then((p) => {
      setPost(p)
      setTitle(p.title)
      setSummary(p.summary ?? '')
      setContentMd(p.contentMd)
      setTagsText(p.tags.join(', '))
      versionRef.current = p.version
    })
  }

  if (loadError) return <p style={{ color: 'var(--danger)' }}>{loadError}</p>
  if (!post) return <p style={{ color: 'var(--text-muted)' }}>加载中…</p>

  const tags = parseTags(tagsText)

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button onClick={onBack} className="text-sm underline" style={{ color: 'var(--text-muted)' }}>
          ← 返回列表
        </button>
        <SaveIndicator state={save} />
      </div>

      {save.kind === 'conflict' && (
        <Banner tone="danger">
          这篇内容已在别处被修改（版本 {versionRef.current} 已过期）。自动保存已停止，
          以免覆盖别人的改动。
          <button onClick={reload} className="ml-3 underline">
            放弃本地修改并重新加载
          </button>
        </Banner>
      )}

      {save.kind === 'failed' && (
        <Banner tone="danger">
          <strong>保存失败：{save.message}</strong>
          <span className="ml-2">你的修改还在这个页面上，但**尚未存到服务端**，别关页面。</span>
          <button onClick={() => void doSave()} className="ml-3 underline">
            重试
          </button>
        </Banner>
      )}

      <input
        value={title}
        onChange={(e) => edit(setTitle)(e.target.value)}
        placeholder="标题"
        className="mb-3 w-full rounded border px-3 py-2 text-lg outline-none"
        style={fieldStyle}
      />

      <input
        value={summary}
        onChange={(e) => edit(setSummary)(e.target.value)}
        placeholder="摘要（公开文章发布时必填，SEO 用）"
        className="mb-3 w-full rounded border px-3 py-2 text-sm outline-none"
        style={fieldStyle}
      />

      <input
        value={tagsText}
        onChange={(e) => edit(setTagsText)(e.target.value)}
        placeholder="标签，逗号分隔，最多 5 个"
        className="mb-1 w-full rounded border px-3 py-2 text-sm outline-none"
        style={fieldStyle}
      />
      {tags.length > MAX_TAGS && (
        <p className="mb-3 text-xs" style={{ color: 'var(--danger)' }}>
          已经有 {tags.length} 个标签，超过上限 {MAX_TAGS} 个，保存会被拒绝（30004）
        </p>
      )}

      <textarea
        value={contentMd}
        onChange={(e) => edit(setContentMd)(e.target.value)}
        placeholder="用 Markdown 写正文…"
        spellCheck={false}
        className="mt-3 mb-3 w-full rounded border px-3 py-2 font-mono text-sm outline-none"
        style={{ ...fieldStyle, minHeight: '26rem', lineHeight: 1.7 }}
      />

      <div className="flex items-center gap-4 text-sm">
        <button
          onClick={() => void doSave()}
          disabled={save.kind === 'saving' || save.kind === 'conflict'}
          className="rounded px-3 py-1.5 disabled:opacity-40"
          style={{ background: 'var(--accent)', color: '#0a0a0b' }}
        >
          立即保存
        </button>
        <span style={{ color: 'var(--text-muted)' }}>
          slug: {post.slug} ｜ 版本: {versionRef.current} ｜ 状态: {post.status}
        </span>
      </div>

      <p className="mt-4 text-xs" style={{ color: 'var(--text-muted)' }}>
        自动保存：停止输入 {AUTOSAVE_DELAY_MS / 1000} 秒后写一次工作副本。
        它不触发构建、不碰发布快照。实时预览与发布是下一批。
      </p>
    </div>
  )
}

function SaveIndicator({ state }: { state: SaveState }) {
  switch (state.kind) {
    case 'clean':
      return <span className="text-sm" style={{ color: 'var(--text-muted)' }}>未改动</span>
    case 'dirty':
      return <span className="text-sm" style={{ color: 'var(--text-muted)' }}>有改动，等待自动保存…</span>
    case 'saving':
      return <span className="text-sm" style={{ color: 'var(--text-muted)' }}>保存中…</span>
    case 'saved':
      return (
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
          已保存 {state.at.toLocaleTimeString('zh-CN', { hour12: false })}
        </span>
      )
    case 'failed':
      return <span className="text-sm font-medium" style={{ color: 'var(--danger)' }}>● 未保存</span>
    case 'conflict':
      return <span className="text-sm font-medium" style={{ color: 'var(--danger)' }}>● 版本冲突</span>
  }
}

function Banner({ children, tone }: { children: React.ReactNode; tone: 'danger' }) {
  return (
    <div
      className="mb-4 rounded border px-4 py-3 text-sm"
      style={{ borderColor: 'var(--danger)', background: 'rgba(248,113,113,.1)', color: 'var(--danger)' }}
    >
      {children}
      {tone === 'danger' ? null : null}
    </div>
  )
}

const fieldStyle: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  borderColor: 'var(--border)',
  color: 'var(--text)',
}
