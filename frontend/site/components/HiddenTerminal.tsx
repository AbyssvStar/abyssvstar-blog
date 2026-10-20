'use client'

import { useEffect, useRef, useState } from 'react'
import { site } from '@/lib/site'
import { fireStarBurst } from './KonamiEgg'

interface TermPost {
  slug: string
  title: string
}

type Kind = 'in' | 'out' | 'ok' | 'err'

interface Line {
  kind: Kind
  text: string
}

const GREETING: Line[] = [
  { kind: 'ok', text: 'abyssvstar shell · 输入 help 看看有什么' },
  { kind: 'out', text: '（不用怕，命令都在你自己的浏览器里跑）' },
]

/**
 * 右下角那个终端。
 *
 * 它是「玩的东西」，不是功能：命令全在本地执行，读的是构建期就带在页面上的文章清单，
 * 一个接口都不碰 —— 站点是纯静态的，这一条不能破。
 */
export function HiddenTerminal({ posts }: { posts: TermPost[] }) {
  const [open, setOpen] = useState(false)
  const [lines, setLines] = useState<Line[]>(GREETING)
  const [value, setValue] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  const bodyRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // 有新行就滚到底
  useEffect(() => {
    const el = bodyRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [lines, open])

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // 快捷键：反引号 / ~（正在输入框里打字时不抢）
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return
      if (event.key === '~' || event.key === '`' || (event.ctrlKey && event.key === '`')) {
        event.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function print(next: Line[]) {
    setLines((prev) => [...prev, ...next])
  }

  function run(raw: string) {
    const input = raw.trim()
    print([{ kind: 'in', text: `$ ${input}` }])
    if (!input) return

    setHistory((h) => [input, ...h].slice(0, 40))
    setHistoryIndex(-1)

    const [cmd, ...rest] = input.split(/\s+/)
    const arg = rest.join(' ')

    switch (cmd.toLowerCase()) {
      case 'help':
        print([
          { kind: 'out', text: 'help               这张表' },
          { kind: 'out', text: 'whoami             我是谁' },
          { kind: 'out', text: 'ls                 有哪些文章' },
          { kind: 'out', text: 'open <序号|slug>   打开一篇' },
          { kind: 'out', text: 'cat about          关于这一页' },
          { kind: 'out', text: 'theme <dark|light> 换主题' },
          { kind: 'out', text: 'star               放一炮（可以连续发）' },
          { kind: 'out', text: 'date / uptime / clear' },
          { kind: 'out', text: 'sudo …             试试看' },
        ])
        return

      case 'whoami':
        print([
          { kind: 'out', text: site.author },
          { kind: 'out', text: site.description },
        ])
        return

      case 'ls':
        if (rest[0] && rest[0] !== 'posts') {
          print([{ kind: 'err', text: `ls: 没有 ${rest[0]} 这个目录` }])
          return
        }
        if (posts.length === 0) {
          print([{ kind: 'out', text: '（还没写文章）' }])
          return
        }
        print(posts.map((post, i) => ({ kind: 'out' as Kind, text: `  ${i + 1}  ${post.title}` })))
        return

      case 'open': {
        const key = arg.trim()
        const post = /^\d+$/.test(key) ? posts[Number(key) - 1] : posts.find((p) => p.slug === key)
        if (!post) {
          print([{ kind: 'err', text: `没有这一篇：${key || '（空）'}` }])
          return
        }
        print([{ kind: 'ok', text: `打开 /posts/${post.slug}/` }])
        window.location.href = `/posts/${post.slug}/`
        return
      }

      case 'cat': {
        if (arg && arg !== 'about' && arg !== 'about.md') {
          print([{ kind: 'err', text: `cat: ${arg}: 没有这个文件（试试 cat about）` }])
          return
        }
        print([
          { kind: 'out', text: '这一页的正文是在后台写好的 Markdown，构建时渲染成 HTML。' },
          { kind: 'out', text: '站点重建一次，它才变成你正在看的这一页。' },
          { kind: 'out', text: `源码：${site.repo}` },
        ])
        return
      }

      case 'theme': {
        const next = arg.trim()
        if (next !== 'dark' && next !== 'light') {
          print([{ kind: 'err', text: '用法：theme dark 或 theme light' }])
          return
        }
        document.documentElement.setAttribute('data-theme', next)
        try {
          window.localStorage.setItem('site-theme', next)
        } catch {
          // 隐私模式里写不了，这次生效就行
        }
        print([{ kind: 'ok', text: `主题已切到 ${next}` }])
        return
      }

      case 'star':
        fireStarBurst()
        print([{ kind: 'ok', text: '★ 放了一炮' }])
        return

      case 'date':
        print([{ kind: 'out', text: new Date().toLocaleString('zh-CN', { hour12: false }) }])
        return

      case 'uptime': {
        const days = Math.max(1, Math.floor((Date.now() - Date.parse(site.startedAt)) / 86_400_000))
        print([{ kind: 'out', text: `这个站写了 ${days} 天（从 ${site.startedAt} 算起）` }])
        return
      }

      case 'clear':
        setLines([])
        return

      case 'sudo':
        print([{ kind: 'err', text: '你没有权限。你确实没有。' }])
        return

      default:
        print([{ kind: 'err', text: `未找到命令：${cmd}（试试 help）` }])
    }
  }

  return (
    <>
      <button
        type="button"
        className="term-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? '收起终端' : '打开终端'}
        title="按 ~ 也能开"
      >
        {open ? '×' : '>_'}
      </button>

      {open && (
        <div className="term" role="dialog" aria-label="隐藏终端">
          <div className="term__head">
            <span className="mono">abyssvstar@blog:~$</span>
            <span className="faint">命令都在本地跑</span>
          </div>

          <div className="term__body" ref={bodyRef}>
            {lines.map((line, i) => (
              // 行是纯文本、位置固定，用下标当 key 就够
              <div key={i} className="term__line" data-kind={line.kind}>
                {line.text}
              </div>
            ))}
          </div>

          <form
            className="term__input"
            onSubmit={(event) => {
              event.preventDefault()
              run(value)
              setValue('')
            }}
          >
            <span className="mono" style={{ color: 'var(--accent)' }}>
              $
            </span>
            <input
              ref={inputRef}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowUp') {
                  event.preventDefault()
                  if (history.length === 0) return
                  const next = Math.min(historyIndex + 1, history.length - 1)
                  setHistoryIndex(next)
                  setValue(history[next])
                } else if (event.key === 'ArrowDown') {
                  event.preventDefault()
                  const next = historyIndex - 1
                  if (next < 0) {
                    setHistoryIndex(-1)
                    setValue('')
                    return
                  }
                  setHistoryIndex(next)
                  setValue(history[next])
                }
              }}
              spellCheck={false}
              autoComplete="off"
              aria-label="命令"
              placeholder="help"
            />
          </form>
        </div>
      )}
    </>
  )
}