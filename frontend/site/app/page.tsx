import Link from 'next/link'
import { loadContent, getPosts, getSiteConfig, getStats } from '@/lib/content'
import { formatDate } from '@/lib/format'
import { site } from '@/lib/site'
import { EmptyState, PostGrid } from '@/components/PostList'

import { Reveal } from '@/components/Reveal'

import { GalaxyBackground } from '@/components/GalaxyBackground'
import { HeroTitle } from '@/components/HeroTitle'


export default async function HomePage() {
  // loadContent 与 getSiteConfig 共用同一次导出请求（lib/content.ts 里做了缓存），不会多拉一次
  const [posts, stats, content, config] = await Promise.all([
    getPosts(),
    getStats(),
    loadContent(),
    getSiteConfig(),
  ])
  const latest = posts.slice(0, 6)
  const notes = content.notes.slice(0, 3)
  const hasMoreNotes = content.notes.length > notes.length


  return (
    <>
      {/*
        满屏 hero：三块画布在下面（常驻星野 + 拖动出来的星系），文字在上面且不吃指针事件 ——
        所以按在字上也能开始拖，而且不会选中文字。
      */}
      <section className="hero-stage">
        <GalaxyBackground />
        <div className="hero-stage__inner">
          {/* 原来是一根 2px 短横线，换成一行等宽小字：更像仪表，也承担了「这是什么站」的功能 */}
          <div className="hero-stage__kicker">
            PERSONAL BLOG · SINCE {new Date(site.startedAt).getFullYear()}
          </div>
          <HeroTitle text={config.title} />
          <p className="hero-stage__sub">{site.intro}</p>
          <div className="stats">
            <Stat num={stats.posts} label="篇文章" />
            <Stat num={formatWords(stats.words)} label="总字数" />
            <Stat num={stats.days} label="运行天数" />
          </div>
          <p className="faint mono hero-hint" style={{ fontSize: '0.72rem', marginTop: '1.1rem' }}>
            最近更新 {latest[0] ? formatDate(latest[0].publishedAt) : '—'}
            <span className="hero-hint__drag"> · 按住左键在星野上拖动</span>
          </p>
        </div>
      </section>


      <section id="latest" className="wrap section">
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

            <div className="info-cell home-notes-cell">
              <div className="info-cell__head">
                <div className="info-cell__label">最近动态</div>
              </div>
              {notes.length > 0 ? (
                <div className="home-note-list">
                  {notes.map((note) => (
                    <Link key={note.id} href={`/notes/${note.id}/`} className="home-note-row">
                      <span className="home-note-row__date mono">{formatDate(note.publishedAt)}</span>
                      <span className="home-note-row__text">{note.content}</span>
                      {note.images[0] && (
                        <img src={note.images[0].variants?.w400 ?? note.images[0].url} alt="" loading="lazy" />
                      )}
                    </Link>
                  ))}
                  {hasMoreNotes && (
                    <Link href="/notes/" className="home-note-more">
                      更多动态
                      <span aria-hidden="true">→</span>
                    </Link>
                  )}
                </div>
              ) : (
                <p className="faint" style={{ fontSize: '0.85rem', margin: 0 }}>还没有短动态。</p>
              )}
            </div>

            <div className="info-cell">
              <div className="info-cell__label">标签</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {content.tags.slice(0, 24).map((tag) => (
                  // 用得越多字号越大
                  <Link
                    key={tag.slug}
                    href={`/tags/${tag.slug}/`}
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