import Link from 'next/link'
import type { ExportPost } from '@/lib/content'
import { formatDate } from '@/lib/format'

/** 首页用：网格卡片。靠 1px 间隙露出底色形成发丝线，不用阴影和大圆角 */
export function PostGrid({ posts }: { posts: ExportPost[] }) {
  return (
    <div className="grid-cards">
      {posts.map((post) => (
        <Link key={post.slug} href={`/posts/${post.slug}/`} className="card">
          <div className="mono" style={{ color: 'var(--text-faint)', fontSize: '0.72rem' }}>
            {formatDate(post.publishedAt)} · {post.readingMinutes} 分钟
          </div>
          <div className="card__title">{post.title}</div>
          <p className="card__summary">{post.summary}</p>
          <TagChips tags={post.tags} />
        </Link>
      ))}
    </div>
  )
}

/** 列表页、归档页用：一行一篇，日期在左 */
export function PostRows({ posts }: { posts: ExportPost[] }) {
  return (
    <div className="list">
      {posts.map((post) => (
        <Link key={post.slug} href={`/posts/${post.slug}/`} className="list__item">
          <span className="list__date">{formatDate(post.publishedAt)}</span>
          <span style={{ fontWeight: 500 }}>{post.title}</span>
          <span className="muted" style={{ fontSize: '0.82rem', marginLeft: 'auto', textAlign: 'right' }}>
            {post.tags.slice(0, 2).join(' / ')}
          </span>
        </Link>
      ))}
    </div>
  )
}

export function TagChips({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: 'auto', paddingTop: '0.4rem' }}>
      {tags.map((tag) => (
        <Link key={tag} href={`/posts/?tag=${encodeURIComponent(tag)}`} className="chip">
          {tag}
        </Link>
      ))}
    </div>
  )
}

export function PostMeta({ post }: { post: ExportPost }) {
  return (
    <div className="meta">
      <span>{formatDate(post.publishedAt)}</span>
      <span>{post.readingMinutes} 分钟</span>
      <span>{post.wordCount} 字</span>
      {post.tags.length > 0 && <span>{post.tags.join(' · ')}</span>}
    </div>
  )
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="faint" style={{ border: '1px dashed var(--border-soft)', borderRadius: 6, padding: '2rem', textAlign: 'center' }}>
      {text}
    </div>
  )
}