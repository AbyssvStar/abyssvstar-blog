'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * 入场动效：进视口后加一个 class，然后就不再管它。
 * 比引一个滚动动画库轻得多，也没有滚动劫持的风险（docs/07 明确不要那种效果）。
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShown(true)
          observer.disconnect()
        }
      },
      { rootMargin: '0px 0px -12% 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={['reveal', shown ? 'reveal-in' : '', className ?? ''].join(' ').trim()}
      style={shown && delay > 0 ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  )
}