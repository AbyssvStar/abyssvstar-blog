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


export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const config = await getSiteConfig()
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
        <ClickBurst />
        <ParticlesBackground />
        <SiteHeader title={config.title} />
        <main>{children}</main>
        <SiteFooter title={config.title} description={config.description} />
      </body>
    </html>
  )
}