// 批次修改玩家資料（character_items）中的 MH素材名稱，用於目錄改名／合併重複素材／修正錯字後，
// 讓玩家已持有的道具跟著改到新名稱（否則對不到目錄，也不會出現「可更新」提示）。
// 用法（舊名=新名，可一次給多組）:
//   node scripts/rename-mh-materials.mjs "冰人魚龍重殼=冰人魚龍的重殼" "溟淵龍的翼爪=冥淵龍的翼爪"           # 預覽，不寫入
//   node scripts/rename-mh-materials.mjs "冰人魚龍重殼=冰人魚龍的重殼" --apply                                  # 實際寫入
// 預覽與修正前後的比對會列出所有玩家的資料（僅供參考），但寫入只會動「貝瑞」這個角色（其他玩家的資料不可修改）；
// 若找不到貝瑞或有多個同名角色，寫入會直接中止。
// 只會動兩個地方，且只比對「完全等於」舊名的資料：
//   1. category_override = 'MH素材' 的道具的 name_override
//   2. 裝備 sockets 陣列內鑲嵌素材快照的 decoration_name（陣列順序與空插槽 null 都保留）
import fs from 'node:fs';

const FIXES = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((a) => !a.startsWith('--') && a.includes('='))
    .map((a) => [a.slice(0, a.indexOf('=')), a.slice(a.indexOf('=') + 1)])
);
if (Object.entries(FIXES).some(([oldName, newName]) => !oldName.trim() || !newName.trim() || oldName === newName)) {
  console.error('❌ 每組「舊名=新名」的兩邊都不可為空，且不能相同');
  process.exit(1);
}
if (Object.keys(FIXES).length === 0) {
  console.error('❌ 請以「舊名=新名」指定要改的名稱，例如：node scripts/rename-mh-materials.mjs "舊名=新名" [--apply]');
  process.exit(1);
}
const apply = process.argv.includes('--apply');

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

async function q(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

const lit = (s) => `'${s.replace(/'/g, "''")}'`;

// 查詢（預覽、修正前後的比對）一律涵蓋所有玩家，供參考；但寫入只能動貝瑞，其他玩家的資料不可修改
const OWNER_NAME = '貝瑞';
const inScope = (col) => `${col} in (select id from characters where name = ${lit(OWNER_NAME)})`;
const wrongList = Object.keys(FIXES).map(lit).join(', ');
const nameCase = (col) =>
  `case ${col} ${Object.entries(FIXES).map(([w, r]) => `when ${lit(w)} then ${lit(r)}`).join(' ')} else ${col} end`;

const countNames = (ownerOnly) => `select name_override as name, count(*)::int as n from character_items
  where category_override = 'MH素材' and name_override in (${wrongList}) ${ownerOnly ? `and ${inScope('character_id')}` : ''} group by 1 order by 1`;
const countSockets = (ownerOnly) => `select e->>'decoration_name' as name, count(*)::int as n
  from character_items c, jsonb_array_elements(case when jsonb_typeof(c.sockets::jsonb) = 'array' then c.sockets::jsonb else '[]'::jsonb end) e
  where e->>'decoration_name' in (${wrongList}) ${ownerOnly ? `and ${inScope('c.character_id')}` : ''} group by 1 order by 1`;

const report = async (title) => {
  console.log(title);
  console.log('所有玩家（僅供參考，不會被修改）— 道具名稱:', JSON.stringify(await q(countNames(false))));
  console.log('所有玩家（僅供參考，不會被修改）— 插槽快照:', JSON.stringify(await q(countSockets(false))));
  console.log(`${OWNER_NAME}（會被修改）— 道具名稱:`, JSON.stringify(await q(countNames(true))));
  console.log(`${OWNER_NAME}（會被修改）— 插槽快照:`, JSON.stringify(await q(countSockets(true))));
};

const [{ n: ownerCount }] = await q(`select count(*)::int as n from characters where name = ${lit(OWNER_NAME)}`);
await report(apply ? '== 修正前 ==' : '== 預覽（不寫入）==');

if (!apply) {
  if (ownerCount !== 1) console.log(`⚠️ 找到 ${ownerCount} 個名為「${OWNER_NAME}」的角色（需剛好 1 個才能寫入）`);
  process.exit(0);
}
if (ownerCount !== 1) {
  console.error(`❌ 找到 ${ownerCount} 個名為「${OWNER_NAME}」的角色，需剛好 1 個才能寫入，已中止`);
  process.exit(1);
}

await q(`update character_items set name_override = ${nameCase('name_override')}
  where category_override = 'MH素材' and name_override in (${wrongList}) and ${inScope('character_id')}`);

await q(`update character_items c set sockets = (
    select jsonb_agg(
      case when jsonb_typeof(t.e) = 'object' and t.e->>'decoration_name' in (${wrongList})
        then jsonb_set(t.e, '{decoration_name}', to_jsonb(${nameCase("t.e->>'decoration_name'")}))
        else t.e end
      order by t.ord)
    from jsonb_array_elements(c.sockets::jsonb) with ordinality as t(e, ord))
  where ${inScope('c.character_id')} and jsonb_typeof(c.sockets::jsonb) = 'array'
    and exists (select 1 from jsonb_array_elements(c.sockets::jsonb) x where x->>'decoration_name' in (${wrongList}))`);

await report(`== 修正後（${OWNER_NAME}的應為空；其他玩家不動）==`);
