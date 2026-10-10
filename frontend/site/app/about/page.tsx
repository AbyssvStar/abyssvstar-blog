import type { Metadata } from 'next'
import { transformPostHtml } from '@/lib/markdown'
import { CodeCopy } from '@/components/CodeCopy'
import { getSiteConfig } from '@/lib/content'

export async function generateMetadata(): Promise<Metadata> {
  const { description } = await getSiteConfig()
  return {
    title: '关于',
    description,
    alternates: { canonical: '/about/' },
  }
}

/**
 * 关于页。
 *
 * 正文在后台的「站点」页里写（Markdown），导出时已由后端渲染成 HTML —— 和文章正文是
 * 同一种东西，所以这里走的是同一段构建期处理：补标题锚点、用 Shiki 给代码上色。
 */
export default async function AboutPage() {
  const { aboutHtml } = await getSiteConfig()
  // 正文里已经有 H1 就不再补一个，免得出现两个标题
  const hasOwnTitle = /<h1[\s>]/.test(aboutHtml)
  const { html } = aboutHtml.trim() ? await transformPostHtml(aboutHtml) : { html: '' }

  return (
    <div className="wrap" style={{ maxWidth: '46rem', padding: '3rem 0 4rem' }}>
      {!hasOwnTitle && <h1 style={{ fontSize: '1.9rem' }}>关于</h1>}
      {html ? (
        <>
          <div className="md-body" id="about-body" dangerouslySetInnerHTML={{ __html: html }} />
          <CodeCopy containerId="about-body" />
        </>
      ) : (
        <p className="faint">关于页还空着 —— 后台的「站点」页可以写它。</p>
      )}
    </div>
  )
}