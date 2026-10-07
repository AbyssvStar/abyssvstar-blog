import { useEffect, useState } from 'react'
import { api, ApiError, Code, setCsrfToken } from './api/client'
import type { Me } from './api/types'
import { LoginPage } from './pages/LoginPage'
import { PostListPage } from './pages/PostListPage'
import { EditorPage } from './pages/EditorPage'

export function App() {
  const [me, setMe] = useState<Me | null>(null)
  const [booting, setBooting] = useState(true)

  useEffect(() => {
    // 刷新页面后会话 Cookie 还在，但 csrfToken 只存在内存里，
    // 所以启动时必须重新问一次 /auth/me 把它拿回来
    api
      .get<Me>('/auth/me')
      .then((m) => {
        setCsrfToken(m.csrfToken)
        setMe(m)
      })
      .catch((err: unknown) => {
        // 20001 是正常情况（还没登录），其他错误要让人看见
        if (!(err instanceof ApiError) || err.code !== Code.UNAUTHENTICATED) {
          console.error('启动检查失败', err)
        }
      })
      .finally(() => setBooting(false))
  }, [])

  if (booting) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ color: 'var(--text-muted)' }}>
        加载中…
      </div>
    )
  }

  if (!me) return <LoginPage onLoggedIn={setMe} />

  return (
    <Shell
      me={me}
      onLoggedOut={() => {
        setCsrfToken(null)
        setMe(null)
      }}
    />
  )
}

function Shell({ me, onLoggedOut }: { me: Me; onLoggedOut: () => void }) {
  const [busy, setBusy] = useState(false)
  // 只有两个页面，用状态做路由就够了。页面多起来再引 react-router
  const [editingId, setEditingId] = useState<number | null>(null)

  async function logout() {
    setBusy(true)
    try {
      await api.post('/auth/logout')
    } catch (err) {
      // 登出失败也要把人踢回登录页，本地状态清掉就行
      console.error('登出请求失败', err)
    } finally {
      setBusy(false)
      onLoggedOut()
    }
  }

  return (
    <div className="min-h-screen">
      <header
        className="flex items-center justify-between border-b px-6 py-3"
        style={{ borderColor: 'var(--border)' }}
      >
        <span className="font-medium">AbyssvStar 后台</span>
        <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--text-muted)' }}>
          <span>{me.username}</span>
          <button onClick={logout} disabled={busy} className="underline disabled:opacity-40">
            登出
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl p-6">
        {editingId === null ? (
          <PostListPage onUnauthenticated={onLoggedOut} onOpen={setEditingId} />
        ) : (
          <EditorPage postId={editingId} onBack={() => setEditingId(null)} />
        )}
      </main>
    </div>
  )
}
