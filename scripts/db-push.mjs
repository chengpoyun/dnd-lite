// 跨平台資料庫遷移推送腳本（Windows / macOS / Linux 皆可）
// 用法: npm run db:push
// 讀取 .env 的 SUPABASE_ACCESS_TOKEN 與 SUPABASE_DB_PASSWORD，
// 透過 `npx supabase` 進行 link 並 push 未套用的 migration。
import 'dotenv/config';
import { spawn } from 'node:child_process';

const url = process.env.VITE_SUPABASE_URL || '';
const ref =
  process.env.SUPABASE_PROJECT_REF ||
  (url.match(/https?:\/\/([a-z0-9]+)\.supabase\.co/i)?.[1] ?? '');

const missing = [];
if (!ref) missing.push('project ref（.env 的 VITE_SUPABASE_URL 或 SUPABASE_PROJECT_REF）');
if (!process.env.SUPABASE_ACCESS_TOKEN) missing.push('SUPABASE_ACCESS_TOKEN');
if (!process.env.SUPABASE_DB_PASSWORD) missing.push('SUPABASE_DB_PASSWORD');
if (missing.length) {
  console.error('❌ .env 缺少必要設定：\n  - ' + missing.join('\n  - '));
  process.exit(1);
}

/** 執行 `npx supabase <args>`，可選擇對互動提示送入 input */
const run = (args, input) =>
  new Promise((resolve, reject) => {
    const child = spawn('npx', ['--yes', 'supabase', ...args], {
      stdio: [input ? 'pipe' : 'inherit', 'inherit', 'inherit'],
      shell: true, // 讓 Windows 也能解析 npx
      env: process.env,
    });
    if (input) {
      child.stdin.write(input);
      child.stdin.end();
    }
    child.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`supabase ${args.join(' ')} 退出碼 ${code}`))
    );
    child.on('error', reject);
  });

try {
  console.log(`🔗 連結專案 ${ref} ...`);
  await run(['link', '--project-ref', ref]);
  console.log('⬆️  推送遷移到遠端資料庫 ...');
  await run(['db', 'push', '--linked'], 'Y\n');
  console.log('✅ db push 完成');
} catch (e) {
  console.error('❌', e.message);
  process.exit(1);
}
