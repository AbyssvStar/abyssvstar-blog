import { useState } from 'react'
import { api, ApiError, setCsrfToken } from '../api/client'
import type { Me } from '../api/types'

export function LoginPage({ onLoggedIn }: { onLoggedIn: (me: Me) => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const me = await api.post<Me>('/auth/login', { username, password })
      // 登录响应里的 csrfToken 必须存下来，后面所有写操作都靠它
      setCsrfToken(me.csrfToken)
      onLoggedIn(me)
    } catch (err) {
      // 20004 是「用户名或密码错误」，后端刻意不区分是哪个错
      setError(err instanceof ApiError ? err.message : '登录失败，请重试')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: 16 }}>
      <form onSubmit={submit} className="panel" style={{ width: 320 }}>
        <div className="panel__header">
          <span className="panel__title">登录</span>
        </div>
        <div className="panel__body">
          <label className="field-label" htmlFor="u">
            用户名
          </label>
          <input
            id="u"
            className="field"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoFocus
            style={{ marginBottom: 12 }}
          />

          <label className="field-label" htmlFor="p">
            密码
          </label>
          <input
            id="p"
            type="password"
            className="field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            style={{ marginBottom: 14 }}
          />

          {error && (
            <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12, marginTop: 0 }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={busy || !username || !password}
            className="btn btn--primary"
            style={{ justifyContent: 'center', padding: '7px 10px', width: '100%' }}
          >
            {busy ? '登录中…' : '登录'}
          </button>
        </div>
      </form>
    </div>
  )
}
