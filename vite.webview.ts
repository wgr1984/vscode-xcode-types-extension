import { defineConfig } from 'vite'
import path from 'node:path'

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  css: {
    postcss: './postcss.config.js',
  },
  build: {
    outDir: 'dist/webview',
    emptyOutDir: true,
    cssCodeSplit: false,
    rollupOptions: {
      input: path.resolve(__dirname, 'src/webview/main.tsx'),
      output: {
        entryFileNames: 'webview.js',
        assetFileNames: 'webview.[ext]',
        format: 'iife',
        name: 'xcodeTypesWebview',
      },
    },
    sourcemap: true,
    minify: false,
    target: 'es2022',
  },
})
