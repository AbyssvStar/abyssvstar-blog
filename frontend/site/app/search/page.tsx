import type { Metadata } from 'next'
import { SearchClient } from '@/components/SearchClient'
import { getTags } from '@/lib/content'

export const metadata: Metadata = {
  title: '搜索',
  description: '搜索站内已发布文章。',
  alternates: { canonical: '/search/' },
  robots: { index: false, follow: true },
}

export default async function SearchPage() {
  // 构建期取一次标签给「试试搜索」用：按篇数排，只取前三 —— 再多手机上就折行了
  const tags = await getTags()
  const hotTags = [...tags]
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map((tag) => tag.name)

  return <SearchClient hotTags={hotTags} />
}
