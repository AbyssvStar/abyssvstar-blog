import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // 开发时把接口代理到后端容器，这样 dev 环境也是同源 ——
    // 会话 Cookie 才能正常带上，不然会因为没有跨域凭证而一直 401
    proxy: {
      '/admin/api': 'http://127.0.0.1:8080',
    },
  },
  build: {
    // 产物给 Nginx 直发，放在 /srv/static/admin
    outDir: 'dist',
  },
})
