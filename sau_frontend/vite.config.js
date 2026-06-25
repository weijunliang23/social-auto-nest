import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import vitePluginMcpBridge from './vite-plugin-mcp-bridge.mjs'

// https://vite.dev/config/
// mcp-bridge 必须排在前面：在 dev 中先于 /api → Flask 的代理处理 /api/mcp/call
export default defineConfig({
  plugins: [vitePluginMcpBridge(), vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        // 移除自动导入，改用@use语法
      }
    }
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    open: true,
    proxy: {
      // 不把 /api/mcp/call 交给后端；其余 /api 代理到 sau_backend_nest（默认 5409）
      '^/api/(?!mcp/call)': {
        target: 'http://localhost:5409',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          vue: ['vue', 'vue-router', 'pinia'],
          elementPlus: ['element-plus'],
          utils: ['axios']
        }
      }
    }
  }
})
