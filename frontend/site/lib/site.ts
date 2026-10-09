/**
 * 站点级配置。
 *
 * 这些不是「内容」，改动频率极低，所以就写在代码里；等哪天要经常改，再挪到后端的 site-config
 * （接口在 docs/05 里已经留了位置）。
 */
export const site = {
  /** 站点名，也是首页的大字标题和浏览器标签栏上的名字 */
  title: 'AbyssvStar',
  /** 首页那句说明：只讲这里放什么，不用形容词 */
  intro: '这里放我写的东西：技术笔记、工程里的取舍，以及一些还没想清楚的记录。',
  /** 给搜索引擎和社交卡片用的一句话 */
  description: 'AbyssvStar 的个人站点：技术笔记、工程取舍与随笔。',
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