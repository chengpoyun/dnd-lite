// 還原 scripts/migrate-mh-source.mjs 寫入前存下的備份（道具名稱、來源、插槽快照改回原值）。
// 用法:
//   node scripts/restore-mh-backup.mjs backups/mh-source-migration-2026-11-11.json                         # 預覽（只看貝瑞）
//   node scripts/restore-mh-backup.mjs <備份檔> --all-players --apply                                      # 還原所有玩家
// 預設只還原「貝瑞」的資料；要還原所有玩家（備份範圍是所有玩家時）必須加 --all-players。輸出不含任何 id。
import fs from 'node:fs';

const file = process.argv.slice(2).find((a) => !a.startsWith('--'));
const apply = process.argv.includes('--apply');
const allPlayers = process.argv.includes('--all-players');
const OWNER_NAME = '貝瑞';
if (!file) {
  console.error('❌ 請指定備份檔，例如：node scripts/restore-mh-backup.mjs backups/mh-source-migration-2026-11-11.json');
  process.exit(1);
}
const backup = JSON.parse(fs.readFileSync(file, 'utf8'));

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
const lit = (s) => `'${String(s).replace(/'/g, "''")}'`;
const jsonLit = (v) => `${lit(JSON.stringify(v))}::jsonb`;

let items = backup.items;
let sockets = backup.sockets;
if (!allPlayers) {
  const owned = new Set(
    (await q(`select id from character_items where character_id in (select id from characters where name = ${lit(OWNER_NAME)})`)).map((r) => r.id)
  );
  items = items.filter((r) => owned.has(r.id));
  sockets = sockets.filter((r) => owned.has(r.id));
}
console.log(`== ${apply ? '還原' : '預覽（不寫入）'}｜範圍：${allPlayers ? '所有玩家' : OWNER_NAME}｜備份範圍：${backup.scope} ==`);
console.log(`將還原道具 ${items.length}/${backup.items.length}、插槽 ${sockets.length}/${backup.sockets.length}`);
if (!apply) process.exit(0);

const CHUNK = 200;
for (let i = 0; i < items.length; i += CHUNK) {
  await q(`update character_items c set name_override = v.name_override, source_override = v.source_override
    from jsonb_to_recordset(${jsonLit(items.slice(i, i + CHUNK))}) as v(id uuid, name_override text, source_override text)
    where c.id = v.id`);
}
for (let i = 0; i < sockets.length; i += CHUNK) {
  await q(`update character_items c set sockets = v.sockets
    from jsonb_to_recordset(${jsonLit(sockets.slice(i, i + CHUNK))}) as v(id uuid, sockets jsonb)
    where c.id = v.id`);
}
console.log('還原完成');
