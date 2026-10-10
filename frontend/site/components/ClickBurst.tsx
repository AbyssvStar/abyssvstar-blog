'use client'

import { useEffect, useRef } from 'react'

/**
 * 点击处的扩散环 + 火星迸发。
 *
 * 用 canvas 而不是 DOM 圆环：DOM 那个是靠 scale 放大的 1.5px 边框，放大 7 倍后会被拉毛、显得廉价；
 * canvas 能画出"细而锐"的环，还能顺手撒一把带阻尼的火星（就是之前那种效果）。
 * 库的交互模式里没有"环"这种东西（只有推/吸/连/加），所以这一段自己画。
 */
export function ClickBurst() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (window.matchMedia('(pointer: coarse)').matches) return
    const ctx = node.getContext('2d')
    if (!ctx) return

    interface Ring { x: number; y: number; r: number; alpha: number }
    interface Spark { x: number; y: number; vx: number; vy: number; life: number; max: number }
    const rings: Ring[] = []
    const sparks: Spark[] = []
    let frame = 0
    let width = 0
    let height = 0

    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      node.width = Math.floor(width * dpr)
      node.height = Math.floor(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const step = () => {
      ctx.clearRect(0, 0, width, height)
      for (let i = rings.length - 1; i >= 0; i--) {
        const ring = rings[i]
        ring.r += 3.2
        ring.alpha -= 0.02
        if (ring.alpha <= 0) {
          rings.splice(i, 1)
          continue
        }
        ctx.strokeStyle = `rgba(110, 168, 254, ${ring.alpha})`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2)
        ctx.stroke()
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const spark = sparks[i]
        spark.life += 1
        if (spark.life >= spark.max) {
          sparks.splice(i, 1)
          continue
        }
        spark.x += spark.vx
        spark.y += spark.vy
        spark.vx *= 0.95
        spark.vy *= 0.95
        const alpha = (1 - spark.life / spark.max) * 0.8
        ctx.fillStyle = `rgba(142, 197, 255, ${alpha})`
        ctx.fillRect(spark.x, spark.y, 1.6, 1.6)
      }
      frame = requestAnimationFrame(step)
    }

    const onDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('a,button,input,textarea,select,label,summary,[role="button"]')) return
      rings.push({ x: event.clientX, y: event.clientY, r: 4, alpha: 0.5 })
      for (let i = 0; i < 16; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = 1.2 + Math.random() * 3.4
        sparks.push({
          x: event.clientX,
          y: event.clientY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0,
          max: 34 + Math.random() * 26,
        })
      }
    }

    size()
    frame = requestAnimationFrame(step)
    window.addEventListener('resize', size)
    window.addEventListener('pointerdown', onDown, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', size)
      window.removeEventListener('pointerdown', onDown)
    }
  }, [])

  return <canvas ref={ref} className="click-burst" aria-hidden="true" />
}