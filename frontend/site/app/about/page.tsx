import type { Metadata } from 'next'
import { site } from '@/lib/site'

export const metadata: Metadata = {
  title: '关于',
  description: site.description,
  alternates: { canonical: '/about/' },
}

/**
 * 关于页留空：这段内容你自己写，我不代笔。
 * 想加什么直接写在下面（正文样式可以套 `md-body` 这个 class，和文章页一致）。
 * 要不要保留「联系 / 订阅」那类区块，也由你定。
 */
export default function AboutPage() {
  return (
    <div className="wrap" style={{ maxWidth: '44rem', padding: '3rem 0 4rem' }}>
      <h1 style={{ fontSize: '1.9rem' }}>关于</h1>
    </div>
  )
}