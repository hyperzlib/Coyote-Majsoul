import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import WindiCSS from 'vite-plugin-windicss'
import { resolve } from 'path'
import { PrimeVueResolver } from 'unplugin-vue-components/resolvers'

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: resolve('./index.html'),
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:56556',
        changeOrigin: true,
      }
    }
  },
  plugins: [
    vue(),
    AutoImport({
      imports: [
        'vue',
        'vue-router',
      ],
      dts: 'src/auto-imports.d.ts',
    }),
    WindiCSS(),
  ],
})
