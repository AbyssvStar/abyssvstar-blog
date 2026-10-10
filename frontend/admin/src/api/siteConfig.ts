import { api } from './client'
import type { SiteConfig, UpdateSiteConfigBody } from './types'

/**
 * 站点配置：站名、SEO 简介、关于页正文。
 *
 * 没有单独的「发布」—— 保存本身就是上线动作：存下来 ⇒ 记一条 PENDING ⇒ 站点重建。
 */
export const siteConfigApi = {
  get: () => api.get<SiteConfig>('/site-config'),

  save: (body: UpdateSiteConfigBody) => api.put<SiteConfig>('/site-config', body),

  /** 预览无副作用，用的是和文章发布同一个渲染器 */
  preview: (aboutMarkdown: string) => api.post<{ html: string }>('/site-config/preview', { aboutMarkdown }),
}