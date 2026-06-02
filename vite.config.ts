import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// T8-penguin-canvas Vite 配置
// 端口策略：前端 11422 / 后端 18766（避开主项目 5176/18765 与常见 51xx 占用）
export default defineConfig({
  plugins: [react()],  // 使用 React 插件支持 JSX/TSX
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),  // 配置 @ 别名指向 src 目录
    },
  },
  server: {
    port: 11422,         // 开发服务器端口
    strictPort: true,    // 端口被占用时直接报错，不自动切换
    host: '127.0.0.1',   // 仅允许本地访问
    proxy: {
      // 后端 API 代理 - 将 /api 请求转发到后端服务
      '/api': {
        target: 'http://127.0.0.1:18766',
        changeOrigin: true,
      },
      // 静态文件服务代理 - 将 /files 请求转发到后端
      '/files': {
        target: 'http://127.0.0.1:18766',
        changeOrigin: true,
      },
      // 输出目录代理
      '/output': {
        target: 'http://127.0.0.1:18766',
        changeOrigin: true,
      },
      // 输入目录代理
      '/input': {
        target: 'http://127.0.0.1:18766',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',              // 构建输出目录
    assetsDir: 'assets',         // 静态资源目录
    sourcemap: false,            // 不生成 source map（生产环境）
    rollupOptions: {
      output: {
        manualChunks: {
          // 代码分割配置，将依赖拆分到独立 chunk
          'react-vendor': ['react', 'react-dom'],  // React 核心库
          'xyflow': ['@xyflow/react'],             // xyflow 画布库
        },
      },
    },
  },
  define: {
    // 定义全局常量，可在代码中通过 __APP_VERSION__ 和 __APP_NAME__ 访问
    __APP_VERSION__: JSON.stringify('1.2.9.16'),
    __APP_NAME__: JSON.stringify('T8-penguin-canvas'),
  },
});
