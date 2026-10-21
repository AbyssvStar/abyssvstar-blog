import Link from 'next/link'
import type { ExportNote, ExportNoteImage } from '@/lib/content'
import { formatDate } from '@/lib/format'

export function NoteCard({ note, compact = false }: { note: ExportNote; compact?: boolean }) {
  return (
    <article className={compact ? 'note-card note-card--compact' : 'note-card'}>
      <div className="note-card__meta mono faint">{formatDate(note.publishedAt)}</div>
      <p className="note-card__content">{note.content}</p>
      {note.images.length > 0 && (
        <div className={`note-card__images note-card__images--${Math.min(note.images.length, 4)}`}>
          {note.images.slice(0, compact ? 2 : 4).map((image) => <NoteImage key={image.id} image={image} />)}
        </div>
      )}
      {!compact && (
        <Link href={`/notes/${note.id}/`} className="note-card__link">
          查看动态 →
        </Link>
      )}
    </article>
  )
}

function NoteImage({ image }: { image: ExportNoteImage }) {
  const src = image.variants?.w800 ?? image.variants?.w400 ?? image.url
  return (
    <img
      src={src}
      alt=""
      width={image.width}
      height={image.height}
      loading="lazy"
      decoding="async"
    />
  )
}