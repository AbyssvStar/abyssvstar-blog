'use client'

import { useEffect, useRef, useState } from 'react'

/** 终端里的 `star` 命令也放这一炮，所以事件名拿出来共用 */
export const BURST_EVENT = 'abyssvstar:burst'

export function fireStarBurst() {
  window.dispatchEvent(new Event(BURST_EVENT))
}

const SEQUENCE = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'b',
  'a',
]

/**
 * 小彩蛋：↑↑↓↓←→←→BA。
 *
 * 触发一次全屏星光 + 一句只出现几秒的话。解过一次就写进 localStorage —— 彩蛋的乐趣在
 * 「自己找到」，不是每次来访都被它打断。
 */
export function KonamiEgg() {
  const [bursts, setBursts] = useState<number[]>([])
  const [toast, setToast] = useState(false)
  const burstId = useRef(0)
  const burstTimers = useRef(new Set<number>())

  useEffect(() => {
    let index = 0
    let toastTimer: number | null = null

    function boom() {
      const id = ++burstId.current
      setBursts((current) => [...current.slice(-(MAX_BURST_LAYERS - 1)), id])
      const timer = window.setTimeout(() => {
        burstTimers.current.delete(timer)
        setBursts((current) => current.filter((item) => item !== id))
      }, BURST_DURATION_MS)
      burstTimers.current.add(timer)
    }

    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return

      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key
      index = key === SEQUENCE[index] ? index + 1 : key === SEQUENCE[0] ? 1 : 0
      if (index < SEQUENCE.length) return
      index = 0

      boom()
      if (window.localStorage.getItem(EGG_KEY) === '1') return
      try {
        window.localStorage.setItem(EGG_KEY, '1')
      } catch {
        // 隐私模式里写不了，那就每次都说一遍，也不算什么
      }
      setToast(true)
      if (toastTimer !== null) window.clearTimeout(toastTimer)
      toastTimer = window.setTimeout(() => setToast(false), 7000)
    }

    window.addEventListener('keydown', onKey)
    window.addEventListener(BURST_EVENT, boom)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener(BURST_EVENT, boom)
      burstTimers.current.forEach((timer) => window.clearTimeout(timer))
      burstTimers.current.clear()
      if (toastTimer !== null) window.clearTimeout(toastTimer)
    }
  }, [])

  return (
    <>
      {bursts.map((id) => (
        <div key={id} className="egg-burst" aria-hidden="true" />
      ))}
      {toast && (
        <div className="egg-toast" role="status">
          <div className="mono" style={{ color: 'var(--accent)' }}>
            ★ 你找到了一个彩蛋
          </div>
          <p style={{ margin: '0.35rem 0 0' }}>
            这里没有第二条命，只有一句：写东西这件事，慢慢来比较快。
          </p>
        </div>
      )}
    </>
  )
}

const EGG_KEY = 'abyssvstar-konami'
const BURST_DURATION_MS = 1900
const MAX_BURST_LAYERS = 6
