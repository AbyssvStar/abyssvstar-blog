import type { Metadata } from 'next'
import './globals.css'
import { site } from '@/lib/site'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.title} · ${site.tagline}`,
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
    title: `${site.title} · ${site.tagline}`,
    description: site.description,
    locale: 'zh_CN',
  },
}

/**
 * 首屏之前执行：把 data-theme 定下来，避免浅色用户刷新时先闪一下深色。
 * 这是 docs/07 里点名必须做的一步。
 */
const themeScript = `
;(function () {
  try {
    var saved = localStorage.getItem('site-theme')
    if (saved !== 'light' && saved !== 'dark') {
      saved = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
    }
    document.documentElement.setAttribute('data-theme', saved)
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark')
  }
})()
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <div className="backdrop" aria-hidden="true">
          <div className="backdrop__grid" />
          <div className="backdrop__stars" />
          <div className="backdrop__glow" />
        </div>
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  )
}