import type { Metadata } from 'next'
import Link from 'next/link'
import { site } from '@/lib/site'

export const metadata: Metadata = {
  title: '关于',
  description: '关于这个站点：写什么、怎么搭的、怎么联系。',
  alternates: { canonical: '/about/' },
}

export default function AboutPage() {
  return (
    <div className="wrap" style={{ maxWidth: '44rem', padding: '3rem 0 4rem' }}>
      <header style={{ marginBottom: '2rem' }}>
        <div className="kicker">{site.author}</div>
        <h1 style={{ fontSize: '1.9rem', marginTop: '0.6rem' }}>关于</h1>
      </header>

      {/*
        个人简介留给你自己写：那种「热爱技术、持续学习」的模板句一眼就能看出来是生成的，
        不如空着，或者写一句你自己觉得准确的话。
      */}
      <div className="md-body">
        <p>
          这里是我自己写东西的地方：技术上的取舍、踩过的坑、以及一些还没想清楚的记录。
          内容偏向「为什么这么写」，而不是「怎么写」——前者更难在别处找到。
        </p>

        <h2>这个站是怎么搭的</h2>
        <p>
          后端是一个 Kotlin + Spring Boot 的单体应用，内容存在 PostgreSQL 里：编辑中的稿子和发布快照分成两张表，
          只有点过「发布」的内容才会出现在这里。图片放在自建的 MinIO，不占应用服务器的磁盘。
        </p>
        <p>
          你看到的这些页面是纯静态 HTML —— 发布之后由 GitHub Actions 构建，Nginx 直接发文件。
          所以后端重启、升级、甚至挂掉，文章照样能打开。检索交给 Elasticsearch，它不可用时会自动降级到 PostgreSQL。
        </p>

        <h2>联系</h2>
        <ul>
          <li>
            代码仓库：<a href={site.repo} rel="noreferrer" target="_blank">GitHub</a>
          </li>
          <li>
            订阅：<a href="/rss.xml">RSS</a>（全文输出，不是摘要）
          </li>
        </ul>
      </div>

      <div className="rule" style={{ margin: '2.5rem 0 1.25rem' }} />
      <p className="faint mono" style={{ fontSize: '0.72rem' }}>
        没有评论系统，也不打算加追踪脚本。<Link href="/posts/">去看文章</Link>。
      </p>
    </div>
  )
}