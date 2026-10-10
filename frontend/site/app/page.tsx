import Link from 'next/link'
import { loadContent, getPosts, getStats } from '@/lib/content'
import { formatDate } from '@/lib/format'
import { site } from '@/lib/site'
import { EmptyState, PostGrid } from '@/components/PostList'

import { Reveal } from '@/components/Reveal'

import { GalaxyBackground } from '@/components/GalaxyBackground'
import { HeroTitle } from '@/components/HeroTitle'


export default async function HomePage() {
  const [posts, stats, content] = await Promise.all([getPosts(), getStats(), loadContent()])
  const latest = posts.slice(0, 6)
  const notes = content.notes.slice(0, 4)


  return (
    <>
      {/*
        满屏 hero：三块画布在下面（常驻星野 + 拖动出来的星系），文字在上面且不吃指针事件 ——
        所以按在字上也能开始拖，而且不会选中文字。
      */}
      <section className="hero-stage">
        <GalaxyBackground />
        <div className="hero-stage__inner">
          <div className="hero__mark" />
          <HeroTitle text={site.title} />
          <p className="hero-stage__sub">{site.intro}</p>
          <div className="stats">
            <Stat num={stats.posts} label="篇文章" />
            <Stat num={formatWords(stats.words)} label="总字数" />
            <Stat num={stats.days} label="运行天数" />
          </div>
          <p className="faint mono" style={{ fontSize: '0.72rem', marginTop: '1.1rem' }}>
            最近更新 {latest[0] ? formatDate(latest[0].publishedAt) : '—'} · 按住左键在星野上拖动
          </p>
        </div>
      </section>


      <section className="wrap section">
        <div className="home-cols">
          <div>
            <div className="section__head">
              <div className="section__title">最新文章</div>
              <Link href="/posts/" className="mono faint" style={{ fontSize: '0.76rem' }}>
                全部文章 →
              </Link>
            </div>
            <Reveal>{latest.length > 0 ? <PostGrid posts={latest} /> : <EmptyState text="还没有发布任何文章。" />}</Reveal>
          </div>

          <aside className="home-side">

            <div className="info-cell">
              <div className="info-cell__label">最近动态</div>
              {content.notes.length > 0 ? (
                // 用 details/summary 做"点开"，横向可滑 —— 都不需要 JS
                <div className="notes-strip">
                  {content.notes.slice(0, 6).map((note) => (
                    <details key={note.id} className="note">
                      <summary>{formatDate(note.publishedAt)}</summary>
                      <p>{note.content}</p>
                    </details>
                  ))}
                </div>
              ) : (
                <p className="faint" style={{ fontSize: '0.85rem', margin: 0 }}>
                  还没有短动态。
                </p>
              )}
            </div>

            <div className="info-cell">
              <div className="info-cell__label">标签</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {content.tags.slice(0, 24).map((tag) => (
                  // 用得越多字号越大
                  <Link
                    key={tag.slug}
                    href={`/posts/?tag=${encodeURIComponent(tag.name)}`}
                    className="chip"
                    style={{ fontSize: `${(0.78 + Math.min(tag.count, 10) * 0.17).toFixed(2)}rem` }}
                  >
                    {tag.name}
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
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

      {/* 这里不写「站是怎么搭的」：那是文章的内容，等写出来再链过去（关于页里留了位置） */}
      <section className="wrap section">
        <div className="section__head">
          <div className="section__title">入口</div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Link href="/posts/" className="chip">
            全部文章
          </Link>
          <Link href="/archive/" className="chip">
            归档
          </Link>
          <Link href="/about/" className="chip">
            关于
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