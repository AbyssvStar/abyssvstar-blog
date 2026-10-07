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
    <div className="flex min-h-screen items-center justify-center">
      <form
        onSubmit={submit}
        className="w-80 rounded-lg border p-6"
        style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}
      >
        <h1 className="mb-6 text-lg font-medium">后台登录</h1>

        <label className="mb-1 block text-sm" style={{ color: 'var(--text-muted)' }}>
          用户名
        </label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          autoFocus
          className="mb-4 w-full rounded border px-3 py-2 outline-none"
          style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
        />

        <label className="mb-1 block text-sm" style={{ color: 'var(--text-muted)' }}>
          密码
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          className="mb-4 w-full rounded border px-3 py-2 outline-none"
          style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
        />

        {error && (
          <p className="mb-4 text-sm" style={{ color: 'var(--danger)' }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy || !username || !password}
          className="w-full rounded py-2 font-medium disabled:opacity-40"
          style={{ background: 'var(--accent)', color: '#0a0a0b' }}
        >
          {busy ? '登录中…' : '登录'}
        </button>
      </form>
    </div>
  )
}
