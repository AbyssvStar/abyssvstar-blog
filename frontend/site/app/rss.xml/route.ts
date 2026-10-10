import { getPosts, getSiteConfig } from '@/lib/content'
import { absoluteUrl } from '@/lib/site'

/** 全文 RSS（不输出摘要）：技术读者多数在阅读器里读完再决定点不点 */
export const dynamic = 'force-static'

export async function GET(): Promise<Response> {
  const [posts, config] = await Promise.all([getPosts(), getSiteConfig()])
  const items = posts
    .slice(0, 30)
    .map(
      (post) => `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${absoluteUrl(`/posts/${post.slug}/`)}</link>
      <guid isPermaLink="true">${absoluteUrl(`/posts/${post.slug}/`)}</guid>
      <pubDate>${new Date(post.publishedAt ?? Date.now()).toUTCString()}</pubDate>
      <description>${escapeXml(post.summary)}</description>
      <content:encoded><![CDATA[${post.html.split(']]>').join(']]&gt;')}]]></content:encoded>
    </item>`,
    )
    .join('\n')

  const lastBuild = new Date().toUTCString()
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(config.title)}</title>
    <link>${absoluteUrl('/')}</link>
    <description>${escapeXml(config.description)}</description>
    <language>zh-CN</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <atom:link href="${absoluteUrl('/rss.xml')}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=1800',
    },
  })
}

function escapeXml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}