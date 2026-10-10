'use client'

import { useEffect, useRef } from 'react'

/**
 * 鼠标底下的一团柔光。
 *
 * 只写 transform（合成层，不触发重排），用 rAF 缓动追上去；
 * 触摸设备没有 hover、开了「减少动态效果」也不挂。
 */
export function PointerGlow() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (window.matchMedia('(pointer: coarse)').matches) return

    const SIZE = 680
    let targetX = window.innerWidth / 2
    let targetY = window.innerHeight * 0.35
    let x = targetX
    let y = targetY
    let frame = 0
    let running = true

    const tick = () => {
      frame = 0
      x += (targetX - x) * 0.1
      y += (targetY - y) * 0.1
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