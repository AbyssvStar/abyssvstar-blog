import type { Metadata } from 'next'
import './globals.css'
import { site } from '@/lib/site'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'

import { ParticlesBackground } from '@/components/ParticlesBackground'
import { PointerGlow } from '@/components/PointerGlow'


export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: site.title,
    template: `%s · ${site.title}`,
  },
  description: site.description,
  authors: [{ name: site.author }],
  alternates: {
    canonical: '/',
    types: { 'application/rss+xml': '/rss.xml' },
  },
  openGraph: {
    type: 'website',
    siteName: site.title,
    title: site.title,
    description: site.description,
    locale: 'zh_CN',
  },
}


export default function RootLayout({ children }: { children: React.ReactNode }) {
  // 主题不靠脚本抢跑：没写 data-theme 就跟随系统偏好，写了就照写的来（见 globals.css 的令牌一节）
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
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
        <ParticlesBackground />
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  )
}