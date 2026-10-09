'use client'

import { useEffect, useState } from 'react'
import type { Heading } from '@/lib/markdown'

/** 目录高亮用 IntersectionObserver，不用 scroll 事件（docs/07 明确要求） */
export function Toc({ headings }: { headings: Heading[] }) {
  const [activeId, setActiveId] = useState(headings[0]?.id ?? '')

  useEffect(() => {
    if (headings.length === 0) return
    const elements = headings
      .map((heading) => document.getElementById(heading.id))
      .filter((el): el is HTMLElement => el !== null)
    if (elements.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        const first = visible[0]?.target.id
        if (first) setActiveId(first)
      },
      // 上面留出吸顶栏的高度，下面砍掉大半屏：只有进入上方区域的标题才算「当前」
      { rootMargin: '-80px 0px -70% 0px', threshold: 0 },
    )

    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [headings])

  if (headings.length < 2) return null

  return (
    <nav className="toc" aria-label="目录">
      <div className="kicker" style={{ marginBottom: '0.6rem' }}>
        目录
      </div>
      {headings.map((heading) => (
        <a
          key={heading.id}
          href={`#${heading.id}`}
          className="toc__item"
          data-depth={heading.depth}
          data-active={heading.id === activeId}
        >
          {heading.text}
        </a>
      ))}
    </nav>
  )
}