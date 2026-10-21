import type { Metadata } from 'next'
import Link from 'next/link'
import { getTags } from '@/lib/content'

export const metadata: Metadata = {
  title: '标签',
  description: '按主题浏览全部文章。',
  alternates: { canonical: '/tags/' },
}

export default async function TagsPage() {
  const tags = await getTags()
  return (
    <div className="wrap tags-page">
      <header className="page-heading">
        <div className="kicker">TAGS / TOPICS</div>
        <h1>标签</h1>
        <p className="muted">从常写的主题开始找。</p>
      </header>
      <div className="tag-cloud">
        {tags.map((tag) => (
          <Link key={tag.slug} href={`/tags/${tag.slug}/`} className="tag-card">
            <span>{tag.name}</span>
            <span className="mono faint">{tag.count} 篇</span>
          </Link>
        ))}
      </div>
    </div>
  )
}