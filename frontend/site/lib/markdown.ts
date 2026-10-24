import { createHighlighter, type Highlighter } from 'shiki'

const LANGS = [
  'kotlin', 'java', 'typescript', 'javascript', 'tsx', 'jsx', 'json', 'yaml', 'toml', 'bash', 'shell',
  'sql', 'html', 'css', 'python', 'go', 'rust', 'dockerfile', 'markdown', 'diff', 'properties', 'xml', 'ini',
]

export interface Heading {
  id: string
  text: string
  depth: 2 | 3
}

let highlighterPromise: Promise<Highlighter> | null = null

function loadHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ['github-light', 'github-dark-default'],
      langs: LANGS,
    })
  }
  return highlighterPromise
}

/**
 * 发布快照里的 HTML 是 commonmark 直接渲染的，缺两样东西，都在构建时补：
 *
 *  1. 标题没有 id —— 目录点不动、链接分享不了
 *  2. 代码块没有配色 —— 用 Shiki 在这里上色，客户端零 JS（docs/07 的 8.1）
 *
 * 两件事都只依赖渲染好的 HTML，所以导出接口的契约不用为静态站加字段。
 */
export async function transformPostHtml(html: string): Promise<{ html: string; headings: Heading[] }> {
  const withIds = addHeadingIds(html)
  return { html: await highlightCode(withIds.html), headings: withIds.headings }
}

function addHeadingIds(html: string): { html: string; headings: Heading[] } {
  const headings: Heading[] = []
  const used = new Map<string, number>()

  const out = html.replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (_whole, depth: string, inner: string) => {
    // 正文由浏览器解析 HTML，目录拿到的却是纯文本；不解码会把 &quot; 原样显示出来。
    const text = decodeEntities(inner.replace(/<[^>]+>/g, '')).trim()
    const base = slugifyHeading(text) || `section-${headings.length + 1}`
    const seen = used.get(base) ?? 0
    used.set(base, seen + 1)
    const id = seen === 0 ? base : `${base}-${seen}`
    headings.push({ id, text, depth: depth === '3' ? 3 : 2 })
    return `<h${depth} id="${id}">${inner}</h${depth}>`
  })

  return { html: out, headings }
}

/** GitHub 风格的锚点：小写、去标点、空白折成短横线；中文原样留着 */
export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80)
}

async function highlightCode(html: string): Promise<string> {
  const blocks = [...html.matchAll(/<pre><code(?: class="language-([\w+#-]+)")?>([\s\S]*?)<\/code><\/pre>/g)]
  if (blocks.length === 0) return html

  const highlighter = await loadHighlighter()
  const loaded = new Set(highlighter.getLoadedLanguages())
  let out = html

  for (const match of blocks) {
    const [whole, rawLang, rawCode] = match
    const code = decodeEntities(rawCode)
    const lang = pickLang(rawLang, loaded)

    let rendered: string
    try {
      rendered = highlighter.codeToHtml(code, {
        lang,
        themes: { light: 'github-light', dark: 'github-dark-default' },
      })
      // 给 <pre> 补一个 data-language：代码块顶部那条标题栏（mac 圆点 + 语言名）靠它
      rendered = rendered.replace('<pre ', `<pre data-language="${lang}" `)
    } catch {
      rendered = `<pre><code>${escapeHtml(code)}</code></pre>`
    }
    // 用函数式替换：Shiki 的输出里带 $ 序列，当成替换串会被解释掉
    out = out.replace(whole, () => rendered)
  }

  return out
}

function pickLang(raw: string | undefined, loaded: Set<string>): string {
  if (!raw) return 'text'
  if (loaded.has(raw)) return raw
  const alias: Record<string, string> = {
    sh: 'bash', zsh: 'bash', kt: 'kotlin', ts: 'typescript', js: 'javascript',
    yml: 'yaml', docker: 'dockerfile', console: 'bash', text: 'text',
  }
  const mapped = alias[raw] ?? raw
  return loaded.has(mapped) ? mapped : 'text'
}

function decodeEntities(input: string): string {
  return input
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
}

function escapeHtml(input: string): string {
  return input.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}