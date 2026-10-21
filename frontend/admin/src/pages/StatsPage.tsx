import { useEffect, useState } from 'react'
import { ApiError } from '../api/client'
import { statsApi } from '../api/stats'
import type { AdminStats } from '../api/types'

export function StatsPage() {
  const [data, setData] = useState<AdminStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void statsApi.get().then(setData).catch((reason: unknown) => {
      setError(reason instanceof ApiError ? reason.message : '统计加载失败')
    })
  }, [])

  if (error) return <div className="banner banner--danger">{error}</div>
  if (!data) return <p className="muted">读取中…</p>
  const heapPercent = data.heapMaxBytes > 0 ? (data.heapUsedBytes / data.heapMaxBytes) * 100 : 0

  return (
    <div className="stat-grid">
      <Stat label="本月 AI 成本" value={`¥${data.monthAiCost.toFixed(2)}`} />
      <Stat label="本月 AI 调用" value={data.monthAiCalls} />
      <Stat label="近 7 天阅读" value={data.viewsLast7Days} />
      <Stat label="待审留言" value={data.pendingComments} />
      <Stat label="已发布文章" value={data.publishedPosts} />
      <Stat label="已发布动态" value={data.publishedNotes} />
      <Stat label="JVM 堆使用" value={`${heapPercent.toFixed(1)}%`} />
      <Stat label="堆上限" value={`${(data.heapMaxBytes / 1024 / 1024).toFixed(0)} MB`} />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return <div className="stat-card"><span className="stat-card__label">{label}</span><strong>{value}</strong></div>
}