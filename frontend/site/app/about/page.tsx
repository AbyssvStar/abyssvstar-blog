import type { Metadata } from 'next'
import Link from 'next/link'
import { site } from '@/lib/site'

export const metadata: Metadata = {
  title: '关于',
  description: '关于我，以及这个站点。',
  alternates: { canonical: '/about/' },
}

export default function AboutPage() {
  return (
    <div className="wrap" style={{ maxWidth: '46rem', padding: '3rem 0 4rem' }}>
      <header style={{ marginBottom: '1.6rem' }}>
        <div className="kicker">About</div>
        <h1 style={{ fontSize: '1.9rem', marginTop: '0.6rem' }}>关于</h1>
      </header>

      {/*
        这段自我介绍请你自己改：我不编你的经历。
        「写得不算多」是从项目定位里来的；其余两句如果不像你，直接删。
      */}
      <div className="md-body">
        <p>
          我是 AbyssvStar。这里放我自己写的东西 —— 做过什么取舍、踩过什么坑、以及一些还没想清楚的记录。
          写得不算多，都是自己趟过的。
        </p>
      </div>

      <div className="info-grid">
        <div className="info-cell">
          <div className="info-cell__label">在这里能读到</div>
          <ul>
            <li>技术笔记与工程取舍</li>
            <li>踩坑与排查过程</li>
            <li>随手记录（短动态）</li>
          </ul>
        </div>
        <div className="info-cell">
          <div className="info-cell__label">这个站</div>
          <ul>
            <li>发布即生成静态页面</li>
            <li>后端挂了也读得到</li>
            <li>
              怎么搭的会单独写一篇{/* TODO：那篇文章发出来后，把这里换成链接 */}
              <span className="faint">（待补）</span>
            </li>
          </ul>
        </div>
        <div className="info-cell">
          <div className="info-cell__label">联系 / 订阅</div>
          <ul>
            <li>
              <a href={site.repo} rel="noreferrer" target="_blank">
                GitHub
              </a>
            </li>
            <li>
              <a href="/rss.xml">RSS</a>
              <span className="faint"> · 全文输出</span>
            </li>
          </ul>
        </div>
      </div>

      <p className="muted" style={{ fontSize: '0.9rem' }}>
        没有评论系统，也不加追踪脚本。想看内容就<Link href="/posts/">去文章列表</Link>。
      </p>
    </div>
  )
}