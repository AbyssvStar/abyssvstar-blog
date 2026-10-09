/** @type {import('next').NextConfig} */
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
}

export default nextConfig