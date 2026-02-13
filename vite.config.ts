import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: '/dnd-lite/',
      build: {
        // 明確支援 Safari 14+，避免產出過新語法導致 Safari 無法開啟
        target: ['es2020', 'safari14'],
      },
      server: {
        port: 3000,
        host: '0.0.0.0',
        strictPort: true, // 如果端口被佔用則失敗而不是嘗試其他端口
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
