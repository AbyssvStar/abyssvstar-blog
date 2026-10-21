import type { Metadata } from 'next'
import { getNotes } from '@/lib/content'
import { NoteCard } from '@/components/NoteCard'

export const metadata: Metadata = {
  title: '动态',
  description: '随手记录与短动态。',
  alternates: { canonical: '/notes/' },
}

export default async function NotesPage() {
  const notes = await getNotes()
  return (
    <div className="wrap notes-page">
      <header className="page-heading">
        <div className="kicker">NOTES / SHORT POSTS</div>
        <h1>动态</h1>
        <p className="muted">随手写下的小事，不做长草稿。</p>
      </header>
      {notes.length === 0 ? <p className="faint">还没有动态。</p> : (
        <div className="notes-grid">{notes.map((note) => <NoteCard key={note.id} note={note} />)}</div>
      )}
    </div>
  )
}