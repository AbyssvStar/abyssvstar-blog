/**
 * 展示用的格式化。单独放一个文件，是为了让客户端组件不必 import lib/content ——
 * 那个模块里有构建期的 fetch 和环境变量，进客户端 bundle 只会添乱。
 */
export function formatDate(iso?: string): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}