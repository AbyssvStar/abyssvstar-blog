'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { site } from '@/lib/site'

export function SiteHeader() {
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)

  // 滚动后才出现那条细边框：静止时页面是「无边界」的
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className="header" data-scrolled={scrolled}>
      <div className="wrap header__inner">
        <Link href="/" className="brand" aria-label={site.title}>
          <StarMark />
          {site.title}
        </Link>

        <nav className="nav">
          {site.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="nav__link"
              data-active={isActive(pathname, item.href)}
            >
              {item.label}
            </Link>
          ))}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    // 没显式选过就跟随系统，和 CSS 的判断保持一致
    const saved = document.documentElement.getAttribute('data-theme')
    if (saved === 'light' || saved === 'dark') {
      setTheme(saved)
      return
    }
    setTheme(window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
  }, [])

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', next)
    try {
      localStorage.setItem('site-theme', next)
    } catch {
      // 隐私模式里 localStorage 会抛，主题这次生效就行
    }
    setTheme(next)
  }

  return (
    <button type="button" className="btn" onClick={toggle} aria-label="切换主题" style={{ marginLeft: '0.35rem' }}>
      {theme === 'dark' ? '暗' : '亮'}
    </button>
  )
}

/** 四角星：AbyssvStar 的那个「星」，自己画的比图标库里的通用星星更像这个站 */
function StarMark() {
  return (
    <svg className="brand__mark" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2.5c.6 4.6 1.9 6.9 6.5 7.5-4.6.6-5.9 2.9-6.5 7.5-.6-4.6-1.9-6.9-6.5-7.5 4.6-.6 5.9-2.9 6.5-7.5Z"
        fill="currentColor"
      />
      <circle cx="18.6" cy="18.4" r="1.5" fill="currentColor" opacity=".55" />
    </svg>
  )
}