import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// app: 안드로이드(Capacitor) 빌드, preview: claude.ai 아티팩트용 단일 HTML, 그 외: GitHub Pages
const target = process.env.BUILD_TARGET
const plugins = [react()]
if (target === 'preview') plugins.push((await import('vite-plugin-singlefile')).viteSingleFile())

export default defineConfig({
  base: target === 'app' || target === 'preview' ? './' : '/0zong-cinema/',
  plugins,
  resolve: target === 'preview'
    ? { alias: [{ find: /^\.\/fonts\.js$/, replacement: fileURLToPath(new URL('./src/fonts-web.js', import.meta.url)) }] }
    : undefined,
  build: target === 'preview' ? { outDir: 'dist-preview' } : undefined,
})
