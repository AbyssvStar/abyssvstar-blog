'use client'

import { useEffect, useState } from 'react'

/** 正文图片点击放大。跟 CodeCopy 一样在 DOM 上加行为，静态产物里不带多余的标记 */
export function ImageZoom({ containerId }: { containerId: string }) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    const root = document.getElementById(containerId)
    if (!root) return
    const cleanups: (() => void)[] = []
    root.querySelectorAll('img').forEach((img) => {
      const onClick = () => setSrc(img.getAttribute('src'))
      img.classList.add('zoomable')
      img.addEventListener('click', onClick)
      cleanups.push(() => {
        img.removeEventListener('click', onClick)
        img.classList.remove('zoomable')
      })
    })
    return () => cleanups.forEach((fn) => fn())
  }, [containerId])

  useEffect(() => {
    if (!src) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSrc(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [src])

  if (!src) return null

  return (
    <div className="lightbox" role="dialog" aria-modal="true" onClick={() => setSrc(null)}>
      {/* 点空白或按 Esc 关闭 */}
      <img src={src} alt="" />
    </div>
  )
}