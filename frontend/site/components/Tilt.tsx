'use client'

import { useRef } from 'react'

/**
 * 鼠标移过时轻微倾斜，并让一层高光跟着指针走。
 *
 * 幅度刻意压小（±4°/±5°）：再大就从「有质感」变成「玩具」了。
 * 只写 CSS 变量，transform 与 background 交给合成层，指到哪算哪、松开就回位。
 */
export function Tilt({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)

  function onMove(event: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    const px = (event.clientX - rect.left) / rect.width
    const py = (event.clientY - rect.top) / rect.height
    el.style.setProperty('--tilt-x', `${(py - 0.5) * -4}deg`)
    el.style.setProperty('--tilt-y', `${(px - 0.5) * 5}deg`)
    el.style.setProperty('--spot-x', `${px * 100}%`)
    el.style.setProperty('--spot-y', `${py * 100}%`)
  }

  function onLeave() {
    const el = ref.current
    if (!el) return
    el.style.removeProperty('--tilt-x')
    el.style.removeProperty('--tilt-y')
  }

  return (
    <div
      ref={ref}
      className={['tilt', className ?? ''].join(' ').trim()}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      {children}
    </div>
  )
}