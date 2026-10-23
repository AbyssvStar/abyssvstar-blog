import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ViewCounter } from '@/components/ViewCounter'
import { CommentSection } from '@/components/CommentSection'
import { ImageZoom } from '@/components/ImageZoom'
import { getNote, getNotes } from '@/lib/content'
import { dateParts, excerpt } from '@/lib/format'

export const dynamicParams = false

export async function generateStaticParams() {
  const notes = await getNotes()
  // output: export 不允许动态路由零参数；占位页会在构建时落到 404。
  return notes.length > 0 ? notes.map((note) => ({ id: String(note.id) })) : [{ id: '0' }]
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const note = await getNote(Number(id))
  if (!note) return {}
  const date = dateParts(note.publishedAt)
  return {
    // 动态没有标题，标签页就别拿数据库自增 id 当名字：用正文头一句，认得出是哪条
    title: excerpt(note.content, 26) || `${date.month} 月 ${date.day} 日的动态`,
    description: excerpt(note.content, 120),
    alternates: { canonical: `/notes/${note.id}/` },
  }
}

export default async function NoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [note, notes] = await Promise.all([getNote(Number(id)), getNotes()])
  if (!note) notFound()

  const index = notes.findIndex((item) => item.id === note.id)
  const older = index >= 0 && index < notes.length - 1 ? notes[index + 1] : null
  const newer = index > 0 ? notes[index - 1] : null
  const date = dateParts(note.publishedAt)
  const number = index >= 0 ? notes.length - index : 0

  return (
    <div className="wrap note-detail-page">
      <div className="note-bar">
        <Link href="/notes/" className="note-bar__back">
          ← 全部动态
        </Link>
        <span className="note-bar__no">
          #{String(number).padStart(2, '0')} / {String(notes.length).padStart(2, '0')}
        </span>
      </div>

      <article className="note-spread" id="note-detail">
        {/* 动态没有标题，正文就是全部内容；这里给读屏和搜索引擎留一个页级标题 */}
        <h1 className="sr-only">
          第 {number} 条动态 · {date.year} 年 {date.month} 月 {date.day} 日
        </h1>
        <aside className="note-spread__rail">
          <time className="note-spread__day" dateTime={note.publishedAt}>
            {date.day}
          </time>
          <span className="note-spread__date">
            {date.year}.{date.month}
          </span>
          <span className="note-spread__weekday">
            {date.weekday} · {date.clock}
          </span>
          <span className="note-spread__views">
            <ViewCounter type="NOTE" id={note.id} />
          </span>
        </aside>

        <div className="note-spread__main">
          <p className="note-spread__text">{note.content}</p>

          {note.images.length > 0 && (
            <div className={`note-spread__media note-spread__media--${Math.min(note.images.length, 4)}`}>
              {note.images.map((image) => (
                <img
                  key={image.id}
                  src={image.variants?.w800 ?? image.variants?.w400 ?? image.url}
                  alt=""
                  width={image.width}
                  height={image.height}
                  loading="lazy"
                  decoding="async"
                />
              ))}
            </div>
          )}

          <nav className="note-adjacent" aria-label="相邻动态">
            {older ? (
              <Link href={`/notes/${older.id}/`} className="note-adjacent__cell">
                <span className="note-adjacent__label">← 更早</span>
                <span className="note-adjacent__text">{excerpt(older.content)}</span>
              </Link>
            ) : (
              <span className="note-adjacent__cell note-adjacent__cell--empty">
                <span className="note-adjacent__label">← 更早</span>
                <span className="note-adjacent__text">这是最早的一条</span>
              </span>
            )}
            {newer ? (
              <Link href={`/notes/${newer.id}/`} className="note-adjacent__cell note-adjacent__cell--next">
                <span className="note-adjacent__label">更新 →</span>
                <span className="note-adjacent__text">{excerpt(newer.content)}</span>
              </Link>
            ) : (
              <span className="note-adjacent__cell note-adjacent__cell--next note-adjacent__cell--empty">
                <span className="note-adjacent__label">更新 →</span>
                <span className="note-adjacent__text">这是最新的一条</span>
              </span>
            )}
          </nav>
        </div>
      </article>

      <div className="note-comments">
        <CommentSection noteId={note.id} />
      </div>

      <ImageZoom containerId="note-detail" />
    </div>
  )
}
