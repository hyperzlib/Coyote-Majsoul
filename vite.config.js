import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    minify: false,
    lib: {
      entry: 'user/index.ts',
      name: 'majsoul-analyser',
      formats: ['umd'],
      fileName: () => 'majsoul-analyser.user.js'
    },
    target: 'modules',
    outDir: 'dist'
  }
})
