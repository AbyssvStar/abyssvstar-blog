import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, Code } from '../api/client'
import { parseTags, postsApi } from '../api/posts'
import type { PostDetail, PreviewResponse } from '../api/types'

/**
 * 自动保存的等待时间。编辑器内容变化后这么久没有新输入才保存。
 * docs/04 §5 定的是 30 秒。
 */
const AUTOSAVE_DELAY_MS = 30_000

/**
 * 预览的等待时间。比自动保存短得多 —— 预览是一次无副作用的纯渲染，
 * 而且「改完立刻看到效果」正是它存在的理由。
 */
const PREVIEW_DELAY_MS = 800

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
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)

  const [publishError, setPublishError] = useState<string | null>(null)
  const [publishing, setPublishing] = useState(false)

  // 这些放 ref 里：它们参与保存逻辑，但变化时不该触发重渲染或副作用
  const versionRef = useRef(0)
  const timerRef = useRef<number | null>(null)
  const previewTimerRef = useRef<number | null>(null)
  const inFlightRef = useRef(false)
  // 一旦发生冲突就停止自动保存，等人来处理 —— 继续自动写只会不断覆盖别人的修改
  const conflictRef = useRef(false)

  function applyLoaded(p: PostDetail) {
    setPost(p)
    setTitle(p.title)
    setSummary(p.summary ?? '')
    setContentMd(p.contentMd)
    setTagsText(p.tags.join(', '))
    versionRef.current = p.version
  }

  useEffect(() => {
    let cancelled = false
    postsApi
      .get(postId)
      .then((p) => {
        if (!cancelled) applyLoaded(p)
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err instanceof ApiError ? err.message : '加载失败')
      })
    return () => {
      cancelled = true
    }
  }, [postId])

  /** @return 是否真的保存成功。发布流程要靠它决定能不能继续。 */
  const doSave = useCallback(async (): Promise<boolean> => {
    if (!post || inFlightRef.current || conflictRef.current) return false
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
      return true
    } catch (err) {
      if (err instanceof ApiError && err.code === Code.CONFLICT) {
        conflictRef.current = true
        setSave({ kind: 'conflict' })
        return false
      }
      setSave({
        kind: 'failed',
        message: err instanceof ApiError ? `${err.message}（${err.code}）` : '保存失败',
      })
      return false
    } finally {
      inFlightRef.current = false
    }
  }, [post, title, summary, contentMd, tagsText])

  const refreshPreview = useCallback(async () => {
    if (!post) return
    try {
      setPreview(await postsApi.preview(post.id, contentMd))
      setPreviewError(null)
    } catch (err) {
      setPreviewError(err instanceof ApiError ? err.message : '预览失败')
    }
  }, [post, contentMd])

  const scheduleSave = useCallback(() => {
    if (conflictRef.current) return
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      void doSave()
    }, AUTOSAVE_DELAY_MS)
  }, [doSave])

  const schedulePreview = useCallback(() => {
    if (previewTimerRef.current !== null) window.clearTimeout(previewTimerRef.current)
    previewTimerRef.current = window.setTimeout(() => {
      void refreshPreview()
    }, PREVIEW_DELAY_MS)
  }, [refreshPreview])

  // 首次加载完先渲染一次预览
  useEffect(() => {
    if (post) void refreshPreview()
    // 只在切换文章时跑一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post?.id])

  // 离开页面时清掉待触发的定时器，免得对着已卸载的组件干活
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
      if (previewTimerRef.current !== null) window.clearTimeout(previewTimerRef.current)
    }
  }, [])

  function edit(setter: (v: string) => void) {
    return (v: string) => {
      setter(v)
      setSave({ kind: 'dirty' })
      scheduleSave()
    }
  }

  /** 正文改动除了自动保存，还要刷预览 */
  function editContent(v: string) {
    setContentMd(v)
    setSave({ kind: 'dirty' })
    scheduleSave()
    schedulePreview()
  }

  /**
   * 发布。
   *
   * **必须先保存再发布。** 自动保存有 30 秒延迟，用户打完字立刻点发布时，
   * 服务端的工作副本还是旧的 —— 直接调发布接口就会把旧内容发出去。
   */
  async function publish() {
    if (!post) return
    setPublishing(true)
    setPublishError(null)
    try {
      const saved = await doSave()
      if (!saved) {
        setPublishError('没能保存最新内容，已中止发布。先解决上面的保存问题。')
        return
      }
      applyLoaded(await postsApi.publish(post.id))
      setSave({ kind: 'clean' })
    } catch (err) {
      // 30007 缺摘要、30002 slug 撞车、30003 排期时间在过去
      setPublishError(err instanceof ApiError ? `${err.message}（${err.code}）` : '发布失败')
    } finally {
      setPublishing(false)
    }
  }

  async function archive() {
    if (!post) return
    setPublishing(true)
    setPublishError(null)
    try {
      applyLoaded(await postsApi.archive(post.id))
    } catch (err) {
      setPublishError(err instanceof ApiError ? `${err.message}（${err.code}）` : '归档失败')
    } finally {
      setPublishing(false)
    }
  }

  function reload() {
    conflictRef.current = false
    setSave({ kind: 'clean' })
    void postsApi.get(postId).then(applyLoaded)
  }

  if (loadError) return <p style={{ color: 'var(--danger)' }}>{loadError}</p>
  if (!post) return <p style={{ color: 'var(--text-muted)' }}>加载中…</p>

  const tags = parseTags(tagsText)
  const canArchive = post.status === 'PUBLISHED'
  const canRestore = post.status === 'ARCHIVED'

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button onClick={onBack} className="text-sm underline" style={{ color: 'var(--text-muted)' }}>
          ← 返回列表
        </button>
        <SaveIndicator state={save} />
      </div>

      {save.kind === 'conflict' && (
        <Banner>
          这篇内容已在别处被修改，你手上的版本已过期。自动保存已停止，以免覆盖别人的改动。
          <button onClick={reload} className="ml-3 underline">
            放弃本地修改并重新加载
          </button>
        </Banner>
      )}

      {save.kind === 'failed' && (
        <Banner>
          <strong>保存失败：{save.message}</strong>
          <span className="ml-2">修改还在这个页面上，但尚未存到服务端，别关页面。</span>
          <button onClick={() => void doSave()} className="ml-3 underline">
            重试
          </button>
        </Banner>
      )}

      {publishError && <Banner>{publishError}</Banner>}

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
        className="mb-3 w-full rounded border px-3 py-2 text-sm outline-none"
        style={fieldStyle}
      />
      {tags.length > MAX_TAGS && (
        <p className="mb-3 text-xs" style={{ color: 'var(--danger)' }}>
          已经有 {tags.length} 个标签，超过上限 {MAX_TAGS} 个，保存会被拒绝（30004）
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <textarea
          value={contentMd}
          onChange={(e) => editContent(e.target.value)}
          placeholder="用 Markdown 写正文…"
          spellCheck={false}
          className="rounded border px-3 py-2 font-mono text-sm outline-none"
          style={{ ...fieldStyle, minHeight: '30rem', lineHeight: 1.7 }}
        />

        <div
          className="overflow-auto rounded border px-4 py-2"
          style={{ ...fieldStyle, minHeight: '30rem', maxHeight: '46rem' }}
        >
          <div className="mb-2 flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
            <span>预览（{PREVIEW_DELAY_MS / 1000} 秒防抖，无需保存）</span>
            {preview && (
              <span>
                {preview.wordCount} 字 · 约 {preview.readingMinutes} 分钟
              </span>
            )}
          </div>
          {previewError ? (
            <p className="text-sm" style={{ color: 'var(--danger)' }}>
              {previewError}
            </p>
          ) : (
            // 这份 HTML 是后端从**你自己的正文**渲染出来的，允许原始 HTML 通过是刻意的，
            // 见 shared/util/MarkdownRenderer.kt。等出现公开投稿入口时这里要重新评估。
            <div className="preview-body" dangerouslySetInnerHTML={{ __html: preview?.html ?? '' }} />
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        <button
          onClick={() => void doSave()}
          disabled={save.kind === 'saving' || save.kind === 'conflict'}
          className="rounded border px-3 py-1.5 disabled:opacity-40"
          style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
        >
          保存草稿
        </button>

        <button
          onClick={() => void publish()}
          disabled={publishing || save.kind === 'conflict'}
          className="rounded px-3 py-1.5 font-medium disabled:opacity-40"
          style={{ background: 'var(--accent)', color: '#0a0a0b' }}
        >
          {publishing ? '发布中…' : post.status === 'PUBLISHED' ? '更新线上' : '发布'}
        </button>

        {canArchive && (
          <button onClick={() => void archive()} disabled={publishing} className="underline disabled:opacity-40">
            归档
          </button>
        )}
        {canRestore && (
          <button
            onClick={() => void postsApi.restore(post.id).then(applyLoaded).catch((e: unknown) =>
              setPublishError(e instanceof ApiError ? e.message : '恢复失败'),
            )}
            disabled={publishing}
            className="underline disabled:opacity-40"
          >
            恢复
          </button>
        )}

        <span style={{ color: 'var(--text-muted)' }}>
          {post.slug} ｜ 版本 {versionRef.current} ｜ {STATUS_LABEL[post.status]} ｜{' '}
          {post.visibility === 'PRIVATE' ? '私密' : '公开'}
          {post.hasUnpublishedChanges ? ' ｜ ● 有未发布的修改' : ''}
        </span>
      </div>
    </div>
  )
}

const STATUS_LABEL: Record<PostDetail['status'], string> = {
  DRAFT: '草稿',
  SCHEDULED: '已排期',
  PUBLISHED: '已发布',
  ARCHIVED: '已归档',
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

function Banner({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mb-4 rounded border px-4 py-3 text-sm"
      style={{ borderColor: 'var(--danger)', background: 'rgba(248,113,113,.1)', color: 'var(--danger)' }}
    >
      {children}
    </div>
  )
}

const fieldStyle: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  borderColor: 'var(--border)',
  color: 'var(--text)',
}
