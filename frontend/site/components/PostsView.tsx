import { getPosts, getTags } from '@/lib/content'
import { PostsBrowser } from '@/components/PostsBrowser'

/**
 * 文章列表页。
 *
 * 分页与筛选都在浏览器里（见 `PostsBrowser`）：静态导出没有服务端，
 * 而把全部文章放进同一个 HTML，对爬虫反而更友好。等文章多到 HTML 太大再说（docs/01 §7.2 提过分级构建）。
 */
export async function PostsView() {
  const [posts, tags] = await Promise.all([getPosts(), getTags()])

  return (
    <div className="wrap" style={{ padding: '3rem 0 4rem' }}>
      <header style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.8rem' }}>文章</h1>
      </header>
      <PostsBrowser posts={posts} tags={tagsByCount(tags).map((tag) => tag.name)} />
    </div>
  )
}

/** 标签按篇数倒序：常写的排前面，比按拼音排有用 */
function tagsByCount(tags: { name: string; count: number }[]): { name: string; count: number }[] {
  return [...tags].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}