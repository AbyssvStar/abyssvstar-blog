'use client'

import { useEffect, useRef } from 'react'

/**
 * 首页大标题。三层效果叠在一起，都只动 transform / opacity：
 *
 *  1) 逐字入场 —— 每个字一个 span，靠 CSS 变量错开动画延迟（样式在 globals.css）
 *  2) 指针视差 —— 整块随指针做几像素的位移，和背后星野的深度呼应
 *  3) 下滑飞走 —— 缩小着飞向右上角，滚回顶部再飞回中间
 *
 * 第 3 条是纯 transform 插值、不改布局：标题本身还在文档流里、会随页面往上滚，
 * 所以纵向位移要额外补回滚动量，进度到 1 时才正好停在视口右上角。
 */
export function HeroTitle({ text }: { text: string }) {
  const ref = useRef<HTMLHeadingElement>(null)
  const innerRef = useRef<HTMLSpanElement>(null)
  const origin = useRef<{ x: number; y: number } | null>(null)

  // 3) 滚动：缩小飞向右上角
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
    // 展示字体加载完字形宽度才会变，重新量一次起点
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

  // 2) 指针视差：缓动追上去，幅度刻意压小（±8px），再大就变成"晃"
  useEffect(() => {
    const el = innerRef.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const RANGE_X = 8
    const RANGE_Y = 6
    let targetX = 0
    let targetY = 0
    let x = 0
    let y = 0
    let frame = 0

    const tick = () => {
      frame = 0
      x += (targetX - x) * 0.08
      y += (targetY - y) * 0.08
      el.style.setProperty('--px', `${x.toFixed(2)}px`)
      el.style.setProperty('--py', `${y.toFixed(2)}px`)
      if (Math.abs(targetX - x) + Math.abs(targetY - y) > 0.15) frame = requestAnimationFrame(tick)
    }

    const onMove = (event: PointerEvent) => {
      targetX = (event.clientX / window.innerWidth - 0.5) * RANGE_X * 2
      targetY = (event.clientY / window.innerHeight - 0.5) * RANGE_Y * 2
      if (!frame) frame = requestAnimationFrame(tick)
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  const chars = Array.from(text)

  return (
    // 逐字拆成了 span，屏幕阅读器会把字母一个个念出来，所以文字挂在 aria-label 上
    <h1 ref={ref} className="hero-stage__title" aria-label={text}>
      <span ref={innerRef} className="hero-stage__title-inner" aria-hidden="true">
        {chars.map((char, index) => (
          <span
            // 逐字 span 用下标当 key：文字很少变，变了整体重排也无所谓
            key={`${char}-${index}`}
            className="hero-stage__char"
            style={{ '--i': Math.min(index, 14) } as React.CSSProperties}
          >
            {char === ' ' ? '\u00a0' : char}
          </span>
        ))}
      </span>
    </h1>
  )
}
