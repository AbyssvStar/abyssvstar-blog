'use client'

import { useEffect, useRef } from 'react'

/**
 * 首页大标题：下滑时不是直接滚走，而是缩小着飞向右上角；滚回顶部再飞回中间。
 *
 * 做法是纯 transform（不改布局）：把「初始位置 → 右上角」的位移按滚动进度插值。
 * 因为标题本身还在文档流里、会随页面往上滚，所以纵向位移要额外补回滚动量 ——
 * 这样进度到 1 时它正好停在视口右上角。
 */
export function HeroTitle({ text }: { text: string }) {
  const ref = useRef<HTMLHeadingElement>(null)
  const origin = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let frame = 0
    const measure = () => {
      const rect = el.getBoundingClientRect()
      origin.current = { x: rect.left + rect.width / 2, y: rect.top + window.scrollY }
    }

    const update = () => {
      frame = 0
      const start = origin.current
      if (!start) return
      const limit = Math.max(220, window.innerHeight * 0.62)
      const t = Math.min(1, Math.max(0, window.scrollY / limit))
      const targetX = window.innerWidth - Math.min(120, window.innerWidth * 0.12)
      const dx = (targetX - start.x) * t
      // window.scrollY 要"完整"抵消（乘 t 的话，滚到一半时它有一半还在跟着页面滚走，
      // 看起来就是直接往上飞）；真正按进度插值的只有"起点 → 右上角"这段位移。
      const dy = window.scrollY + (54 - start.y) * t
      const scale = 1 - 0.74 * t
      el.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(${scale})`
      el.style.opacity = String(1 - 0.8 * t)
    }

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    measure()
    update()
    const onResize = () => {
      measure()
      onScroll()
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    // 字体加载完布局才会定下来，重新量一次起点
    document.fonts?.ready.then(() => {
      measure()
      onScroll()
    })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <h1 ref={ref} className="hero-stage__title">
      {text}
    </h1>
  )
}