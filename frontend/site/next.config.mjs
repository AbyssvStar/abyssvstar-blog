/** @type {import('next').NextConfig} */
const devProxy =
  process.env.NODE_ENV === 'development'
    ? {
        async rewrites() {
          const target = (process.env.SEARCH_PROXY_TARGET ?? 'http://127.0.0.1:8080').replace(/\/$/, '')
          return [{ source: '/api/v1/:path*', destination: `${target}/api/v1/:path*` }]
        },
      }
    : {}

const nextConfig = {
  // 全量静态导出：产物是纯 HTML/CSS/JS，由 Nginx 直接发（见 01-architecture.md 的数据流）
  output: 'export',
  // 静态托管下 /posts/foo/ 比 /posts/foo 少一层 rewrite，Nginx 用 index 直接命中
  trailingSlash: true,
  images: {
    // 导出模式没有按需优化服务；图片走 MinIO + Nginx，本来也不需要它
    unoptimized: true,
  },
  // 构建产物里不要留 source map，省得把源码结构发到线上
  productionBrowserSourceMaps: false,
  experimental: {
    // 只在安装版本受安全公告影响时提示升级
    agentUpgrade: 'security',
  },
  // 线上由 Nginx 把 /api/v1 转给后端；本地 next dev 没有 Nginx，需要同源代理。
  // 只在 development 挂 rewrites，静态导出构建时这个属性根本不会出现。
  ...devProxy,
}

export default nextConfig