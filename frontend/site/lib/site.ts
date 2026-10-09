/**
 * 站点级配置。
 *
 * 这些不是「内容」，改动频率极低，所以就写在代码里；等哪天要经常改，再挪到后端的 site-config
 * （接口在 docs/05 里已经留了位置）。
 */
export const site = {
  title: 'AbyssvStar',
  // 标题下面那一行：一句话讲清这里是什么
  tagline: '写代码，也写为什么这么写',
  description: 'AbyssvStar 的个人站点：技术文章、随手笔记，以及一个能问「我写过什么」的检索。',
  author: 'AbyssvStar',
  /** canonical / RSS / sitemap 用的绝对地址前缀 */
  url: (process.env.SITE_URL ?? 'https://blog.example.com').replace(/\/$/, ''),
  nav: [
    { href: '/', label: '首页' },
    { href: '/posts', label: '文章' },
    { href: '/archive', label: '归档' },
    { href: '/about', label: '关于' },
  ],
  /** 页脚那行「运行天数」从哪天算起 */
  startedAt: '2026-10-01',
  /** 页脚展示的代码仓库 */
  repo: 'https://github.com/AbyssvStar/abyssvstar-blog',
} as const

/** 列表每页几条。静态导出下没有服务端分页，页码是构建时切好的 */
export const PAGE_SIZE = 10

export function absoluteUrl(path: string): string {
  return `${site.url}${path.startsWith('/') ? path : `/${path}`}`
}