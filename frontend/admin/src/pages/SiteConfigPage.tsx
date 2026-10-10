import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '../api/client'
import { buildsApi } from '../api/builds'
import { siteConfigApi } from '../api/siteConfig'
import type { SiteBuildInfo } from '../api/types'

/** 预览防抖。预览是一次纯渲染，改完就该看到 */
const PREVIEW_DELAY_MS = 500

type SaveState =
  | { kind: 'clean' }
  | { kind: 'dirty' }
  | { kind: 'saving' }
  | { kind: 'saved'; at: Date }
  | { kind: 'failed'; message: string }

/**
 * 站点配置：站名、SEO 简介、关于页正文。
 *
 * **这里不做自动保存**，是刻意的：保存本身就是上线动作 —— 存下来就会触发一次站点重建，
 * 让定时器每 30 秒替我按一次「上线」是不对的。文章编辑器那边能自动保存，是因为那儿存的
 * 是工作副本，不上线。
 */
export function SiteConfigPage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [aboutMarkdown, setAboutMarkdown] = useState('')
  const [preview, setPreview] = useState('')
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [save, setSave] = useState<SaveState>({ kind: 'clean' })
  const [builds, setBuilds] = useState<SiteBuildInfo[] | null>(null)
  const [buildBusy, setBuildBusy] = useState(false)

  /**
   * 正文的最新值。
   *
   * 防抖回调必须从这里读，不能闭包捕获 state —— 捕获 state 的话定时器跑在「上一次渲染」
   * 的作用域里，读到的永远是上一次的值，表现就是预览慢一拍。
   */
  const latestAbout = useRef('')
  const dirtyRef = useRef(false)
  const previewTimer = useRef<number | null>(null)

  const refreshPreview = useCallback(async (markdown: string) => {
    try {
      setPreview((await siteConfigApi.preview(markdown)).html)
      setPreviewError(null)
    } catch (err) {
      setPreviewError(err instanceof ApiError ? err.message : '预览失败')
    }
  }, [])

  const refreshBuilds = useCallback(async () => {
    try {
      setBuilds((await buildsApi.list(1, 5)).items)
    } catch {
      // 构建状态只是附带信息，拉不到不该挡着改配置
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    siteConfigApi
      .get()
      .then((config) => {
        if (cancelled) return
        setTitle(config.title)
        setDescription(config.description)
        setAboutMarkdown(config.aboutMarkdown)
        latestAbout.current = config.aboutMarkdown
        void refreshPreview(config.aboutMarkdown)
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err instanceof ApiError ? err.message : '加载失败')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    void refreshBuilds()
    return () => {
      cancelled = true
      if (previewTimer.current !== null) window.clearTimeout(previewTimer.current)
    }
  }, [refreshPreview, refreshBuilds])

  // 关标签页 / 刷新时提醒：这里没有自动保存，走了就真丢了
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (!dirtyRef.current) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  // 有排队中的构建就每 10 秒看一眼，落地了自动停
  const pendingBuilds = builds?.filter((b) => b.status === 'PENDING').length ?? 0
  useEffect(() => {
    if (pendingBuilds === 0) return
    const timer = window.setInterval(() => void refreshBuilds(), 10_000)
    return () => window.clearInterval(timer)
  }, [pendingBuilds, refreshBuilds])

  function markDirty() {
    dirtyRef.current = true
    setSave({ kind: 'dirty' })
  }

  function changeAbout(value: string) {
    latestAbout.current = value
    setAboutMarkdown(value)
    markDirty()
    if (previewTimer.current !== null) window.clearTimeout(previewTimer.current)
    previewTimer.current = window.setTimeout(() => void refreshPreview(latestAbout.current), PREVIEW_DELAY_MS)
  }

  async function doSave() {
    setSave({ kind: 'saving' })
    try {
      // 服务端会把站名、简介两端的空白去掉，所以存完把响应写回输入框
      const saved = await siteConfigApi.save({ title, description, aboutMarkdown: latestAbout.current })
      setTitle(saved.title)
      setDescription(saved.description)
      setAboutMarkdown(saved.aboutMarkdown)
      latestAbout.current = saved.aboutMarkdown
      dirtyRef.current = false
      setSave({ kind: 'saved', at: new Date() })
      void refreshBuilds()
    } catch (err) {
      setSave({
        kind: 'failed',
        message: err instanceof ApiError ? `${err.message}（${err.code}）` : '保存失败',
      })
    }
  }

  async function triggerBuild() {
    setBuildBusy(true)
    try {
      await buildsApi.trigger()
      await refreshBuilds()
    } catch (err) {
      setSave({
        kind: 'failed',
        message: err instanceof ApiError ? `${err.message}（${err.code}）` : '触发构建失败',
      })
    } finally {
      setBuildBusy(false)
    }
  }

  if (loadError) return <div className="banner banner--danger">{loadError}</div>
  if (loading) return <p className="muted">加载中…</p>

  const lastBuild = builds?.find((b) => b.status !== 'PENDING')

  return (
    <div>
      <p className="muted" style={{ marginBottom: 14 }}>
        这里改的是站点自己的文字。保存就是上线动作 —— 存下来之后站点会重建，没有单独的「发布」。
      </p>

      {save.kind === 'failed' && (
        <div className="banner banner--danger">
          <strong>保存失败：{save.message}</strong>
          <span className="ml-2">改动还在这个页面上，没有自动保存，别关页面。</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <div className="field-label">站名</div>
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              markDirty()
            }}
            placeholder="浏览器标签栏、页头、页脚都用它"
            className="field"
          />
        </div>
        <div>
          <div className="field-label">站点简介</div>
          <input
            value={description}
            onChange={(e) => {
              setDescription(e.target.value)
              markDirty()
            }}
            placeholder="给搜索引擎和社交卡片用的一句话"
            className="field"
          />
        </div>
      </div>

      <div className="field-label" style={{ marginBottom: 6, marginTop: 18 }}>
        关于页正文（Markdown）
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <textarea
          value={aboutMarkdown}
          onChange={(e) => changeAbout(e.target.value)}
          placeholder="用 Markdown 写关于页…"
          spellCheck={false}
          className="field field--mono"
          style={{ lineHeight: 1.7, minHeight: '30rem' }}
        />

        <div className="panel" style={{ maxHeight: '46rem', minHeight: '30rem', overflow: 'auto', padding: '8px 14px' }}>
          <div className="faint" style={{ fontSize: 12, marginBottom: 8 }}>
            预览（渲染器与文章发布是同一个，所以这就是上线后的样子）
          </div>
          {previewError ? (
            <p className="text-sm" style={{ color: 'var(--danger)' }}>
              {previewError}
            </p>
          ) : (
            // 允许原始 HTML 通过是刻意的，理由见 shared/util/MarkdownRenderer.kt
            <div className="preview-body" dangerouslySetInnerHTML={{ __html: preview }} />
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        <button onClick={() => void doSave()} disabled={save.kind === 'saving'} className="btn btn--primary">
          {save.kind === 'saving' ? '保存中…' : '保存并重建站点'}
        </button>
        <SaveIndicator state={save} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        <span style={{ color: 'var(--text-muted)' }}>站点</span>
        {builds === null ? (
          <span className="faint">读取中…</span>
        ) : pendingBuilds > 0 ? (
          <span>已排队重建（{pendingBuilds} 条待触发，最多等 30 秒）</span>
        ) : lastBuild ? (
          lastBuild.status === 'FAILED' ? (
            <span style={{ color: 'var(--danger)' }}>最近构建失败：{lastBuild.error ?? '原因见日志'}</span>
          ) : (
            <span>最近构建：成功 {formatTime(lastBuild.firedAt)}</span>
          )
        ) : (
          <span className="faint">还没触发过构建</span>
        )}
        {lastBuild?.runUrl && (
          <a href={lastBuild.runUrl} target="_blank" rel="noreferrer" className="underline">
            Actions ↗
          </a>
        )}
        <button className="btn btn--ghost" onClick={() => void triggerBuild()} disabled={buildBusy}>
          {buildBusy ? '触发中…' : '立即重建'}
        </button>
      </div>
    </div>
  )
}

function formatTime(iso: string | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('zh-CN', { hour12: false })
}

function SaveIndicator({ state }: { state: SaveState }) {
  switch (state.kind) {
    case 'clean':
      return <span className="muted">未改动</span>
    case 'dirty':
      return <span className="muted">有改动，还没保存</span>
    case 'saving':
      return <span className="muted">保存中…</span>
    case 'saved':
      return <span className="muted">已保存 {state.at.toLocaleTimeString('zh-CN', { hour12: false })}</span>
    case 'failed':
      return <span style={{ color: 'var(--danger)', fontWeight: 500 }}>● 未保存</span>
  }
}