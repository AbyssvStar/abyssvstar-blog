'use client'

import { useEffect, useRef } from 'react'

/**
 * 跟随指针的柔光。
 *
 * 用 rAF 缓动追上去（不是硬贴），位置只写进 transform —— 全程 GPU 合成，不触发重排。
 * 系统开了「减少动态效果」就直接不挂这块，省电也省心。
 */
export function PointerGlow() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const el = ref.current
    if (!el) return

    const SIZE = 860
    let targetX = window.innerWidth / 2
    let targetY = window.innerHeight * 0.3
    let x = targetX
    let y = targetY
    let frame = 0
    let running = true

    const tick = () => {
      frame = 0
      // 0.08 大致是「跟手但不晃」的缓动系数
      x += (targetX - x) * 0.08
      y += (targetY - y) * 0.08
      el.style.transform = `translate3d(${Math.round(x - SIZE / 2)}px, ${Math.round(y - SIZE / 2)}px, 0)`
      if (running && Math.abs(targetX - x) + Math.abs(targetY - y) > 0.6) {
        frame = requestAnimationFrame(tick)
      }
    }

    const onMove = (event: PointerEvent) => {
      targetX = event.clientX
      targetY = event.clientY
      if (!frame) frame = requestAnimationFrame(tick)
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      running = false
      window.removeEventListener('pointermove', onMove)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  return <div ref={ref} className="pointer-glow" aria-hidden="true" />
}