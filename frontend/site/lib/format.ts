/**
 * 展示用的格式化。单独放一个文件，是为了让客户端组件不必 import lib/content ——
 * 那个模块里有构建期的 fetch 和环境变量，进客户端 bundle 只会添乱。
 *
 * 时间一律按站点所在时区（Asia/Shanghai）拆，不跟构建机的时区走：
 * 本地构建是 +08，CI 是 UTC，用本地时间会让同一篇文章在两边差 8 小时。
 */
const ZONE = 'Asia/Shanghai'

const formatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  hourCycle: 'h23',
  weekday: 'short',
})

interface ZonedParts {
  year: string
  month: string
  day: string
  hour: string
  minute: string
  weekday: string
}

function zonedParts(iso: string): ZonedParts | null {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  const parts = formatter.formatToParts(date)
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ''
  return {
    year: pick('year'),
    month: pick('month'),
    day: pick('day'),
    hour: pick('hour'),
    minute: pick('minute'),
    weekday: pick('weekday'),
  }
}

export function formatDate(iso?: string): string {
  if (!iso) return '—'
  const parts = zonedParts(iso)
  return parts ? `${parts.year}-${parts.month}-${parts.day}` : '—'
}

export interface DateParts {
  year: string
  month: string
  day: string
  weekday: string
  clock: string
}

/**
 * 动态是按时间往下读的，日期要在左栏竖着站住，所以把年月日拆开给布局用。
 */
export function dateParts(iso?: string): DateParts {
  const empty: DateParts = { year: '—', month: '—', day: '—', weekday: '', clock: '' }
  if (!iso) return empty
  const parts = zonedParts(iso)
  if (!parts) return empty
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    weekday: parts.weekday,
    clock: `${parts.hour}:${parts.minute}`,
  }
}

/** 一条动态放进"上一条 / 下一条"时只留一句引子，换行压成空格 */
export function excerpt(text: string, length = 42): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  const chars = Array.from(flat)
  if (chars.length <= length) return flat
  const head = chars.slice(0, length)
  // 尽量切在标点上：切在句子中间出来的引子读着别扭
  let cut = head.length
  for (let index = head.length - 1; index >= Math.floor(length * 0.55); index -= 1) {
    if ('，。、；：！？,.;:!?'.includes(head[index])) {
      cut = index
      break
    }
  }
  const body = head.slice(0, cut).join('').replace(/[，。、；：！？,.;:!?\s]+$/, '')
  return `${body}…`
}
