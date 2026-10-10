'use client'

import { useEffect, useState } from 'react'

/** 顶部 2px 进度条。用 rAF 节流 —— docs/07 里唯一允许监听 scroll 的地方 */
export function ReadingProgress() {
  const [percent, setPercent] = useState(0)

  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const doc = document.documentElement
      const total = doc.scrollHeight - doc.clientHeight
      setPercent(total <= 0 ? 0 : Math.min(100, Math.max(0, (doc.scrollTop / total) * 100)))
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
    <div className="progress" aria-hidden="true">
      <div className="progress__bar" style={{ width: `${percent}%` }} />
      <div className="progress__mark" style={{ left: `${percent}%` }} />
    </div>
  )
}