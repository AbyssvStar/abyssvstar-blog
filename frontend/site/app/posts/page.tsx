import type { Metadata } from 'next'
import { PostsView } from '@/components/PostsView'

export const metadata: Metadata = {
  title: '文章',
  description: '全部文章，可按标签筛选。',
  alternates: { canonical: '/posts/' },
}

export default function PostsPage() {
  return <PostsView />
}