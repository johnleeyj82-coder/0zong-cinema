import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 안드로이드 앱(Capacitor) 빌드는 상대 경로, GitHub Pages 배포는 /0zong-cinema/
export default defineConfig({
  base: process.env.BUILD_TARGET === 'app' ? './' : '/0zong-cinema/',
  plugins: [react()],
})
