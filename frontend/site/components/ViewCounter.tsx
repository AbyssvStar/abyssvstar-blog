'use client'

import { useEffect, useState } from 'react'

interface ViewCountResponse {
  count: number
}

export function ViewCounter({ type, id }: { type: 'POST' | 'NOTE'; id: number }) {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetch('/api/v1/views', {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, id }),
    }).catch(() => undefined)
    void fetch(`/api/v1/views?type=${type}&id=${id}`, { cache: 'no-store' })
      .then((response) => response.json())
      .then((body: { code: number; data?: ViewCountResponse }) => {
        if (!cancelled && body.code === 0 && body.data) setCount(body.data.count)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [id, type])

  return <span className="view-counter mono">{count === null ? '阅读 —' : `阅读 ${count}`}</span>
}