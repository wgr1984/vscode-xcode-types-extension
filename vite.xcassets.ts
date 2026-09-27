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
    emptyOutDir: false,
    cssCodeSplit: false,
    rollupOptions: {
      input: path.resolve(__dirname, 'src/webview/xcassetsMain.tsx'),
      output: {
        entryFileNames: 'xcassets.js',
        assetFileNames: 'xcassets.[ext]',
        format: 'iife',
        name: 'xcodeTypesXcassets',
      },
    },
    sourcemap: true,
    minify: false,
    target: 'es2022',
  },
})
