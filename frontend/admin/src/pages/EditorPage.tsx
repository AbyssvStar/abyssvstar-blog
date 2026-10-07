import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, Code } from '../api/client'
import { parseTags, postsApi } from '../api/posts'
import type { PostDetail, PreviewResponse } from '../api/types'

/** 自动保存：停止输入多久之后写一次（docs/04 §5 定的是 30 秒） */
const AUTOSAVE_DELAY_MS = 30_000

/**
 * 预览的防抖。比自动保存短得多 —— 预览是一次无副作用的纯渲染，
 * 而「改完立刻看到效果」正是它存在的理由。
 */
const PREVIEW_DELAY_MS = 600

/** slug 跟随标题时的防抖。这个要调接口，不能每次按键都打 */
const SLUG_DELAY_MS = 800

const MAX_TAGS = 5

interface Draft {
  title: string
  summary: string
  contentMd: string
  tagsText: string
  slug: string
}

const EMPTY_DRAFT: Draft = { title: '', summary: '', contentMd: '', tagsText: '', slug: '' }

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

  // 这些只是为了渲染；参与保存/预览逻辑的一律读 draftRef
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [contentMd, setContentMd] = useState('')
  const [tagsText, setTagsText] = useState('')
  const [slug, setSlug] = useState('')

  const [save, setSave] = useState<SaveState>({ kind: 'clean' })
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [publishing, setPublishing] = useState(false)

  /**
   * 草稿的最新值。
   *
   * **防抖回调必须从这里读，不能闭包捕获 state。**
   * 捕获 state 的话，定时器在「上一次渲染」的作用域里跑，读到的永远是上一次的值 ——
   * 表现就是预览慢一拍：改完没反应，再改一次才动。
   */
  const draftRef = useRef<Draft>({ ...EMPTY_DRAFT })
  const versionRef = useRef(0)
  const dirtyRef = useRef(false)
  const inFlightRef = useRef(false)
  // 一旦冲突就停止自动保存，等人处理 —— 继续写只会不断覆盖别人的修改
  const conflictRef = useRef(false)
  // 用户手动改过 slug 之后，它就不再跟随标题
  const slugTouchedRef = useRef(false)

  const saveTimer = useRef<number | null>(null)
  const previewTimer = useRef<number | null>(null)
  const slugTimer = useRef<number | null>(null)

  // ---------- 只依赖 postId 的稳定回调 ----------

  const doSave = useCallback(async (): Promise<boolean> => {
    if (inFlightRef.current || conflictRef.current) return false
    inFlightRef.current = true
    setSave({ kind: 'saving' })

    const d = draftRef.current
    try {
      const updated = await postsApi.update(postId, {
        title: d.title,
        summary: d.summary,
        contentMd: d.contentMd,
        // 空 slug 就不发，交给后端保留原值
        slug: d.slug.trim() || undefined,
        tags: parseTags(d.tagsText),
        // 关键：带上版本。后端对不上就 409，而不是覆盖别人的修改
        version: versionRef.current,
      })
      // 版本从响应里取，不能用旧的 —— 每次成功保存后端都会 +1
      versionRef.current = updated.version
      dirtyRef.current = false
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
  }, [postId])

  const refreshPreview = useCallback(async () => {
    try {
      setPreview(await postsApi.preview(postId, draftRef.current.contentMd))
      setPreviewError(null)
    } catch (err) {
      setPreviewError(err instanceof ApiError ? err.message : '预览失败')
    }
  }, [postId])

  const suggestSlug = useCallback(async () => {
    const t = draftRef.current.title
    if (!t.trim()) return
    try {
      const { slug: s } = await postsApi.suggestSlug(t)
      if (!slugTouchedRef.current && s) {
        draftRef.current.slug = s
        setSlug(s)
      }
    } catch {
      // slug 建议失败不该打断写作，静默即可
    }
  }, [postId])

  const scheduleSave = useCallback(() => {
    if (conflictRef.current) return
    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => void doSave(), AUTOSAVE_DELAY_MS)
  }, [doSave])

  const schedulePreview = useCallback(() => {
    if (previewTimer.current !== null) window.clearTimeout(previewTimer.current)
    previewTimer.current = window.setTimeout(() => void refreshPreview(), PREVIEW_DELAY_MS)
  }, [refreshPreview])

  const scheduleSlugSuggest = useCallback(() => {
    if (slugTimer.current !== null) window.clearTimeout(slugTimer.current)
    slugTimer.current = window.setTimeout(() => void suggestSlug(), SLUG_DELAY_MS)
  }, [suggestSlug])

  const applyDraft = useCallback(
    (patch: Partial<Draft>, opts?: { preview?: boolean; followSlug?: boolean }) => {
      Object.assign(draftRef.current, patch)
      if (patch.title !== undefined) setTitle(patch.title)
      if (patch.summary !== undefined) setSummary(patch.summary)
      if (patch.contentMd !== undefined) setContentMd(patch.contentMd)
      if (patch.tagsText !== undefined) setTagsText(patch.tagsText)
      if (patch.slug !== undefined) setSlug(patch.slug)

      dirtyRef.current = true
      setSave({ kind: 'dirty' })
      scheduleSave()
      if (opts?.preview) schedulePreview()
      if (opts?.followSlug && !slugTouchedRef.current) scheduleSlugSuggest()
    },
    [scheduleSave, schedulePreview, scheduleSlugSuggest],
  )

  const applyLoaded = useCallback((p: PostDetail) => {
    const d: Draft = {
      title: p.title,
      summary: p.summary ?? '',
      contentMd: p.contentMd,
      tagsText: p.tags.join(', '),
      slug: p.slug,
    }
    draftRef.current = d
    versionRef.current = p.version
    dirtyRef.current = false
    setPost(p)
    setTitle(d.title)
    setSummary(d.summary)
    setContentMd(d.contentMd)
    setTagsText(d.tagsText)
    setSlug(d.slug)
  }, [])

  // ---------- 生命周期 ----------

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
  }, [postId, applyLoaded])

  // 首次加载完渲染一次预览
  useEffect(() => {
    if (post) void refreshPreview()
  }, [post?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // 关标签页 / 刷新时提醒
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (!dirtyRef.current) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  // 卸载时清掉所有待触发的定时器
  useEffect(() => {
    return () => {
      for (const t of [saveTimer, previewTimer, slugTimer]) {
        if (t.current !== null) window.clearTimeout(t.current)
      }
    }
  }, [])

  // ---------- 动作 ----------

  /** 返回列表。有未保存的改动就先问一句 —— 自动保存有 30 秒延迟，这时候走人就丢稿 */
  async function goBack() {
    if (dirtyRef.current) {
      const leave = window.confirm(
        '有改动还没保存。\n\n点「确定」先保存再返回；点「取消」留在本页继续编辑。',
      )
      if (!leave) return
      const ok = await doSave()
      // 保存失败就别走，改动还在这个页面上
      if (!ok) return
    }
    onBack()
  }

  /**
   * 发布。
   *
   * **有改动时必须先保存再发布。** 自动保存有 30 秒延迟，打完字立刻点发布的话，
   * 服务端的工作副本还是旧的 —— 直接调发布接口就会把旧内容发出去。
   */
  async function publish() {
    setPublishing(true)
    setPublishError(null)
    try {
      if (dirtyRef.current) {
        const saved = await doSave()
        if (!saved) {
          setPublishError('没能保存最新内容，已中止发布。先解决上面的保存问题。')
          return
        }
      }
      applyLoaded(await postsApi.publish(postId))
      setSave({ kind: 'clean' })
    } catch (err) {
      // 30007 缺摘要、30002 slug 撞车
      setPublishError(err instanceof ApiError ? `${err.message}（${err.code}）` : '发布失败')
    } finally {
      setPublishing(false)
    }
  }

  async function archive() {
    setPublishing(true)
    setPublishError(null)
    try {
      applyLoaded(await postsApi.archive(postId))
      setSave({ kind: 'clean' })
    } catch (err) {
      setPublishError(err instanceof ApiError ? `${err.message}（${err.code}）` : '归档失败')
    } finally {
      setPublishing(false)
    }
  }

  /** 恢复 = 后端重新发布一次，按当前工作副本重建快照（docs/04 §3.2） */
  async function restore() {
    setPublishing(true)
    setPublishError(null)
    try {
      applyLoaded(await postsApi.restore(postId))
      setSave({ kind: 'clean' })
    } catch (err) {
      setPublishError(err instanceof ApiError ? `${err.message}（${err.code}）` : '恢复失败')
    } finally {
      setPublishing(false)
    }
  }

  function reload() {
    conflictRef.current = false
    setSave({ kind: 'clean' })
    void postsApi.get(postId).then(applyLoaded)
  }

  // ---------- 渲染 ----------

  if (loadError) return <div className="banner banner--danger">{loadError}</div>
  if (!post) return <p className="muted">加载中…</p>

  const tags = parseTags(tagsText)
  const archived = post.status === 'ARCHIVED'
  const publishedNoChange = post.status === 'PUBLISHED' && !post.hasUnpublishedChanges

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button onClick={() => void goBack()} className="btn btn--ghost">
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
        onChange={(e) => applyDraft({ title: e.target.value }, { followSlug: true })}
        placeholder="标题"
        className="field"
        style={{ fontSize: 17, fontWeight: 500, marginBottom: 10 }}
      />

      <div className="mb-1 flex items-center gap-2">
        <span className="shrink-0 text-xs" style={{ color: 'var(--text-muted)' }}>
          URL
        </span>
        <input
          value={slug}
          onChange={(e) => {
            // 手动改过之后就不再跟随标题 —— 这是「可手动覆盖」的落点
            slugTouchedRef.current = true
            applyDraft({ slug: e.target.value })
          }}
          placeholder="按标题自动生成"
          className="field field--mono"
        />
      </div>
      <p className="mb-3 text-xs" style={{ color: 'var(--text-muted)' }}>
        {slugTouchedRef.current
          ? '已手动指定，不再跟随标题'
          : '跟随标题自动生成（拼音）；手动改过之后就不再跟随'}
      </p>

      <input
        value={summary}
        onChange={(e) => applyDraft({ summary: e.target.value })}
        placeholder="摘要（公开文章发布时必填，SEO 用）"
        className="field"
        style={{ marginBottom: 10 }}
      />

      <input
        value={tagsText}
        onChange={(e) => applyDraft({ tagsText: e.target.value })}
        placeholder="标签，逗号分隔，最多 5 个"
        className="field"
        style={{ marginBottom: 14 }}
      />
      {tags.length > MAX_TAGS && (
        <p className="mb-3 text-xs" style={{ color: 'var(--danger)' }}>
          已经有 {tags.length} 个标签，超过上限 {MAX_TAGS} 个，保存会被拒绝（30004）
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <textarea
          value={contentMd}
          onChange={(e) => applyDraft({ contentMd: e.target.value }, { preview: true })}
          placeholder="用 Markdown 写正文…"
          spellCheck={false}
          className="field field--mono"
          style={{ lineHeight: 1.7, minHeight: '30rem' }}
        />

        <div className="panel" style={{ maxHeight: '46rem', minHeight: '30rem', overflow: 'auto', padding: '8px 14px' }}>
          <div className="faint" style={{ display: 'flex', fontSize: 12, justifyContent: 'space-between', marginBottom: 8 }}>
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
            // 这份 HTML 是后端从**你自己的正文**渲染出来的。允许原始 HTML 通过是刻意的，
            // 见 shared/util/MarkdownRenderer.kt。等出现公开投稿入口时这里要重新评估。
            <div className="preview-body" dangerouslySetInnerHTML={{ __html: preview?.html ?? '' }} />
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        <button
          onClick={() => void doSave()}
          disabled={save.kind === 'saving' || save.kind === 'conflict'}
          className="btn"
        >
          保存草稿
        </button>

        {/*
          归档状态下不显示发布按钮：docs/04 §3.2 里 ARCHIVED 只到 PUBLISHED 一条路，
          就是「恢复」。两个按钮做同一件事只会让人困惑，所以只留恢复。
        */}
        {archived ? (
          <button
            onClick={() => void restore()}
            disabled={publishing}
            className="btn btn--primary"
          >
            {publishing ? '恢复中…' : '恢复（重新发布）'}
          </button>
        ) : (
          <button
            onClick={() => void publish()}
            disabled={publishing || save.kind === 'conflict' || publishedNoChange}
            title={publishedNoChange ? '线上已是最新，没有需要发布的改动' : undefined}
            className="btn btn--primary"
          >
            {publishing ? '处理中…' : post.status === 'PUBLISHED' ? '更新线上' : '发布'}
          </button>
        )}

        {post.status === 'PUBLISHED' && (
          <button className="btn btn--ghost" onClick={() => void archive()} disabled={publishing}>
            归档
          </button>
        )}

        <span className="muted">
          {STATUS_LABEL[post.status]} ｜ {post.visibility === 'PRIVATE' ? '私密' : '公开'} ｜ 版本{' '}
          {versionRef.current}
          {post.hasUnpublishedChanges ? ' ｜ ● 有未发布的修改' : ' ｜ 线上已是最新'}
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
      return <span className="muted">未改动</span>
    case 'dirty':
      return <span className="muted">有改动，等待自动保存…</span>
    case 'saving':
      return <span className="muted">保存中…</span>
    case 'saved':
      return (
        <span className="muted">
          已保存 {state.at.toLocaleTimeString('zh-CN', { hour12: false })}
        </span>
      )
    case 'failed':
      return <span style={{ color: 'var(--danger)', fontWeight: 500 }}>● 未保存</span>
    case 'conflict':
      return <span style={{ color: 'var(--danger)', fontWeight: 500 }}>● 版本冲突</span>
  }
}

function Banner({ children }: { children: React.ReactNode }) {
  return <div className="banner banner--danger">{children}</div>
}
