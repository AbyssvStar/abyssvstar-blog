import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getNeighbours, getPost, getPosts } from '@/lib/content'
import { formatDate } from '@/lib/format'
import { transformPostHtml } from '@/lib/markdown'
import { absoluteUrl, site } from '@/lib/site'
import { PostMeta } from '@/components/PostList'
import { ReadingProgress } from '@/components/ReadingProgress'
import { CodeCopy } from '@/components/CodeCopy'
import { Toc } from '@/components/Toc'

export const dynamicParams = false

export async function generateStaticParams() {
  const posts = await getPosts()
  return posts.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) return {}
  return {
    title: post.title,
    description: post.summary,
    alternates: { canonical: `/posts/${post.slug}/` },
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.summary,
      publishedTime: post.publishedAt,
      images: post.coverUrl ? [{ url: post.coverUrl }] : undefined,
    },
  }
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) notFound()

  const [{ html, headings }, { prev, next }] = await Promise.all([transformPostHtml(post.html), getNeighbours(slug)])

  // Article 结构化数据（docs/07 的 SEO 一节）
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.summary,
    datePublished: post.publishedAt,
    author: { '@type': 'Person', name: site.author },
    image: post.coverUrl ? [post.coverUrl] : undefined,
    mainEntityOfPage: absoluteUrl(`/posts/${post.slug}/`),
  }

  return (
    <>
      <ReadingProgress />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <article className="wrap article">
        <div>
          <Toc headings={headings} />
        </div>

        <div style={{ minWidth: 0 }}>
          <header className="article__head">
            <h1 className="article__title">{post.title}</h1>
            <PostMeta post={post} />
          </header>

          {post.coverUrl && (
            // 封面尺寸暂时拿不到（导出里没有图片尺寸表），先让它按容器宽度自适应
            <img
              src={post.coverUrl}
              alt={post.title}
              decoding="async"
              style={{ border: '1px solid var(--border-soft)', borderRadius: 6, height: 'auto', marginBottom: '2rem', width: '100%' }}
            />
          )}

          <div className="md-body" id="post-body" dangerouslySetInnerHTML={{ __html: html }} />
          <CodeCopy containerId="post-body" />

          {(prev || next) && (
            <nav className="prevnext">
              <div className="prevnext__cell">
                {prev ? (
                  <>
                    <div className="kicker" style={{ marginBottom: '0.4rem' }}>
                      ← 上一篇
                    </div>
                    <Link href={`/posts/${prev.slug}/`}>{prev.title}</Link>
                  </>
                ) : (
                  <span className="faint">这是最早的一篇</span>
                )}
              </div>
              <div className="prevnext__cell" style={{ textAlign: 'right' }}>
                {next ? (
                  <>
                    <div className="kicker" style={{ marginBottom: '0.4rem' }}>
                      下一篇 →
                    </div>
                    <Link href={`/posts/${next.slug}/`}>{next.title}</Link>
                  </>
                ) : (
                  <span className="faint">这是最新的一篇</span>
                )}
              </div>
            </nav>
          )}

          <footer className="mono faint" style={{ fontSize: '0.72rem', marginTop: '2.5rem' }}>
            发布于 {formatDate(post.publishedAt)} · 静态构建
          </footer>
        </div>
      </article>
    </>
  )
}