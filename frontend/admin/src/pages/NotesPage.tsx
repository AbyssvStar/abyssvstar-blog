import { useEffect, useState } from 'react'
import { ApiError } from '../api/client'
import { notesApi } from '../api/notes'
import { postsApi } from '../api/posts'
import type { AssetInfo, NoteInfo, Visibility } from '../api/types'

const PAGE_SIZE = 20

export function NotesPage() {
  const [notes, setNotes] = useState<NoteInfo[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [content, setContent] = useState('')
  const [visibility, setVisibility] = useState<Visibility>('PUBLIC')
  const [images, setImages] = useState<AssetInfo[]>([])
  const [editing, setEditing] = useState<NoteInfo | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editVisibility, setEditVisibility] = useState<Visibility>('PUBLIC')
  const [editImages, setEditImages] = useState<AssetInfo[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load(nextPage = page) {
    try {
      const data = await notesApi.list(nextPage, PAGE_SIZE)
      setNotes(data.items)
      setPage(data.page)
      setTotalPages(Math.max(1, data.totalPages))
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : '动态加载失败')
    }
  }

  useEffect(() => { void load(1) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function upload(files: File[]) {
    if (files.length === 0) return
    setBusy(true)
    setError(null)
    try {
      const slots = Math.max(0, 4 - images.length)
      for (const file of files.slice(0, slots)) {
        const uploaded = await postsApi.uploadAsset(file)
        setImages((current) => [...current, uploaded])
      }
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : '图片上传失败')
    } finally {
      setBusy(false)
    }
  }

  async function publish() {
    if (!content.trim()) return
    setBusy(true)
    setError(null)
    try {
      await notesApi.create({ content, visibility, assetIds: images.map((image) => image.id) })
      setContent('')
      setImages([])
      await load(1)
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : '发布失败')
    } finally {
      setBusy(false)
    }
  }

  async function uploadEdit(files: File[]) {
    if (files.length === 0) return
    setBusy(true)
    setError(null)
    try {
      const slots = Math.max(0, 4 - editImages.length)
      for (const file of files.slice(0, slots)) {
        const uploaded = await postsApi.uploadAsset(file)
        setEditImages((current) => [...current, uploaded])
      }
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : '图片上传失败')
    } finally {
      setBusy(false)
    }
  }

  function startEdit(note: NoteInfo) {
    setError(null)
    setEditing(note)
    setEditContent(note.content)
    setEditVisibility(note.visibility)
    setEditImages(note.images)
  }

  async function saveEdit() {
    if (!editing) return
    setBusy(true)
    setError(null)
    try {
      await notesApi.update(editing.id, {
        content: editContent,
        visibility: editVisibility,
        assetIds: editImages.map((image) => image.id),
      })
      setEditing(null)
      await load()
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : '保存失败')
    } finally {
      setBusy(false)
    }
  }

  async function action(note: NoteInfo, kind: 'archive' | 'restore' | 'delete') {
    if (kind === 'delete' && !window.confirm('删除这条动态？线上会立即消失。')) return
    setBusy(true)
    try {
      if (kind === 'archive') await notesApi.archive(note.id)
      else if (kind === 'restore') await notesApi.restore(note.id)
      else await notesApi.remove(note.id)
      await load()
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : '操作失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="quick-note">
        <div className="quick-note__head">
          <strong>随手发</strong>
          <span className="muted">纯文本，最多 500 字</span>
        </div>
        <textarea
          className="field field--mono"
          value={content}
          maxLength={500}
          onChange={(event) => setContent(event.target.value)}
          placeholder="现在想说什么？"
          style={{ minHeight: 110 }}
        />
        <div className="quick-note__images">
          {images.map((image) => (
            <div key={image.id} className="quick-note__image">
              <img src={image.variants?.w400 ?? image.url} alt="" />
              <button type="button" aria-label="移除图片" onClick={() => setImages((current) => current.filter((item) => item.id !== image.id))}>×</button>
            </div>
          ))}
          {images.length < 4 && (
            <label className="quick-note__add">
              +
              <input
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(event) => {
                  const input = event.currentTarget
                  const files = Array.from(input.files ?? [])
                  input.value = ''
                  void upload(files)
                }}
              />
            </label>
          )}
        </div>
        <div className="quick-note__footer">
          <select className="field" value={visibility} onChange={(event) => setVisibility(event.target.value as Visibility)}>
            <option value="PUBLIC">公开</option>
            <option value="PRIVATE">私密</option>
          </select>
          <span className="muted">{content.length}/500</span>
          <button className="btn btn--primary" onClick={() => void publish()} disabled={busy || !content.trim()}>
            {busy ? '处理中…' : '发布动态'}
          </button>
        </div>
      </div>

      {error && <div className="banner banner--danger">{error}</div>}
      <div className="notes-admin-list">
        {notes.map((note) => (
          <article key={note.id} className="note-admin">
            <div className="note-admin__meta">
              <span>{new Date(note.publishedAt).toLocaleString('zh-CN', { hour12: false })}</span>
              <span className="badge">{note.visibility === 'PUBLIC' ? '公开' : '私密'}</span>
              <span className="badge">{note.status === 'PUBLISHED' ? '已发布' : '已归档'}</span>
              <span className="faint">{note.viewCount} 阅读</span>
            </div>
            {editing?.id === note.id ? (
              <div>
                <textarea
                  className="field"
                  value={editContent}
                  maxLength={500}
                  onChange={(event) => setEditContent(event.target.value)}
                  aria-label="动态内容"
                />
                <div className="quick-note__images">
                  {editImages.map((image) => (
                    <div key={image.id} className="quick-note__image">
                      <img src={image.variants?.w400 ?? image.url} alt="" />
                      <button type="button" aria-label="移除图片" onClick={() => setEditImages((current) => current.filter((item) => item.id !== image.id))}>×</button>
                    </div>
                  ))}
                  {editImages.length < 4 && (
                    <label className="quick-note__add">
                      +
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        hidden
                        onChange={(event) => {
                          const input = event.currentTarget
                          const files = Array.from(input.files ?? [])
                          input.value = ''
                          void uploadEdit(files)
                        }}
                      />
                    </label>
                  )}
                </div>
                <div className="flex gap-2 mt-2">
                  <select className="field" value={editVisibility} onChange={(event) => setEditVisibility(event.target.value as Visibility)}>
                    <option value="PUBLIC">公开</option>
                    <option value="PRIVATE">私密</option>
                  </select>
                  <button className="btn btn--primary" onClick={() => void saveEdit()} disabled={busy}>保存</button>
                  <button className="btn" onClick={() => setEditing(null)}>取消</button>
                </div>
              </div>
            ) : (
              <p className="note-admin__content">{note.content}</p>
            )}
            <div className="note-admin__actions">
              <button className="btn btn--ghost" onClick={() => startEdit(note)}>编辑</button>
              {note.status === 'PUBLISHED' ? (
                <button className="btn btn--ghost" onClick={() => void action(note, 'archive')} disabled={busy}>归档</button>
              ) : (
                <button className="btn btn--ghost" onClick={() => void action(note, 'restore')} disabled={busy}>恢复</button>
              )}
              <button className="btn btn--danger" onClick={() => void action(note, 'delete')} disabled={busy}>删除</button>
            </div>
          </article>
        ))}
      </div>
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button className="btn" disabled={page <= 1} onClick={() => void load(page - 1)}>上一页</button>
          <span className="muted">{page}/{totalPages}</span>
          <button className="btn" disabled={page >= totalPages} onClick={() => void load(page + 1)}>下一页</button>
        </div>
      )}
    </div>
  )
}