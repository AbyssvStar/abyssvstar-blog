import type { Metadata } from 'next'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { transformPostHtml } from '@/lib/markdown'
import { CodeCopy } from '@/components/CodeCopy'
import { site } from '@/lib/site'

export const metadata: Metadata = {
  title: '关于',
  description: site.description,
  alternates: { canonical: '/about/' },
}

/**
 * 关于页的正文来自 `frontend/site/content/about.md`。
 *
 * 为什么先做成文件：改一个文件、重新构建就有新页面，零后端改动。
 * 文档里本来就把「关于页」算作站点内容（后台的 site-config 接口，
 * 在 API 契约里标着待做），等 G3 那条接口做出来，这里换成读导出内容即可 —— 页面结构不用动。
 */
function loadAbout(): string {
  try {
    return readFileSync(join(process.cwd(), 'content', 'about.md'), 'utf8')
  } catch {
    return ''
  }
}

export default async function AboutPage() {
  const source = loadAbout()
  // 正文里已经有 H1 就不再补一个，免得出现两个标题
  const hasOwnTitle = /^#\s+/m.test(source)
  const { html } = source.trim() ? await transformPostHtml(source) : { html: '' }

  return (
    <div className="wrap" style={{ maxWidth: '46rem', padding: '3rem 0 4rem' }}>
      {!hasOwnTitle && <h1 style={{ fontSize: '1.9rem' }}>关于</h1>}
      {html ? (
        <>
          <div className="md-body" id="about-body" dangerouslySetInnerHTML={{ __html: html }} />
          <CodeCopy containerId="about-body" />
        </>
      ) : (
        <p className="faint">content/about.md 还是空的。</p>
      )}
    </div>
  )
}