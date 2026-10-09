import Link from 'next/link'
import { loadContent, getPosts, getStats } from '@/lib/content'
import { formatDate } from '@/lib/format'
import { site } from '@/lib/site'
import { EmptyState, PostGrid } from '@/components/PostList'
import { Reveal } from '@/components/Reveal'

export default async function HomePage() {
  const [posts, stats, content] = await Promise.all([getPosts(), getStats(), loadContent()])
  const latest = posts.slice(0, 6)
  const notes = content.notes.slice(0, 4)

  return (
    <>
      <section className="wrap hero">
        <div className="kicker">{site.title}</div>
        <div className="hero__mark" />
        <h1 className="hero__title">{site.tagline}</h1>
        <p className="hero__desc">{site.intro}</p>

        <div className="stats">
          <Stat num={stats.posts} label="篇文章" />
          <Stat num={formatWords(stats.words)} label="总字数" />
          <Stat num={stats.days} label="运行天数" />
        </div>

        <p className="faint mono" style={{ fontSize: '0.72rem', marginTop: '1.4rem' }}>
          最近更新 {latest[0] ? formatDate(latest[0].publishedAt) : '—'}
        </p>
      </section>

      <section className="wrap section">
        <div className="section__head">
          <div className="section__title">最新文章</div>
          <Link href="/posts/" className="mono faint" style={{ fontSize: '0.76rem' }}>
            全部文章 →
          </Link>
        </div>
        <Reveal>{latest.length > 0 ? <PostGrid posts={latest} /> : <EmptyState text="还没有发布任何文章。" />}</Reveal>
      </section>

      {notes.length > 0 && (
        <section className="wrap section">
          <div className="section__head">
            <div className="section__title">最近动态</div>
          </div>
          <div className="list">
            {notes.map((note) => (
              <div key={note.id} className="list__item">
                <span className="list__date">{formatDate(note.publishedAt)}</span>
                <span className="muted" style={{ fontSize: '0.92rem' }}>
                  {note.content}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="wrap section">
        <div className="section__head">
          <div className="section__title">这个站</div>
        </div>
        <p className="muted" style={{ maxWidth: '38rem', fontSize: '0.95rem' }}>
          内容存在 PostgreSQL 的发布快照里，改完点发布，由 GitHub Actions 构建成纯静态页面，
          Nginx 直接发文件 —— 后端挂了，文章照样有人能读到。检索走 Elasticsearch，挂了自动降级到 PG。
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1.1rem' }}>
          <Link href="/about/" className="chip">
            关于这个站
          </Link>
          <a href="/rss.xml" className="chip">
            RSS
          </a>
          <a href={site.repo} className="chip" rel="noreferrer" target="_blank">
            GitHub
          </a>
        </div>
      </section>
    </>
  )
}

function Stat({ num, label }: { num: number | string; label: string }) {
  return (
    <div>
      <span className="stats__num">{num}</span>
      <span className="stats__label">{label}</span>
    </div>
  )
}

/** 字数是四位数以上时才值得缩写，不然「1.2k」比「1200」还难读 */
function formatWords(words: number): string {
  if (words < 10_000) return String(words)
  return `${(words / 1000).toFixed(1)}k`
}