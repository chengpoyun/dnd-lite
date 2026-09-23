// 唯讀查詢：列出 public schema 所有資料表，以及 anon / authenticated / service_role
// 這三個角色目前實際擁有的權限（information_schema.role_table_grants）。
// 用途：確認 Supabase 10/30 起停止自動授權新表前，既有表格「目前實際」的權限範圍，
// 以便寫一支補齊 GRANT 的 migration 時完全比照現況，不會不小心縮小或放寬權限。
// 用法: node scripts/dump-table-grants.mjs
import fs from 'node:fs';

const env = {};
for (const line of fs.readFileSync(new URL('../.env', import.meta.url), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const ref = env.VITE_SUPABASE_URL?.match(/https?:\/\/([a-z0-9]+)\.supabase\.co/i)?.[1];
if (!ref || !env.SUPABASE_ACCESS_TOKEN) {
  console.error('❌ .env 缺少 VITE_SUPABASE_URL 或 SUPABASE_ACCESS_TOKEN');
  process.exit(1);
}

const SQL = `
  select table_name, grantee, string_agg(privilege_type, ', ' order by privilege_type) as privileges
  from information_schema.role_table_grants
  where table_schema = 'public'
    and grantee in ('anon', 'authenticated', 'service_role')
  group by table_name, grantee
  order by table_name, grantee
`;

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: SQL }),
});
if (!res.ok) {
  console.error('❌ 查詢失敗：', res.status, (await res.text()).slice(0, 300));
  process.exit(1);
}
const rows = await res.json();

const byTable = new Map();
for (const r of rows) {
  if (!byTable.has(r.table_name)) byTable.set(r.table_name, {});
  byTable.get(r.table_name)[r.grantee] = r.privileges;
}
const tablesRes = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: `select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by table_name`,
  }),
});
const allTables = (await tablesRes.json()).map((r) => r.table_name);

console.log(`public schema 共 ${allTables.length} 張表\n`);
for (const t of allTables) {
  const g = byTable.get(t) ?? {};
  console.log(`${t}`);
  console.log(`  anon:          ${g.anon ?? '(無)'}`);
  console.log(`  authenticated: ${g.authenticated ?? '(無)'}`);
  console.log(`  service_role:  ${g.service_role ?? '(無)'}`);
}

const missing = allTables.filter((t) => !byTable.has(t));
if (missing.length) {
  console.log(`\n⚠️ 完全沒有任何 grant 的表（${missing.length} 張）：`, missing.join('、'));
}
