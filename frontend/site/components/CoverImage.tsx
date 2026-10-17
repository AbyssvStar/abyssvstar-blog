'use client'

import { useState } from 'react'

/**
 * 封面图，带加载失败的兜底。
 *
 * 封面地址是后台传的图床链接：图床挂了、对象被删了、URL 写错了，浏览器都会画一个破图图标。
 * 这里把 onError 接住，换成一张随包的占位图（`.img-fallback` 用 CSS 画，暗色主题下会反相）。
 *
 * 必须是客户端组件：静态导出没有服务端兜底，只有浏览器知道图到底加载没成功。
 */
export function CoverImage({
  src,
  className,
  alt = '',
  loading = 'lazy',
}: {
  src?: string
  className: string
  alt?: string
  loading?: 'lazy' | 'eager'
}) {
  const [failed, setFailed] = useState(false)

  if (!src) return null
  if (failed) {
    // 占位图走 CSS background，不额外发请求 —— 免得兜底图自己再 404 一次
    return <span className={`${className} img-fallback`.trim()} role="img" aria-label="图片加载失败" />
  }

  return (
    // 静态导出没有图片优化服务，`next/image` 在 export 下用不了
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={className}
      src={src}
      alt={alt}
      loading={loading}
      decoding="async"
      onError={() => setFailed(true)}
    />
  )
}
