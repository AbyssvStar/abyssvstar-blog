'use client'

import { useEffect, useRef } from 'react'

/**
 * 卡片封面随滚动轻微位移（视差）。
 * 只改 transform（合成层），rAF 节流；开了「减少动态效果」就不动。
 */
export function ScrollZoom({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let frame = 0

    const update = () => {
      frame = 0
      const img = el.querySelector('img')
      const shift = el.querySelector('.scroll-zoom__shift') as HTMLElement | null
      if (!img || !shift) return
      const rect = el.getBoundingClientRect()
      // 元素中心相对视口中心的偏移，归一化到 -0.5 ~ 0.5
      const progress = (rect.top + rect.height / 2 - window.innerHeight / 2) / window.innerHeight
      // 视差只写变量（那一层没有 transition，所以完全跟手）；缩放交给图片层
      shift.style.setProperty('--shift', `${(-progress * 24).toFixed(1)}px`)
    }

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <span ref={ref} className="scroll-zoom">
      <span className="scroll-zoom__shift">{children}</span>
    </span>
  )
}