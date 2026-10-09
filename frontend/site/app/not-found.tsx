import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="wrap" style={{ padding: '6rem 0 8rem', textAlign: 'center' }}>
      <div className="kicker">404</div>
      <h1 style={{ fontSize: '2rem', marginTop: '0.8rem' }}>这里什么都没有</h1>
      <p className="muted" style={{ marginTop: '0.75rem' }}>
        页面可能被归档了，或者这个地址从来就不存在。
      </p>
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '1.6rem' }}>
        <Link href="/" className="chip">
          回首页
        </Link>
        <Link href="/posts/" className="chip">
          全部文章
        </Link>
      </div>
    </div>
  )
}