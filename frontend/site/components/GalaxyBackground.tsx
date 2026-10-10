'use client'

import { useEffect, useRef } from 'react'

/**
 * 首页那套星河效果。逻辑照搬参考实现（GalaxyBg.vue），只做三处适配：
 *   颜色改读本站的设计令牌、移动端只留星野、尊重「减少动态效果」
 *
 * 它分两部分：
 *   1) 星野：星星带 z 轴，持续朝观众飞来（透视投影 + 发光），一直跑
 *   2) 拖动：在画布上按下左键 → 建立一个"星系"；按住移动时不断抛出星星与尘粒，
 *      它们绕星系质心转，角速度 ω = (0.5 + speed*0.5) / distance —— 内圈快、外圈慢
 *      （就是差速自转，不会变成刚性转盘），拖动过程中还画「中心 → 星」的线
 */

interface Star {
  x: number
  y: number
  z: number
  color: number
}

interface Pos {
  x: number
  y: number
}

interface Orbit {
  x: number
  y: number
  radius?: number
  size?: number
  speed: number
  angle: number
  distance: number
  texture?: HTMLCanvasElement
}

interface Galaxy {
  x: number
  y: number
  stars: Orbit[]
  dust: Orbit[]
  angleOffsetX: number
  angleOffsetY: number
  realAngleOffsetX: number
  realAngleOffsetY: number
}

interface Tokens {
  page: string
  ocean: string
  cyan: string
  aqua: string
  sky: string
}

export function GalaxyBackground() {
  const starRef = useRef<HTMLCanvasElement>(null)
  const dustRef = useRef<HTMLCanvasElement>(null)
  const paintRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const starCanvas = starRef.current
    const dustCanvas = dustRef.current
    const paintCanvas = paintRef.current
    if (!starCanvas || !dustCanvas || !paintCanvas) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const starCtx = starCanvas.getContext('2d')
    const dustCtx = dustCanvas.getContext('2d')
    const paintCtx = paintCanvas.getContext('2d')
    if (!starCtx || !dustCtx || !paintCtx) return

    const colors = readTokens()
    const toRgb = (hex: string): string => {
      const normalized = hex.replace('#', '')
      const value = Number.parseInt(normalized, 16)
      return `${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}`
    }
    const withAlpha = (hex: string, alpha: number): string => `rgba(${toRgb(hex)}, ${alpha})`
    const random = () => Math.random()
    const TAU = Math.PI * 2

    // ---------------- 1) 星野（照搬 StarrySky） ----------------
    const starColorList = () => [colors.ocean, colors.cyan, colors.aqua]
    const starRadius = 0.9
    const focalDistanceLevel = 0.4
    const starCountLevel = 0.2
    const starSpeedLevel = 0.0005

    let width = 0
    let height = 0
    let focalDistance = 0
    let starList: Star[] = []
    let starFrame = 0
    let starRaf = 0
    let lastStarDraw = 0

    const createStar = (): Star => ({
      x: width * (0.1 + 0.8 * random()),
      y: height * (0.1 + 0.8 * random()),
      z: focalDistance * random(),
      color: Math.ceil(random() * 1000) % starColorList().length,
    })

    const resizeStarry = () => {
      starCanvas.width = starCanvas.clientWidth
      starCanvas.height = starCanvas.clientHeight
      starCanvas.style.backgroundColor = colors.page
      width = starCanvas.clientWidth
      height = starCanvas.clientHeight
      focalDistance = width * focalDistanceLevel
      const count = Math.ceil(width * starCountLevel)
      if (starList.length > count) {
        starList.splice(count)
      } else {
        let missing = count - starList.length
        while (missing--) starList.push(createStar())
      }
    }

    const renderStarry = () => {
      starRaf = window.requestAnimationFrame(renderStarry)
      // 每 2 帧画一次就够（参考实现就是这么省的）
      const now = performance.now()
      if (now - lastStarDraw < 32) return
      lastStarDraw = now
      starFrame = (starFrame + 1) % 2

      starCtx.clearRect(0, 0, width, height)
      const starSpeed = width * focalDistanceLevel * starSpeedLevel
      for (const star of starList) {
        const starX = ((star.x - width / 2) * (focalDistance / star.z)) + width / 2
        const starY = ((star.y - height / 2) * (focalDistance / star.z)) + height / 2
        star.z -= starSpeed
        if (
          star.z > 0 &&
          star.z <= focalDistance &&
          starX >= -20 &&
          starX <= width + 20 &&
          starY >= -20 &&
          starY <= height + 20
        ) {
          const radius = starRadius * ((focalDistance / star.z) * 0.8)
          const opacity = 1 - 0.8 * (star.z / focalDistance)
          const color = starColorList()[star.color]
          starCtx.fillStyle = withAlpha(color, opacity)
          starCtx.shadowOffsetX = 0
          starCtx.shadowOffsetY = 0
          starCtx.shadowColor = color
          starCtx.shadowBlur = 10
          starCtx.beginPath()
          starCtx.arc(starX, starY, radius, 0, TAU)
          starCtx.fill()
        } else {
          star.x = width * (0.1 + 0.8 * random())
          star.y = height * (0.1 + 0.8 * random())
          star.z = focalDistance * random()
          star.color = Math.ceil(random() * 1000) % starColorList().length
        }
      }
    }

    resizeStarry()
    starList = Array.from({ length: Math.ceil(width * starCountLevel) }, createStar)
    renderStarry()

    // 移动端只留星野，不做拖动（参考实现也是这个判断）
    const coarse = window.matchMedia('(pointer: coarse)').matches
    let stopGalaxy: (() => void) | null = null
    if (!coarse) stopGalaxy = startGalaxy()

    const onResize = () => {
      resizeStarry()
    }
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      window.cancelAnimationFrame(starRaf)
      stopGalaxy?.()
    }

    // ---------------- 2) 拖动成星系（照搬 useGalaxy） ----------------
    function startGalaxy(): () => void {
      if (!dustCtx || !starCtx) return () => {}
      const ctxDust = dustCtx
      const ctxStar = starCtx

      // 只有尘埃层与星层随窗口改尺寸；#star-bg 是常驻星野，由上面那部分自己管
      const canvases = [dustCanvas!, starCanvas!]
      const sizeCanvas = () => {
        for (const c of canvases) {
          c.width = window.innerWidth
          c.height = window.innerHeight
        }
      }
      sizeCanvas()
      ctxDust.globalCompositeOperation = 'lighter'
      ctxStar.globalCompositeOperation = 'lighter'

      const galaxies: Galaxy[] = []
      const mouse = { pos: { x: window.innerWidth * 0.5, y: window.innerHeight * 0.5 }, speed: 0 }
      let currentGalaxy: Galaxy | null = null
      let drawingMode = false
      let drawRaf = 0
      let moveFrameCount = 0

      const angle2 = (p1: Pos, p2: Pos) => Math.atan2(p2.y - p1.y, p2.x - p1.x)
      const distance2 = (p1: Pos, p2: Pos) => Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2)

      const calculateParams = (item: Orbit, g: Galaxy) => {
        item.angle = angle2({ x: g.x, y: g.y }, { x: item.x, y: item.y })
        item.distance = distance2({ x: g.x, y: g.y }, { x: item.x, y: item.y })
      }

      const newGalaxy = (x: number, y: number): Galaxy => {
        const g: Galaxy = {
          x,
          y,
          stars: [],
          dust: [],
          angleOffsetX: Math.PI * 2 * random(),
          angleOffsetY: Math.PI * 2 * random(),
          realAngleOffsetX: 0,
          realAngleOffsetY: 0,
        }
        return g
      }

      const newStar = (x: number, y: number, spread: number): Orbit => ({
        x: x + Math.cos(TAU * random()) * spread,
        y: y + Math.sin(TAU * random()) * spread,
        radius: random() + 0.25,
        speed: random(),
        angle: 0,
        distance: 0,
      })

      /** 尘粒纹理：参考实现这里用了个未定义的 length（算出来是 NaN，实际画不出东西），
       *  按它的本意补成 200，尘粒才会真的出现。 */
      const createDustParticle = (): HTMLCanvasElement => {
        const canvas = document.createElement('canvas')
        const cx = 50
        const cy = 50
        canvas.width = 100
        canvas.height = 100
        const ctx = canvas.getContext('2d')
        if (!ctx) return canvas
        ctx.fillStyle = withAlpha(colors.cyan, 0.08)
        const spreadX = -5 + random() * 10
        const spreadY = -5 + random() * 10
        const rangeX = 10 + random() * (cx / 2)
        const rangeY = 10 + random() * (cy / 2)
        const STEPS = 200
        for (let index = 0; index < STEPS; index++) {
          const seed = random()
          const x = Math.cos((TAU / spreadX / STEPS) * index) * seed * rangeX + cx
          const y = Math.sin((TAU / spreadY / STEPS) * index) * seed * rangeY + cy
          ctx.beginPath()
          ctx.arc(x, y, seed * 4, 0, TAU)
          ctx.fill()
        }
        return canvas
      }

      const newDust = (x: number, y: number, size: number): Orbit => ({
        x,
        y,
        size,
        speed: random(),
        texture: createDustParticle(),
        angle: 0,
        distance: 0,
      })

      const calculateCenter = (g: Galaxy) => {
        if (!g.stars.length) return
        g.x = g.stars.reduce((sum, s) => sum + s.x, 0) / g.stars.length
        g.y = g.stars.reduce((sum, s) => sum + s.y, 0) / g.stars.length
        g.stars.forEach((s) => calculateParams(s, g))
        g.dust.forEach((d) => calculateParams(d, g))
      }

      /** 差速自转：ω = (0.5 + speed*0.5) / distance —— 内圈快、外圈慢 */
      const updateOrbit = (item: Orbit, g: Galaxy) => {
        if (g === currentGalaxy && drawingMode) return
        item.angle += (0.5 + item.speed * 0.5) / item.distance
        item.x = g.x + Math.cos(item.angle + g.realAngleOffsetX) * item.distance
        item.y = g.y + Math.sin(item.angle + g.realAngleOffsetY) * item.distance
      }

      const update = () => {
        galaxies.forEach((g) => {
          if (g !== currentGalaxy) {
            if (g.realAngleOffsetX < g.angleOffsetX) {
              g.realAngleOffsetX += (g.angleOffsetX - g.realAngleOffsetX) * 0.05
            }
            if (g.realAngleOffsetY < g.angleOffsetY) {
              g.realAngleOffsetY += (g.angleOffsetY - g.realAngleOffsetY) * 0.05
            }
          }
          g.stars.forEach((s) => updateOrbit(s, g))
          g.dust.forEach((d) => updateOrbit(d, g))
        })
      }

      const render = () => {
        // 尘埃层用低透明度底色反复覆盖 = 拖尾
        ctxDust.globalCompositeOperation = 'source-over'
        ctxDust.fillStyle = withAlpha(colors.page, 0.08)
        ctxDust.fillRect(0, 0, dustCanvas!.width, dustCanvas!.height)
        ctxDust.globalCompositeOperation = 'lighter'

        ctxStar.clearRect(0, 0, starCanvas!.width, starCanvas!.height)
        ctxStar.fillStyle = colors.ocean
        ctxStar.strokeStyle = withAlpha(colors.sky, 0.12)
        ctxStar.beginPath()

        if (drawingMode) {
          galaxies.forEach((g) => {
            ctxStar.moveTo(g.x, g.y)
            ctxStar.arc(g.x, g.y, 2, 0, TAU)
          })
        }

        galaxies.forEach((g) => {
          g.stars.forEach((s) => {
            ctxStar.moveTo(s.x, s.y)
            ctxStar.arc(s.x, s.y, s.radius ?? 1, 0, TAU)
          })
          g.dust.forEach((d) => {
            if (d.texture && d.size) {
              ctxDust.drawImage(d.texture, d.x - d.size * 0.5, d.y - d.size * 0.5, d.size, d.size)
            }
          })
        })

        ctxDust.fill()
        ctxStar.fill()

        // 拖动时画「中心 → 星」的线
        if (drawingMode && currentGalaxy) {
          ctxStar.beginPath()
          currentGalaxy.stars.forEach((s) => {
            ctxStar.moveTo(s.x, s.y)
            ctxStar.lineTo(currentGalaxy!.x, currentGalaxy!.y)
          })
          ctxStar.stroke()
        }
      }

      const draw = () => {
        if (!drawingMode || !currentGalaxy) return
        currentGalaxy.stars.push(newStar(mouse.pos.x, mouse.pos.y, mouse.speed))
        currentGalaxy.stars.push(newStar(mouse.pos.x, mouse.pos.y, mouse.speed))
        currentGalaxy.stars.push(newStar(mouse.pos.x, mouse.pos.y, mouse.speed))
        if (mouse.speed * 1.5 > 13 && mouse.speed < 100) {
          currentGalaxy.dust.push(
            newDust(
              currentGalaxy.x + Math.cos(TAU * random()) * mouse.speed * 0.1,
              currentGalaxy.y + Math.sin(TAU * random()) * mouse.speed * 0.1,
              mouse.speed * 1.5,
            ),
          )
        }
        calculateCenter(currentGalaxy)
      }

      const loop = () => {
        drawRaf = window.requestAnimationFrame(loop)
        draw()
        update()
        render()
      }

      const activateDraw = (event: MouseEvent) => {
        // 只有点在画布上才算开始（点链接、按钮不会触发）
        if ((event.target as HTMLElement | null)?.tagName !== 'CANVAS') return
        drawingMode = true
        mouse.pos.x = event.clientX
        mouse.pos.y = event.clientY
        currentGalaxy = newGalaxy(event.clientX, event.clientY)
        galaxies.push(currentGalaxy)
      }

      const disableDraw = () => {
        drawingMode = false
        currentGalaxy = null
      }

      const moveEvent = (event: MouseEvent) => {
        mouse.speed = distance2({ x: event.clientX, y: event.clientY }, { x: mouse.pos.x, y: mouse.pos.y })
        mouse.pos.x = event.clientX
        mouse.pos.y = event.clientY
        // 鼠标移动时每 2 帧才抛一次
        moveFrameCount = (moveFrameCount + 1) % 2
        if (moveFrameCount === 0) draw()
      }

      const onResize = () => {
        sizeCanvas()
      }

      loop()
      window.addEventListener('mousedown', activateDraw)
      window.addEventListener('mousemove', moveEvent)
      window.addEventListener('mouseup', disableDraw)
      window.addEventListener('resize', onResize)

      return () => {
        window.cancelAnimationFrame(drawRaf)
        window.removeEventListener('mousedown', activateDraw)
        window.removeEventListener('mousemove', moveEvent)
        window.removeEventListener('mouseup', disableDraw)
        window.removeEventListener('resize', onResize)
        galaxies.length = 0
        for (const c of canvases) {
          c.width = 0
          c.height = 0
        }
      }
    }
  }, [])

  return (
    <>
      <canvas ref={paintRef} id="star-bg" aria-hidden="true" />
      <canvas ref={dustRef} className="galaxy" aria-hidden="true" />
      <canvas ref={starRef} className="galaxy" aria-hidden="true" />
    </>
  )
}

function readTokens(): Tokens {
  const style = getComputedStyle(document.documentElement)
  const pick = (name: string, fallback: string) => {
    const v = style.getPropertyValue(name).trim()
    return !v || v.includes('var(') || v.length > 40 ? fallback : v
  }
  return {
    page: pick('--bg', '#0b1119'),
    ocean: pick('--accent', '#6ea8fe'),
    cyan: pick('--sky', '#8ec5ff'),
    aqua: pick('--aqua', '#67e8f9'),
    sky: pick('--sky', '#8ec5ff'),
  }
}