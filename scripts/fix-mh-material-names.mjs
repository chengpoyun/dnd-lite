// 修正玩家資料（character_items）中打錯字／缺字的 MH素材名稱，對照正確名稱如下。
// 用法:
//   node scripts/fix-mh-material-names.mjs           # 預設只預覽，不寫入
//   node scripts/fix-mh-material-names.mjs --apply   # 實際寫入
// 只會動兩個地方，且只比對「完全等於」下方錯誤名稱的資料：
//   1. category_override = 'MH素材' 的道具的 name_override
//   2. 裝備 sockets 陣列內鑲嵌素材快照的 decoration_name（陣列順序與空插槽 null 都保留）
import fs from 'node:fs';

const FIXES = {
  '冰人魚龍涷鱗': '冰人魚龍的凍鱗',
  '冰人魚龍重殼': '冰人魚龍的重殼',
  '冰人魚龍特上鰭': '冰人魚龍的特上鰭',
  '冰人魚龍冰玉': '冰人魚龍的冰玉',
  '溟波龍的鋼爪': '溟波龍的剛爪',
  '溟波龍的天麟': '溟波龍的天鱗',
  '爆麟龍的翼': '爆鱗龍的翼',
  '溟淵龍的翼爪': '冥淵龍的翼爪',
  '黑狼鳥的鋼翼': '黑狼鳥的剛翼',
  '黑狼鳥復甦的喙': '復甦的喙',
  '古龍血': '古龍的血',
  '大型魔物骨': '大魔物骨',
  '野獸骨': '獸骨',
  '鳥獸骨': '鳥龍種的骨',
  '小骨堆': '小骨殼',
  '尖鎧玉': '重鎧玉',
  '真鎧玉': '皇家鎧玉',
};
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
const wrongList = Object.keys(FIXES).map(lit).join(', ');
const nameCase = (col) =>
  `case ${col} ${Object.entries(FIXES).map(([w, r]) => `when ${lit(w)} then ${lit(r)}`).join(' ')} else ${col} end`;

const countNames = `select name_override as name, count(*)::int as n from character_items
  where category_override = 'MH素材' and name_override in (${wrongList}) group by 1 order by 1`;
const countSockets = `select e->>'decoration_name' as name, count(*)::int as n
  from character_items c, jsonb_array_elements(case when jsonb_typeof(c.sockets::jsonb) = 'array' then c.sockets::jsonb else '[]'::jsonb end) e
  where e->>'decoration_name' in (${wrongList}) group by 1 order by 1`;

const before = { names: await q(countNames), sockets: await q(countSockets) };
console.log(apply ? '== 修正前 ==' : '== 預覽（不寫入）==');
console.log('道具名稱:', JSON.stringify(before.names));
console.log('插槽快照:', JSON.stringify(before.sockets));

if (!apply) process.exit(0);

await q(`update character_items set name_override = ${nameCase('name_override')}
  where category_override = 'MH素材' and name_override in (${wrongList})`);

await q(`update character_items c set sockets = (
    select jsonb_agg(
      case when jsonb_typeof(t.e) = 'object' and t.e->>'decoration_name' in (${wrongList})
        then jsonb_set(t.e, '{decoration_name}', to_jsonb(${nameCase("t.e->>'decoration_name'")}))
        else t.e end
      order by t.ord)
    from jsonb_array_elements(c.sockets::jsonb) with ordinality as t(e, ord))
  where jsonb_typeof(c.sockets::jsonb) = 'array'
    and exists (select 1 from jsonb_array_elements(c.sockets::jsonb) x where x->>'decoration_name' in (${wrongList}))`);

const after = { names: await q(countNames), sockets: await q(countSockets) };
console.log('== 修正後（應為空）==');
console.log('道具名稱:', JSON.stringify(after.names));
console.log('插槽快照:', JSON.stringify(after.sockets));
