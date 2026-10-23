'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { site } from '@/lib/site'

/** title 由 layout 传下来：它来自后台的站点配置，不是编译进代码里的常量 */
export function SiteHeader({ title }: { title: string }) {
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  // 滚动后才出现那条细边框：静止时页面是「无边界」的
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // 换页就把菜单收起来，否则点完链接面板还挂在那儿
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  return (
    <header className="header" data-scrolled={scrolled} data-menu={menuOpen}>
      <div className="wrap header__inner">
        <Link href="/" className="brand" aria-label={title}>
          <StarMark />
          {title}
        </Link>

        {/*
          窄屏顶栏放不下「品牌 + 导航 + 主题开关」，之前是直接溢出、把后几项裁掉。
          这里收成一个菜单按钮，展开后是一块铺满宽度的下拉面板（见 globals.css 的 .nav 窄屏规则）。
        */}
        <button
          type="button"
          className="nav-toggle"
          aria-expanded={menuOpen}
          aria-controls="site-nav"
          aria-label={menuOpen ? '收起菜单' : '展开菜单'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <MenuIcon open={menuOpen} />
        </button>

        <nav className="nav" id="site-nav" data-open={menuOpen}>
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
          <Link
            href="/search/"
            className="header-icon"
            data-active={pathname === '/search' || pathname.startsWith('/search/')}
            aria-label="搜索"
            title="搜索"
          >
            <SearchIcon />
          </Link>
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
    /*
     * 首屏那一下已经由 layout 里的内联脚本贴好了（见 layout.tsx 的 THEME_INIT），
     * 这里只是把按钮的状态跟上去；万一那段脚本被谁剥掉了，也算一个兜底。
     */
    let saved: string | null = null
    try {
      saved = window.localStorage.getItem('site-theme')
    } catch {
      // 隐私模式读不了，那就用默认的
    }
    const next: 'dark' | 'light' =
      saved === 'light' || saved === 'dark'
        ? saved
        : document.documentElement.getAttribute('data-theme') === 'light'
          ? 'light'
          : 'dark'
    document.documentElement.setAttribute('data-theme', next)
    setTheme(next)
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

  // 图标表示「点了会切到哪儿」：暗色下给太阳，浅色下给月亮
  const label = theme === 'dark' ? '切换到浅色' : '切换到深色'

  return (
    <button type="button" className="theme-toggle" onClick={toggle} aria-label={label} title={label}>
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
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

function MenuIcon({ open }: { open: boolean }) {
  // 两条线开合：中间那条没画，所以合起来像「≡」、展开像「×」，比重画一套图标省事
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path
        d={open ? 'M4 4 L16 16 M16 4 L4 16' : 'M3 6 H17 M3 13 H17'}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10.7" cy="10.7" r="6.7" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="m15.7 15.7 4.1 4.1" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2" />
        <path d="M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6" />
      </g>
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M20 14.4A8.4 8.4 0 0 1 9.6 4a8.4 8.4 0 1 0 10.4 10.4Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}
