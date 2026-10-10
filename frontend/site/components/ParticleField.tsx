'use client'

import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  /** 静止时该在的位置，弹簧把它拉回来 */
  hx: number
  hy: number
  vx: number
  vy: number
  r: number
  cool: boolean
}

interface Ring {
  x: number
  y: number
  radius: number
  speed: number
  alpha: number
}

interface Spark {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  cool: boolean
}

/**
 * 星野粒子场。
 *
 * 这是这个站自己的动效语言 —— AbyssvStar，深渊与星，所以画的是星，不是落叶：
 *
 *  1. 每个粒子有一个「家」。指针进入半径后对它施力（磁吸 + 一点切向），离开后弹簧把它拉回去
 *  2. 邻近粒子之间连细线，指针与附近粒子之间也连线（"被吸引"的观感主要来自这一层）
 *  3. 在**非交互元素**上点击：扩散环 + 局部粒子迸发（点链接、按钮时不触发，免得干扰操作）
 *
 * 约束：只在标签页可见时跑；系统开了「减少动态效果」就完全不挂；DPR 上限 2；只画不改布局。
 */
export function ParticleField({ maxParticles = 120 }: { maxParticles?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    // 显式标注类型：下面的 resize/step 是函数声明，TS 不会保留上面的 null 收窄
    const canvas: HTMLCanvasElement = node
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const context = canvas.getContext('2d')
    if (!context) return
    // 显式标注类型：下面的 step/burst 是函数声明，TS 不会保留上面的 null 收窄
    const ctx: CanvasRenderingContext2D = context

    // 距离与力的参数都集中在这里，方便一处调手感
    const LINK_DIST = 118
    const CURSOR_DIST = 150
    const SPRING = 0.012
    const DAMPING = 0.9
    const PULL = 0.55
    const SWIRL = 0.16
    const BUCKETS = 5

    let width = 0
    let height = 0
    let particles: Particle[] = []
    let rings: Ring[] = []
    let sparks: Spark[] = []
    let pointer: { x: number; y: number } | null = null
    let frame = 0
    let last = performance.now()

    const palette = readPalette()

    function readPalette() {
      const style = getComputedStyle(document.documentElement)
      const accent = clean(style.getPropertyValue('--accent'), '#6ea8fe')
      const muted = clean(style.getPropertyValue('--text-muted'), '#9a9aa3')
      return { accent, muted }
    }

    /** 主题令牌在构建时被 light-dark() 编译过，万一读到 var(...) 这种没解析干净的值就退回默认色 */
    function clean(value: string, fallback: string) {
      const v = value.trim()
      if (!v || v.includes('var(') || v.length > 40) return fallback
      return v
    }

    function rgba(color: string, alpha: number) {
      const c = color.trim()
      if (c.startsWith('#')) {
        const hex = c.slice(1)
        const full = hex.length === 3 ? hex.split('').map((ch) => ch + ch).join('') : hex
        const n = Number.parseInt(full, 16)
        if (Number.isNaN(n)) return `rgba(110,168,254,${alpha})`
        return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`
      }
      const nums = c.replace(/[^0-9.,]/g, '').split(',').slice(0, 3).join(',')
      return nums ? `rgba(${nums},${alpha})` : `rgba(110,168,254,${alpha})`
    }

    function build() {
      const target = Math.min(maxParticles, Math.round((width * height) / 15000))
      particles = []
      const cols = Math.max(1, Math.ceil(Math.sqrt((target * width) / Math.max(height, 1))))
      const rows = Math.max(1, Math.ceil(target / cols))
      const cellW = width / cols
      const cellH = height / rows
      for (let row = 0; row < rows && particles.length < target; row++) {
        for (let col = 0; col < cols && particles.length < target; col++) {
          // 抖动一下，免得看起来像一张规则的点阵
          const hx = col * cellW + cellW * (0.2 + Math.random() * 0.6)
          const hy = row * cellH + cellH * (0.2 + Math.random() * 0.6)
          particles.push({ x: hx, y: hy, hx, hy, vx: 0, vy: 0, r: 0.6 + Math.random() * 1.1, cool: Math.random() > 0.45 })
        }
      }
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      build()
    }

    function burst(x: number, y: number) {
      rings.push({ x, y, radius: 6, speed: 210, alpha: 0.5 })
      for (const p of particles) {
        const dx = p.x - x
        const dy = p.y - y
        const dist = Math.hypot(dx, dy)
        if (dist > 130 || dist < 0.001) continue
        const power = (1 - dist / 130) * 3.6
        p.vx += (dx / dist) * power
        p.vy += (dy / dist) * power
      }
      for (let i = 0; i < 14; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = 40 + Math.random() * 150
        sparks.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0,
          max: 0.5 + Math.random() * 0.45,
          cool: Math.random() > 0.4,
        })
      }
    }

    function step(now: number) {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      // 把帧时间折算成"多少个 60fps 帧"，让不同刷新率下手感一致
      const k = Math.min(dt * 60, 2)

      ctx.clearRect(0, 0, width, height)

      // 1) 力：磁吸 + 弹簧回位
      for (const p of particles) {
        if (pointer) {
          const dx = pointer.x - p.x
          const dy = pointer.y - p.y
          const dist = Math.hypot(dx, dy)
          if (dist < CURSOR_DIST && dist > 0.001) {
            const falloff = 1 - dist / CURSOR_DIST
            const nx = dx / dist
            const ny = dy / dist
            p.vx += (nx * PULL + -ny * SWIRL) * falloff * k
            p.vy += (ny * PULL + nx * SWIRL) * falloff * k
          }
        }
        p.vx += (p.hx - p.x) * SPRING * k
        p.vy += (p.hy - p.y) * SPRING * k
        p.vx *= Math.pow(DAMPING, k)
        p.vy *= Math.pow(DAMPING, k)
        p.x += p.vx * k
        p.y += p.vy * k
      }

      // 2) 连线：按透明度分桶，一桶一次 stroke（避免逐条切换画笔）
      const paths: Path2D[] = []
      for (let i = 0; i < BUCKETS; i++) paths.push(new Path2D())
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i]
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const d2 = dx * dx + dy * dy
          if (d2 > LINK_DIST * LINK_DIST) continue
          const t = 1 - Math.sqrt(d2) / LINK_DIST
          const bucket = Math.min(BUCKETS - 1, Math.floor(t * BUCKETS))
          paths[bucket].moveTo(a.x, a.y)
          paths[bucket].lineTo(b.x, b.y)
        }
      }
      ctx.lineWidth = 1
      for (let i = 0; i < BUCKETS; i++) {
        ctx.strokeStyle = rgba(palette.accent, 0.04 + (i / BUCKETS) * 0.16)
        ctx.stroke(paths[i])
      }

      // 3) 指针与附近粒子的连线：这一层就是"被吸引"的直观来源
      if (pointer) {
        const nearby: { x: number; y: number; d: number }[] = []
        for (const p of particles) {
          const d = Math.hypot(p.x - pointer.x, p.y - pointer.y)
          if (d < CURSOR_DIST) nearby.push({ x: p.x, y: p.y, d })
        }
        nearby.sort((a, b) => a.d - b.d)
        ctx.strokeStyle = rgba(palette.accent, 0.3)
        ctx.beginPath()
        for (const item of nearby.slice(0, 10)) {
          ctx.moveTo(pointer.x, pointer.y)
          ctx.lineTo(item.x, item.y)
        }
        ctx.stroke()
      }

      // 4) 粒子本体：两种色调各一次 fill
      const cool = new Path2D()
      const warm = new Path2D()
      for (const p of particles) {
        const target = p.cool ? cool : warm
        target.moveTo(p.x + p.r, p.y)
        target.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      }
      ctx.fillStyle = rgba(palette.accent, 0.55)
      ctx.fill(cool)
      ctx.fillStyle = rgba(palette.muted, 0.4)
      ctx.fill(warm)

      // 5) 点击的扩散环
      for (let i = rings.length - 1; i >= 0; i--) {
        const ring = rings[i]
        ring.radius += ring.speed * dt
        ring.alpha -= dt * 0.85
        if (ring.alpha <= 0) {
          rings.splice(i, 1)
          continue
        }
        ctx.strokeStyle = rgba(palette.accent, Math.max(ring.alpha, 0))
        ctx.lineWidth = 1.4
        ctx.beginPath()
        ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2)
        ctx.stroke()
      }

      // 6) 迸发的火星
      for (let i = sparks.length - 1; i >= 0; i--) {
        const spark = sparks[i]
        spark.life += dt
        if (spark.life >= spark.max) {
          sparks.splice(i, 1)
          continue
        }
        spark.x += spark.vx * dt
        spark.y += spark.vy * dt
        spark.vx *= 0.94
        spark.vy *= 0.94
        const alpha = (1 - spark.life / spark.max) * 0.75
        ctx.fillStyle = rgba(spark.cool ? palette.accent : palette.muted, alpha)
        ctx.fillRect(spark.x, spark.y, 1.6, 1.6)
      }

      frame = requestAnimationFrame(step)
    }

    function onPointerMove(event: PointerEvent) {
      pointer = { x: event.clientX, y: event.clientY }
    }

    function onPointerOut(event: PointerEvent) {
      // relatedTarget 为空 = 指针离开了窗口，这时才松手
      if (!event.relatedTarget) pointer = null
    }

    function onPointerDown(event: PointerEvent) {
      pointer = { x: event.clientX, y: event.clientY }
      const target = event.target as HTMLElement | null
      // 只在非交互元素上迸发：点链接、按钮、输入框时不要凑热闹
      if (target?.closest('a,button,input,textarea,select,label,summary,[role="button"]')) return
      burst(event.clientX, event.clientY)
    }

    function onVisibility() {
      if (document.hidden) {
        if (frame) cancelAnimationFrame(frame)
        frame = 0
      } else if (!frame) {
        last = performance.now()
        frame = requestAnimationFrame(step)
      }
    }

    resize()
    frame = requestAnimationFrame(step)
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerout', onPointerOut, { passive: true })
    window.addEventListener('pointerdown', onPointerDown, { passive: true })
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerout', onPointerOut)
      window.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [maxParticles])

  return <canvas ref={ref} className="particles" aria-hidden="true" />
}