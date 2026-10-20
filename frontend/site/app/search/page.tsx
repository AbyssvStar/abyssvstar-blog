import type { Metadata } from 'next'
import { SearchClient } from '@/components/SearchClient'

export const metadata: Metadata = {
  title: '搜索',
  description: '搜索站内已发布文章。',
  alternates: { canonical: '/search/' },
  robots: { index: false, follow: true },
}

export default function SearchPage() {
  return <SearchClient />
}