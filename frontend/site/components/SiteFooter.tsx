import Link from 'next/link'
import { site } from '@/lib/site'

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer__cols">
          <div>
            <div className="mono" style={{ color: 'var(--text)' }}>
              {site.title}
            </div>
            <p style={{ marginTop: '0.5rem', maxWidth: '22rem' }}>{site.tagline}</p>
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
          © {new Date().getFullYear()} {site.author} · 纯静态，Nginx 直发
        </div>
      </div>
    </footer>
  )
}