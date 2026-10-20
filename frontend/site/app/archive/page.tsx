import type { Metadata } from 'next'
import { getArchive, getPosts } from '@/lib/content'
import { EmptyState, PostRows } from '@/components/PostList'

export const metadata: Metadata = {
  title: '归档',
  description: '按年月浏览全部文章。',
  alternates: { canonical: '/archive/' },
}

export default async function ArchivePage() {
  const [years, posts] = await Promise.all([getArchive(), getPosts()])

  return (
    // 只设上下：写 padding 简写会把 .wrap 的左右内边距覆盖成 0，窄屏上内容就贴到屏幕边
    <div className="wrap" style={{ paddingTop: '3rem', paddingBottom: '4rem' }}>
      <header style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.8rem' }}>归档</h1>
        <p className="muted mono" style={{ fontSize: '0.78rem', marginTop: '0.5rem' }}>
          共 {posts.length} 篇
        </p>
      </header>

      {years.length === 0 && <EmptyState text="还没有文章。" />}

      {years.map(({ year, months }) => (
        <section key={year} className="section" style={{ paddingTop: '1.5rem' }}>
          <div className="section__head" style={{ marginBottom: '0.75rem' }}>
            <div className="section__title mono">{year}</div>
            <span className="faint mono" style={{ fontSize: '0.72rem' }}>
              {months.reduce((sum, month) => sum + month.posts.length, 0)} 篇
            </span>
          </div>
          {months.map(({ month, posts: monthPosts }) => (
            <div key={month} className="timeline" style={{ marginBottom: '1.25rem' }}>
              <div className="kicker timeline__dot" style={{ marginBottom: '0.35rem' }}>
                {month} 月
              </div>
              <PostRows posts={monthPosts} />
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}