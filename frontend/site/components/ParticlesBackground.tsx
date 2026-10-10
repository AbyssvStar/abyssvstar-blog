'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import Particles, { ParticlesProvider } from '@tsparticles/react'
import { loadSlim } from '@tsparticles/slim'
import { loadParticlesRepulseInteraction } from '@tsparticles/interaction-particles-repulse'
import type { ISourceOptions } from '@tsparticles/engine'

/**
 * 站点背景粒子。
 *
 * 用现成库（tsParticles，particles.js 的继任者）。暗色是默认主题，所以暗色下按"星辰"配：
 * 更亮更大小不均、连线更清楚、透明度缓慢起伏（眨眼）。浅色下回到清爽的细点。
 *
 * 四种行为：
 *   · 漂移：move.random + straight:false，粒子一直在动
 *   · 互相连接：links（阈值收得比较近，太远不画）
 *   · 粒子之间互相排斥（repulse 插件）：靠近了会被推开
 *   · 鼠标：grab 只画线不施力；attract 把它"轻轻拉到身边"——
 *     配合上面的斥力，粒子会在鼠标周边形成一圈，而不是被吸成一个点
 */
export function ParticlesBackground() {
  const [{ palette, dark }, setLook] = useState(initialLook)

  const [reduced, setReduced] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    const observer = new MutationObserver(() => setLook(readLook()))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  const options = useMemo<ISourceOptions>(() => {
    // 暗色（默认）当星辰配，浅色当细点配
    const dot = dark ? [palette.strong, palette.accent, palette.muted] : [palette.accent, palette.muted]
    return {
      fullScreen: { enable: false },
      detectRetina: true,
      fpsLimit: 60,
      particles: {
        number: { value: 68, density: { enable: true, width: 1400, height: 900 } },
        color: { value: dot },
        shape: { type: 'circle' },
        opacity: {
          value: dark ? { min: 0.5, max: 1 } : { min: 0.4, max: 0.9 },

        },
        size: { value: dark ? { min: 0.8, max: 3.2 } : { min: 0.9, max: 2.2 } },
        links: {
          enable: true,
          color: palette.accent,
          distance: 95,
          opacity: dark ? 0.42 : 0.3,
          width: 1,
        },
        // 粒子之间的斥力：这是"不挤成一堆"的关键
        // 斥力放宽到 150px、力度加大：粒子不会挤到鼠标那一点上
        repulse: { enable: true, distance: 150, duration: 0.35, factor: 2, speed: 2 },
        move: {
          enable: true,
          speed: { min: 0.5, max: 1.6 },
          direction: 'none',
          random: true,
          straight: false,
          outModes: { default: 'out' },
        },
      },
      interactivity: {
        // 画布本身不吃指针事件，所以要让引擎监听 window 才能感知鼠标
        detectsOn: 'window',
        events: {
          onHover: { enable: true, mode: ['grab', 'attract'] },
          // 点击是
          resize: { enable: true },
        },
        modes: {
          // 只画线、不施力，所以移动鼠标不会把粒子拖成一束
          grab: { distance: 150, links: { opacity: dark ? 0.6 : 0.45, color: palette.accent } },
          // 只从远处轻轻拉（220px 开始、速度 0.3），进了 150px 又被上面的斥力顶开，
          // 两者平衡时粒子会挂在鼠标周边一圈。如果这样还被吸进去，就把 attract 从 mode 里删掉，
          // 只留 grab —— 那是"完全不吸收"的配置（库的 attract 本身是纯向心力，做不到硬性轨道）。
          attract: { distance: 220, duration: 0.5, speed: 0.3 },
          repulse: { distance: 160, duration: 0.4, factor: 1.6, speed: 2.4 },
        },
      },
    }
  }, [palette, dark])


  // 首页有自己的星野 + 拖动星系，这里不再叠一层，免得两套背景打架
  if (reduced || pathname === '/') return null

  return (
    <ParticlesProvider
      init={async (engine) => {
        await loadSlim(engine)
        // 粒子之间的斥力不在精简包里，要单独挂这个插件
        await loadParticlesRepulseInteraction(engine)
      }}
    >
      <Particles id="site-particles" className="particles-bg" options={options} />
    </ParticlesProvider>
  )
}

interface Look {
  palette: { accent: string; muted: string; strong: string }
  dark: boolean
}

function readLook(): Look {
  const style = getComputedStyle(document.documentElement)
  return {
    palette: {
      accent: clean(style.getPropertyValue('--accent'), '#6ea8fe'),
      muted: clean(style.getPropertyValue('--text-muted'), '#9a9aa3'),
      strong: clean(style.getPropertyValue('--text'), '#e8e8ea'),
    },
    // 默认主题是暗色：只有显式选了 light 才算浅色
    dark: document.documentElement.getAttribute('data-theme') !== 'light',
  }
}

/** 主题令牌是 light-dark() 编译出来的，万一读到没解析干净的 var(...) 就退回默认色 */
function clean(value: string, fallback: string): string {
  const v = value.trim()
  return !v || v.includes('var(') || v.length > 40 ? fallback : v
}

function initialLook(): Look {
  return typeof window === 'undefined'
    ? { palette: { accent: '#6ea8fe', muted: '#9a9aa3', strong: '#e8e8ea' }, dark: true }
    : readLook()
}