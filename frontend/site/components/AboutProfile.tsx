'use client'

import { useState } from 'react'

/**
 * 关于页的头像 + 名字 + 一句签名。
 *
 * 做成客户端组件只为一件事：头像是彩蛋。点一下它会转一圈，连点五下会换出一句平时不显示的签名。
 * 除此之外没有任何状态 —— 数据是构建时传进来的，页面上不会多一次请求。
 */
export function AboutProfile({
  avatarUrl,
  name,
  tagline,
  github,
}: {
  avatarUrl?: string
  name: string
  tagline: string
  github: string
}) {
  const [spins, setSpins] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const eggFound = spins >= 5

  function poke() {
    setSpinning(true)
    window.setTimeout(() => setSpinning(false), 700)
    setSpins((n) => n + 1)
  }

  return (
    <div className="about-profile">
      <button
        type="button"
        className="about-me-avatar"
        data-spin={spinning}
        onClick={poke}
        aria-label="头像"
        title="点一下试试"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" />
        ) : (
          <StarMark />
        )}
      </button>

      <div className="about-name">{name}</div>
      <p className="about-tagline">{eggFound ? '你点了五下。那我也认真一点：写下去就对了。' : tagline}</p>

      <div className="about-links">
        <a href={github} target="_blank" rel="noreferrer" aria-label="GitHub">
          <GitHubMark />
        </a>
      </div>
    </div>
  )
}

function StarMark() {
  return (
    <svg className="about-me-avatar__mark" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2.5c.6 4.6 1.9 6.9 6.5 7.5-4.6.6-5.9 2.9-6.5 7.5-.6-4.6-1.9-6.9-6.5-7.5 4.6-.6 5.9-2.9 6.5-7.5Z"
        fill="currentColor"
      />
      <circle cx="18.6" cy="18.4" r="1.5" fill="currentColor" opacity=".55" />
    </svg>
  )
}

function GitHubMark() {
  return (
    <svg className="about-links__icon" viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
      />
    </svg>
  )
}

