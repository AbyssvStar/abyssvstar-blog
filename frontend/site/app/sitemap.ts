import type { MetadataRoute } from 'next'
import { getPosts } from '@/lib/content'
import { absoluteUrl } from '@/lib/site'

/**
 * 站点地图。
 *
 * 内容本来就只有一份「发布快照」，私密与归档的文章根本不在导出里，
 * 所以这里天然不会泄漏它们（见 docs/07 的 SEO 一节）。
 */
// 静态导出要求显式声明：这个路由在构建时就定稿，不做任何运行期渲染
export const dynamic = 'force-static'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getPosts()
  return [
    { url: absoluteUrl('/'), changeFrequency: 'daily', priority: 1 },
    { url: absoluteUrl('/posts/'), changeFrequency: 'daily', priority: 0.8 },
    { url: absoluteUrl('/archive/'), changeFrequency: 'weekly', priority: 0.5 },
    { url: absoluteUrl('/about/'), changeFrequency: 'monthly', priority: 0.3 },
    ...posts.map((post) => ({
      url: absoluteUrl(`/posts/${post.slug}/`),
      lastModified: post.publishedAt ? new Date(post.publishedAt) : undefined,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ]
}