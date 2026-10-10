import Link from 'next/link'
import { loadContent, getPosts, getStats } from '@/lib/content'
import { formatDate } from '@/lib/format'
import { site } from '@/lib/site'
import { EmptyState, PostGrid } from '@/components/PostList'

import { Reveal } from '@/components/Reveal'
import { GalaxyBackground } from '@/components/GalaxyBackground'


export default async function HomePage() {
  const [posts, stats, content] = await Promise.all([getPosts(), getStats(), loadContent()])
  const latest = posts.slice(0, 6)
  const notes = content.notes.slice(0, 4)
  // 首页顶部那张大图：优先用最新一篇的封面，没有封面就顺延到下一篇有封面的
  const feature = latest.find((post) => post.coverUrl)

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
          <h1 className="hero-stage__title">{site.title}</h1>
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

      {feature && (
        <section className="wrap section" style={{ paddingTop: '0.5rem' }}>
          <Link href={`/posts/${feature.slug}/`} className="feature">
            {/* 封面尺寸暂时拿不到（导出里没有图片尺寸表），先让容器定比例、图片填满 */}
            <img src={feature.coverUrl} alt="" decoding="async" />
            <div className="feature__body">
              <div className="kicker">最新</div>
              <h2 className="feature__title">{feature.title}</h2>
              <p className="feature__summary">{feature.summary}</p>
            </div>
          </Link>
        </section>
      )}

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