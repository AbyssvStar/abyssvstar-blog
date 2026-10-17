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
  /** 尘粒的出生时间与寿命：没有寿命的话，笔迹上会一直叠、糊成一片 */
  born?: number
  life?: number
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
    // 三个引用各归各位：#star-bg 画星野，两个 .galaxy 画拖动出来的星系
    const warpCanvas = paintRef.current
    const dustCanvas = dustRef.current
    const starCanvas = starRef.current
    if (!warpCanvas || !dustCanvas || !starCanvas) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const warpCtx = warpCanvas.getContext('2d')
    const dustCtx = dustCanvas.getContext('2d')
    const starCtx = starCanvas.getContext('2d')
    if (!warpCtx || !dustCtx || !starCtx) return

    // 令牌是 light-dark() 编出来的，切主题后 computed 值会变 —— 颜色得跟着重读，否则星野还是旧主题的色
    let colors = readTokens()
    const themeObserver = new MutationObserver(() => {
      colors = readTokens()
      buildStarSprites()
    })
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

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

    /**
     * 星点的光晕贴图（每种星色一张）。
     *
     * 原来用 `arc()` 画圆点 + `shadowBlur` 做光晕。shadowBlur 是 canvas 里最贵的操作，
     * 而且在这台机器的软件光栅下会画出莫名其妙的细折线（浅色主题下最明显：
     * 深色背景把那些痕迹吃掉了，白底上就露出来）。换成预渲染的径向渐变贴图，
     * 便宜、可控，也没有这个毛病。主题切换时重建一次（颜色来自令牌）。
     */
    let starSprites: HTMLCanvasElement[] = []
    const buildStarSprites = () => {
      starSprites = starColorList().map((color) => {
        const size = 32
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (ctx) {
          const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
          gradient.addColorStop(0, withAlpha(color, 1))
          gradient.addColorStop(0.26, withAlpha(color, 0.62))
          gradient.addColorStop(0.58, withAlpha(color, 0.16))
          gradient.addColorStop(1, withAlpha(color, 0))
          ctx.fillStyle = gradient
          ctx.fillRect(0, 0, size, size)
        }
        return canvas
      })
    }
    buildStarSprites()

    let width = 0
    let height = 0
    let focalDistance = 0
    let starList: Star[] = []
    let starFrame = 0
    let starRaf = 0
    let lastStarDraw = 0

    /**
     * 星点半径上限（CSS 像素）。
     *
     * 透视投影的 `focalDistance / star.z` 在 z→0 时发散，半径能涨到上千像素；视口里只落得下
     * 那一小段圆的边缘，看起来就是一道不知从哪来的细弧线（浅色主题用普通混合，最明显）。
     * 按像素密度算过的实际直径也就 3–4px，超过上限的一律当「擦身而过」，重生。
     */
    const MAX_STAR_RADIUS = 7
    // 整屏都在视口外时停掉绘制（rAF 本身由浏览器在标签页隐藏时处理，滚动出去不会）
    let heroVisible = true

    const createStar = (): Star => ({
      x: width * (0.1 + 0.8 * random()),
      y: height * (0.1 + 0.8 * random()),
      z: focalDistance * random(),
      color: Math.ceil(random() * 1000) % starColorList().length,
    })

    /**
     * 背板按 CSS 尺寸 × devicePixelRatio 配，再把绘制坐标缩放到 CSS 像素。
     *
     * 之前直接拿 clientWidth 当背板宽，等于按 1x 画：高分屏上星点和连线的边缘是糊的、圆的会变方。
     */
    const fitCanvas = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
      const rect = canvas.getBoundingClientRect()
      const w = rect.width || canvas.clientWidth || 1
      const h = rect.height || canvas.clientHeight || 1
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.max(1, Math.floor(w * dpr))
      canvas.height = Math.max(1, Math.floor(h * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      return { w, h }
    }

    const resizeStarry = () => {
      const size = fitCanvas(warpCanvas, warpCtx)
      width = size.w
      height = size.h
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
      if (!heroVisible) return
      // 每 2 帧画一次就够（参考实现就是这么省的）
      const now = performance.now()
      if (now - lastStarDraw < 32) return
      lastStarDraw = now
      starFrame = (starFrame + 1) % 2

      warpCtx.clearRect(0, 0, width, height)
      const starSpeed = width * focalDistanceLevel * starSpeedLevel
      for (const star of starList) {
        const scale = focalDistance / star.z
        const starX = ((star.x - width / 2) * scale) + width / 2
        const starY = ((star.y - height / 2) * scale) + height / 2
        star.z -= starSpeed
        if (
          star.z > 0 &&
          star.z <= focalDistance &&
          starRadius * scale * 0.8 <= MAX_STAR_RADIUS &&
          starX >= -20 &&
          starX <= width + 20 &&
          starY >= -20 &&
          starY <= height + 20
        ) {
          const radius = starRadius * scale * 0.8
          const opacity = 1 - 0.8 * (star.z / focalDistance)
          const sprite = starSprites[star.color]
          // 贴图比本体大几倍，那一圈渐变就是光晕
          const size = Math.max(radius * 6, 2.5)
          warpCtx.globalAlpha = opacity
          warpCtx.drawImage(sprite, starX - size / 2, starY - size / 2, size, size)
          warpCtx.globalAlpha = 1
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

    // 滚到下面的文章列表时，星野和星系没必要继续满速跑
    const visibility = new IntersectionObserver(
      (entries) => {
        heroVisible = entries.some((entry) => entry.isIntersecting)
      },
      { threshold: 0 },
    )
    visibility.observe(warpCanvas)

    const onResize = () => {
      resizeStarry()
    }
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      themeObserver.disconnect()
      visibility.disconnect()
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
      // 画布的 CSS 盒子是 hero 的 100%×100%（= 视口宽 × 视口高 − 顶栏），所以要按自己的 rect 配背板。
      // 之前用 innerWidth/innerHeight：既没按 dpr 缩放，高度还差 60px，画出来的圆是竖着压扁的。
      let galaxyW = 1
      let galaxyH = 1
      const sizeCanvas = () => {
        const dustSize = fitCanvas(dustCanvas!, ctxDust)
        fitCanvas(starCanvas!, ctxStar)
        galaxyW = dustSize.w
        galaxyH = dustSize.h
      }
      sizeCanvas()
      // 两层都用普通混合：加色混合（lighter）在这套画法里会出事 ——
      // 尘粒全生成在星系质心附近，一堆柔光叠加就在中心烧出一块白。
      // 柔和感靠尘粒自身的低透明度与拖尾（擦除式）来给，不靠加色。
      ctxDust.globalCompositeOperation = 'source-over'
      ctxStar.globalCompositeOperation = 'source-over'

      const galaxies: Galaxy[] = []
      const mouse = { pos: { x: galaxyW * 0.5, y: galaxyH * 0.5 }, speed: 0 }
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

      /**
       * 一团柔光的贴图。
       *
       * 参考实现用的是"200 个小点绕成螺旋"再放大到上百像素 —— 那玩意儿一多就结成一块，
       * 这就是"一片一片"的根源。换成单张径向渐变：一团真正的柔光，叠加时也是平滑过渡。
       */
      const createDustParticle = (): HTMLCanvasElement => {
        const size = 48
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) return canvas
        const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
        gradient.addColorStop(0, withAlpha(colors.cyan, 0.55))
        gradient.addColorStop(0.4, withAlpha(colors.ocean, 0.18))
        gradient.addColorStop(1, withAlpha(colors.ocean, 0))
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, size, size)
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
        born: performance.now(),
        // 寿命 8–10 秒；其中 20% 不给寿命 = 永不回收（永久星云，靠上面的 MAX_DUST 兜底）
        // 一律给寿命：之前留 20% 永久尘粒，结果就是屏幕上洗不掉的痕迹
        life: 8000 + random() * 2000,
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
          const now = performance.now()
          // life 为空 = 永久尘粒，不回收
          g.dust = g.dust.filter((d) => d.life === undefined || now - (d.born ?? now) < d.life)
          g.dust.forEach((d) => updateOrbit(d, g))
        })
      }

      const render = () => {
        // 拖尾用"擦除"实现：每帧抹掉 22% 已有像素。
        // 参考实现是往上涂低透明度底色 —— 在深色底上会留下洗不掉的脏印，也盖住了星野。
        ctxDust.globalCompositeOperation = 'destination-out'
        ctxDust.fillStyle = 'rgba(0, 0, 0, 0.22)'
        ctxDust.fillRect(0, 0, galaxyW, galaxyH)
        ctxDust.globalCompositeOperation = 'source-over'

        ctxStar.clearRect(0, 0, galaxyW, galaxyH)
        // 半透明 + shadowBlur 归零：不然（尤其叠加 lighter 时）光点会晃眼
        ctxStar.shadowBlur = 0
        ctxStar.fillStyle = withAlpha(colors.ocean, 0.72)
        ctxStar.strokeStyle = withAlpha(colors.sky, 0.1)
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
          // 尘粒：按剩余寿命淡出，所以笔迹后面是一层会自己散掉的薄雾
          const now = performance.now()
          g.dust.forEach((d) => {
            if (!d.texture || !d.size || d.born === undefined) return
            const fade = d.life === undefined ? 0.85 : 1 - (now - d.born) / d.life
            if (fade <= 0.02) return
            ctxDust.globalAlpha = fade * 0.5
            ctxDust.drawImage(d.texture, d.x - d.size / 2, d.y - d.size / 2, d.size, d.size)
          })
          ctxDust.globalAlpha = 1
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

      // 每个星系的上限：画很多笔之后不至于糊成一片
      const MAX_STARS = 420
      // 有 20% 永久尘粒，上限给大一些，够铺出星云又不至于糊
      const MAX_DUST = 360

      const draw = () => {
        if (!drawingMode || !currentGalaxy) return
        if (currentGalaxy.stars.length >= MAX_STARS) return
        // 最小散布 6px：鼠标慢速移动时，星星不会全叠在同一个像素上变成一团
        const spread = Math.max(mouse.speed, 6)
        for (let i = 0; i < 3; i++) {
          const star = newStar(mouse.pos.x, mouse.pos.y, spread)
          currentGalaxy.stars.push(star)
          // 尘粒跟在星星后面：小尺寸 + 低概率 + 有寿命，所以是"一层会散的薄雾"而不是一片
          if (currentGalaxy.dust.length < MAX_DUST && random() < 0.35) {
            currentGalaxy.dust.push(newDust(star.x, star.y, 5 + random() * 9))
          }
        }
        calculateCenter(currentGalaxy)
      }

      const loop = () => {
        drawRaf = window.requestAnimationFrame(loop)
        // 滚到下面的文章列表时，星系层没必要继续每帧擦除 + 重画
        if (!heroVisible) return
        draw()
        update()
        render()
      }

      /** 事件是不是落在画布上。画布的 CSS 盒子与视口不等价，所以坐标只能用它自己的 offsetX/Y。 */
      const onCanvas = (event: MouseEvent) =>
        (event.target as HTMLElement | null)?.tagName === 'CANVAS'

      const activateDraw = (event: MouseEvent) => {
        // 只有点在画布上才算开始（点链接、按钮不会触发）
        if (!onCanvas(event)) return
        drawingMode = true
        mouse.pos.x = event.offsetX
        mouse.pos.y = event.offsetY
        currentGalaxy = newGalaxy(event.offsetX, event.offsetY)
        galaxies.push(currentGalaxy)
      }

      const disableDraw = () => {
        drawingMode = false
        currentGalaxy = null
      }

      const moveEvent = (event: MouseEvent) => {
        // 指针已经离开画布（拖到顶栏或下面的文章区）就别再往里撒星
        if (!onCanvas(event)) return
        // 之前直接拿 clientX/clientY 当画布坐标：画布并不在视口原点，整个星系会偏到光标下方
        mouse.speed = distance2({ x: event.offsetX, y: event.offsetY }, { x: mouse.pos.x, y: mouse.pos.y })
        mouse.pos.x = event.offsetX
        mouse.pos.y = event.offsetY
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