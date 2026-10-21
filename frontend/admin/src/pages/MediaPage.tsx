import { useEffect, useState } from 'react'
import { ApiError } from '../api/client'
import { assetsApi } from '../api/assets'
import type { AssetInfo } from '../api/types'

export function MediaPage() {
  const [items, setItems] = useState<AssetInfo[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    try {
      setItems((await assetsApi.list(1, 100)).items)
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : '媒体加载失败')
    }
  }
  useEffect(() => { void load() }, [])

  async function remove(asset: AssetInfo) {
    if (!window.confirm('删除这张图？若仍被文章或动态引用会拒绝删除。')) return
    setBusy(true)
    try {
      await assetsApi.remove(asset.id)
      await load()
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : '删除失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      {error && <div className="banner banner--danger">{error}</div>}
      <div className="media-grid">
        {items.map((asset) => (
          <article key={asset.id} className="media-card">
            <img src={asset.variants?.w400 ?? asset.url} alt={asset.originalName ?? ''} />
            <div className="media-card__meta">
              <span>{asset.originalName ?? `#${asset.id}`}</span>
              <span>{(asset.sizeBytes / 1024).toFixed(0)} KB</span>
            </div>
            <button className="btn btn--danger" disabled={busy} onClick={() => void remove(asset)}>删除</button>
          </article>
        ))}
      </div>
    </div>
  )
}