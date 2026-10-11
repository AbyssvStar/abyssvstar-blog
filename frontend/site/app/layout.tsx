import type { Metadata } from 'next'
import './globals.css'
import { site } from '@/lib/site'
import { getSiteConfig } from '@/lib/content'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'

import { ParticlesBackground } from '@/components/ParticlesBackground'


import { PointerGlow } from '@/components/PointerGlow'
import { ClickBurst } from '@/components/ClickBurst'


/** 站名与简介来自后台的站点配置；构建时取一次，和页面内容来自同一份导出 */
export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig()
  return {
    metadataBase: new URL(site.url),
    title: {
      default: config.title + "'s blog",
      template: `%s · ${config.title}`,
    },
    description: config.description,
    authors: [{ name: site.author }],
    alternates: {
      canonical: '/',
      types: { 'application/rss+xml': '/rss.xml' },
    },
    openGraph: {
      type: 'website',
      siteName: config.title,
      title: config.title,
      description: config.description,
      locale: 'zh_CN',
    },
  }
}


/**
 * 主题贴到 <html> 上的时机。
 *
 * 必须发生在**第一次绘制之前**，否则浅色用户每次刷新都会先闪一下深色。
 * 这里不能直接写 <script>：React 会拒掉组件树里的 script 元素（报 "Encountered a script tag"），
 * next/script 的 beforeInteractive 在静态导出下也只是被塞进 RSC 队列、产物里根本不是真的 script。
 *
 * 绕法：把 script 当成**原始 HTML 字符串**塞进一个空 div。服务端渲染时它原样出现在 HTML 里，
 * 属于文档解析阶段插入的脚本，浏览器会执行（innerHTML 那套"不执行"的规则只作用于运行时）。
 * 放在 body 的第一个元素上，就在任何内容开始绘制之前。
 */
const THEME_INIT = `try{var t=localStorage.getItem('site-theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t)}}catch(e){}`

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const config = await getSiteConfig()
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <div
          style={{ display: 'none' }}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: `<script>${THEME_INIT}</script>` }}
        />
        {site.backdropImage && (
          <div
            className="backdrop__image"
            style={{ backgroundImage: `url(${site.backdropImage})` }}
            aria-hidden="true"
          />
        )}
        <div className="backdrop" aria-hidden="true">
          <div className="backdrop__grid" />
          <div className="backdrop__stars" />
          <div className="backdrop__glow" />
        </div>



        <PointerGlow />
        <ClickBurst />
        <ParticlesBackground />
        <SiteHeader title={config.title} />
        <main>{children}</main>
        <SiteFooter title={config.title} description={config.description} />
      </body>
    </html>
  )
}