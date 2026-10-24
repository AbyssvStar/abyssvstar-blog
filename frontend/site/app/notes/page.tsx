import type { Metadata } from 'next'
import { getNotes } from '@/lib/content'
import type { ExportNote } from '@/lib/content'
import { NoteEntry } from '@/components/NoteEntry'
import { ImageZoom } from '@/components/ImageZoom'
import { Reveal } from '@/components/Reveal'
import { dateParts, formatDate } from '@/lib/format'

export const metadata: Metadata = {
  title: '动态',
  description: '随手记录与短动态。',
  alternates: { canonical: '/notes/' },
}

export default async function NotesPage() {
  const notes = await getNotes()
  const months = groupByMonth(notes)
  const latest = notes[0]?.publishedAt

  return (
    <div className="wrap notes-page">
      <header className="log-head">
        <div className="log-head__main">
          <div className="kicker">NOTES · LOG</div>
          <h1>动态</h1>
          <p className="muted">浮光落笔，星海留痕。</p>
        </div>
        <dl className="log-head__meta">
          <div>
            <dt>记录</dt>
            <dd>{String(notes.length).padStart(2, '0')}</dd>
          </div>
          <div>
            <dt>更新</dt>
            <dd>{formatDate(latest).replace(/-/g, '.')}</dd>
          </div>
        </dl>
      </header>

      {notes.length === 0 ? (
        <p className="log-empty">还没有动态。第一条会出现在这里。</p>
      ) : (
        <div className="note-feed" id="note-feed">
          {months.map(([key, items], monthIndex) => (
            <Reveal key={key} delay={Math.min(monthIndex, 3) * 60}>
              <section className="log-month">
                <div className="log-month__head">
                  <span className="log-month__label">{items[0] ? monthLabel(items[0]) : key}</span>
                  <span className="log-month__rule" />
                  <span className="log-month__count">{items.length} 条</span>
                </div>
                {items.map((note) => {
                  const number = notes.length - notes.indexOf(note)
                  return <NoteEntry key={note.id} note={note} number={number} />
                })}
              </section>
            </Reveal>
          ))}
        </div>
      )}

      <ImageZoom containerId="note-feed" />
    </div>
  )
}

function groupByMonth(notes: ExportNote[]): [string, ExportNote[]][] {
  const groups = new Map<string, ExportNote[]>()
  for (const note of notes) {
    const { year, month } = dateParts(note.publishedAt)
    const key = `${year}-${month}`
    const bucket = groups.get(key)
    if (bucket) bucket.push(note)
    else groups.set(key, [note])
  }
  return Array.from(groups.entries())
}

function monthLabel(note: ExportNote): string {
  const { year, month } = dateParts(note.publishedAt)
  return `${year} / ${month}`
}
