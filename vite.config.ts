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
        rollupOptions: {
          output: {
            // 把幾乎不會變動的第三方套件切出去，讓瀏覽器可以長期快取：
            // 之後每次改 app 程式碼只會讓 index chunk 失效，react / supabase
            // 這兩包不必重新下載。手機使用者受益最大。
            //
            // 用 function 而非物件形式：app 實際 import 的是 react/jsx-runtime
            // 與 react-dom/client，物件形式只比對 'react' / 'react-dom' 這兩個
            // 確切的 module id，會比對不到而切不出 chunk。
            manualChunks(id: string) {
              const normalized = id.replace(/\\/g, '/')

              // 注意路徑尾巴的斜線：少了它 react-markdown 會被誤判成 react，
              // 導致原本 lazy 載入的 markdown 套件被拉進首屏 chunk。
              if (/\/node_modules\/(react|react-dom|scheduler)\//.test(normalized)) {
                return 'react-vendor'
              }
              if (normalized.includes('/node_modules/@supabase/')) {
                return 'supabase-vendor'
              }
              return undefined
            },
          },
        },
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
