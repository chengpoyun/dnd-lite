import path from 'path'
import { defineConfig, configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // 排除 Claude Code 背景任務用的 git worktree（.claude/worktrees/**），
    // 避免其他平行 session 的進行中程式碼被誤跑進本次測試結果
    exclude: [...configDefaults.exclude, '**/.claude/**'],
  },
})