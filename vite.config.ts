import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode, command }) => {
    const env = loadEnv(mode, '.', '');
    const isBuild = command === 'build';
    return {
      base: '/dnd-lite/',
      build: {
        // 明確支援 Safari 14+，避免產出過新語法導致 Safari 無法開啟
        target: ['es2020', 'safari14'],
      },
      // 正式建置時把開發用日誌標記成無副作用，讓 minifier 直接移除。
      // 這些 console.log 會把角色 ID、使用者 ID、DB 查詢耗時印在使用者的 console。
      // console.warn / console.error 刻意保留：線上出問題時需要它們才能診斷，
      // 所以不能用 drop: ['console']（那會把所有 console 一起拿掉）。
      esbuild: isBuild
        ? { pure: ['console.log', 'console.debug', 'console.info'], drop: ['debugger' as const] }
        : {},
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
