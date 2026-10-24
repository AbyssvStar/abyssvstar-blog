import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PostCardWide } from '@/components/PostList'
import { getPostsByTagSlug, getTags } from '@/lib/content'

export const dynamicParams = false

export async function generateStaticParams() {
  const tags = await getTags()
  return tags.length > 0 ? tags.map((tag) => ({ slug: tag.slug })) : [{ slug: '__empty__' }]
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const result = await getPostsByTagSlug(slug)
  return result ? { title: `标签：${result.tag.name}`, alternates: { canonical: `/tags/${slug}/` } } : {}
}

export default async function TagDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const result = await getPostsByTagSlug(slug)
  if (!result) notFound()
  return (
    <div className="wrap tag-detail-page">
      <header className="page-heading">
        <div className="kicker">TAG / {result.tag.name}</div>
        <h1>{result.tag.name}</h1>
        <p className="muted">{result.posts.length} 篇文章</p>
      </header>
      <div className="list-panel"><PostCardWide posts={result.posts} /></div>
    </div>
  )
}