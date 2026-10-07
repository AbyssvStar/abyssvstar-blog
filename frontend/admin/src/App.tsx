import { useEffect, useState } from 'react'
import { api, ApiError, Code, setCsrfToken } from './api/client'
import type { Me } from './api/types'
import { LoginPage } from './pages/LoginPage'
import { PostListPage } from './pages/PostListPage'
import { EditorPage } from './pages/EditorPage'
import { applyTheme, currentTheme, type Theme } from './theme'

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
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }} className="muted">
        加载中…
      </div>
    )
  }

  if (!me) {
    return (
      <>
        <div style={{ position: 'fixed', right: 16, top: 16 }}>
          <ThemeToggle />
        </div>
        <LoginPage onLoggedIn={setMe} />
      </>
    )
  }

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
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <span className="sidebar__mark" />
          AbyssvStar
        </div>
        <nav className="nav">
          <button
            className={`nav__item${editingId === null ? ' nav__item--active' : ''}`}
            onClick={() => setEditingId(null)}
          >
            文章
          </button>
          {editingId !== null && <span className="nav__item nav__item--active">编辑中</span>}
        </nav>
      </aside>

      <div className="main">
        <header className="topbar">
          <span className="topbar__title">{editingId === null ? '文章' : '编辑文章'}</span>
          <div className="topbar__right">
            <ThemeToggle />
            <span className="muted" style={{ fontSize: 13 }}>
              {me.username}
            </span>
            <button className="btn btn--ghost" onClick={() => void logout()} disabled={busy}>
              登出
            </button>
          </div>
        </header>

        <div className="content">
          {editingId === null ? (
            <PostListPage onUnauthenticated={onLoggedOut} onOpen={setEditingId} />
          ) : (
            <EditorPage postId={editingId} onBack={() => setEditingId(null)} />
          )}
        </div>
      </div>
    </div>
  )
}

function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(currentTheme)

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    setTheme(next)
  }

  return (
    <button className="theme-toggle" onClick={toggle} title="切换主题">
      {theme === 'dark' ? '☾ 深色' : '☀ 浅色'}
    </button>
  )
}
