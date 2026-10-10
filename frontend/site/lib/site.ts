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
  intro: '悟已往之不谏，知来者之可追',
  /** 给搜索引擎和社交卡片用的一句话 */
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
  /** 文章页底部那行声明。换成你想要的许可（或留空字符串去掉整行） */
  license: '转载请注明出处。',
  /**
   * 文章页的背景图（可选）。
   * 填 `/xxx.jpg`（图片放 frontend/site/public/）或完整 URL，文章页就多一层压到 18% 不透明的背景图；
   * 留空则只用一层冷色渐变打底。粒子与柔光都跑在这一层之上。
   */
  articleBackdropImage: '',
  /**
   * 全站背景图（可选）。同样放 frontend/site/public/ 下，填 '/backdrop.jpg' 或完整 URL；
   * 留空就只用深蓝黑 + 两处冷光晕。填了以后会铺满视口、轻微模糊、压到 30% 不透明度。
   */
  backdropImage: '',
} as const

/** 列表每页几条。静态导出下没有服务端分页，页码是构建时切好的 */
export const PAGE_SIZE = 10

export function absoluteUrl(path: string): string {
  return `${site.url}${path.startsWith('/') ? path : `/${path}`}`
}