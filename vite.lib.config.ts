import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    outDir: 'dist-library',
    copyPublicDir: false,
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: 'index',
      cssFileName: 'style',
    },
    rolldownOptions: {
      external: ['vue', '@vue-flow/core', '@dagrejs/dagre'],
    },
  },
})
