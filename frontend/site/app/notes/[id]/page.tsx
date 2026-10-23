import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ViewCounter } from '@/components/ViewCounter'
import { CommentSection } from '@/components/CommentSection'
import { getNote, getNotes } from '@/lib/content'
import { formatDate } from '@/lib/format'

export const dynamicParams = false

export async function generateStaticParams() {
  const notes = await getNotes()
  // output: export 不允许动态路由零参数；占位页会在构建时落到 404。
  return notes.length > 0 ? notes.map((note) => ({ id: String(note.id) })) : [{ id: '0' }]
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const note = await getNote(Number(id))
  return note
    ? { title: `动态 ${note.id}`, description: note.content.slice(0, 120), alternates: { canonical: `/notes/${note.id}/` } }
    : {}
}

export default async function NoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const note = await getNote(Number(id))
  if (!note) notFound()

  return (
    <div className="wrap note-detail-page">
      <Link href="/notes/" className="mono faint">← 全部动态</Link>
      <article className="note-detail">
        <div className="note-detail__meta mono faint">
          {formatDate(note.publishedAt)} · <ViewCounter type="NOTE" id={note.id} />
        </div>
        <p className="note-detail__content">{note.content}</p>
        {note.images.length > 0 && (
          <div className={`note-card__images note-card__images--detail note-card__images--${Math.min(note.images.length, 4)}`}>
            {note.images.map((image) => (
              <img
                key={image.id}
                src={image.variants?.w800 ?? image.url}
                alt=""
                width={image.width}
                height={image.height}
                loading="lazy"
                decoding="async"
              />
            ))}
          </div>
        )}
      </article>
      <CommentSection noteId={note.id} />
    </div>
  )
}