'use client'

import { useEffect } from 'react'

/**
 * 给正文里每个代码块挂一个复制按钮。
 *
 * 在 DOM 上做而不是把按钮烤进 HTML：复制是交互，静态产物里不该为它带标记；
 * 高亮才是「客户端零 JS」要守的那条（那个已经在构建时做完了）。
 */
export function CodeCopy({ containerId }: { containerId: string }) {
  useEffect(() => {
    const root = document.getElementById(containerId)
    if (!root) return

    const cleanups: (() => void)[] = []

    root.querySelectorAll('pre').forEach((pre) => {
      if (pre.querySelector('.code-copy')) return

      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'code-copy'
      button.textContent = '复制'

      const onClick = async () => {
        const code = pre.querySelector('code')?.textContent ?? ''
        try {
          await navigator.clipboard.writeText(code)
          button.textContent = '已复制'
          button.dataset.done = 'true'
        } catch {
          button.textContent = '复制失败'
        }
        window.setTimeout(() => {
          button.textContent = '复制'
          delete button.dataset.done
        }, 1600)
      }

      button.addEventListener('click', onClick)
      pre.appendChild(button)
      cleanups.push(() => {
        button.removeEventListener('click', onClick)
        button.remove()
      })
    })

    return () => cleanups.forEach((fn) => fn())
  }, [containerId])

  return null
}