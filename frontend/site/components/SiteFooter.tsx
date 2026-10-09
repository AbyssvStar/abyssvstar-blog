import Link from 'next/link'
import { site } from '@/lib/site'

/**
 * 构建时间。静态站没有"运行时间"，构建时间就是它的心跳 ——
 * 顺便让读者一眼看出这是构建出来的页面，而不是某个后台在实时渲染。
 */
function buildStamp(): string {
  return new Date().toISOString().slice(0, 16).replace('T', ' ') + 'Z'
}

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer__cols">
          <div>
            <div className="mono" style={{ color: 'var(--text)' }}>
              {site.title}
            </div>
            <p style={{ marginTop: '0.5rem', maxWidth: '22rem' }}>{site.description}</p>
          </div>
          <div>
            <div className="kicker" style={{ marginBottom: '0.5rem' }}>
              导航
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {site.nav.map((item) => (
                <Link key={item.href} href={item.href}>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <div className="kicker" style={{ marginBottom: '0.5rem' }}>
              订阅
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <a href="/rss.xml">RSS</a>
              <a href={site.repo} rel="noreferrer" target="_blank">
                GitHub
              </a>
            </div>
          </div>
        </div>
        <div className="rule" style={{ margin: '1.75rem 0 1rem' }} />
        <div className="mono" style={{ fontSize: '0.72rem' }}>
          © {new Date().getFullYear()} {site.author} · 纯静态，Nginx 直发 · 构建于 {buildStamp()}
        </div>
      </div>
    </footer>
  )
}