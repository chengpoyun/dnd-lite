// 一次性資料更新：MH素材「名稱加怪物名前綴＋新增來源欄位」（見 scripts/lib/mhSourceMigration.mjs 的 RENAMES）
// 讓玩家已持有的素材道具（與裝備插槽鑲嵌快照）跟上 data/mh-materials.json 的新名稱與來源。
// 用法:
//   node scripts/migrate-mh-source.mjs                          # 預覽（只看貝瑞），不寫入
//   node scripts/migrate-mh-source.mjs --all-players            # 預覽（所有玩家），不寫入
//   node scripts/migrate-mh-source.mjs --all-players --apply    # 寫入；寫入前先把原值備份到 backups/（已被 .gitignore 忽略）
// 預設只動「貝瑞」的資料（其他玩家的資料不可修改）；這次更新經使用者明確授權，需加 --all-players 才會動所有玩家。
// 輸出不含 character_id / 道具 id。還原用 scripts/restore-mh-backup.mjs。
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { planMigration } from './lib/mhSourceMigration.mjs';

const apply = process.argv.includes('--apply');
const allPlayers = process.argv.includes('--all-players');
const OWNER_NAME = '貝瑞';

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

const catalog = JSON.parse(fs.readFileSync(new URL('../data/mh-materials.json', import.meta.url), 'utf8'));
const ownerScope = allPlayers ? '' : `and character_id in (select id from characters where name = ${lit(OWNER_NAME)})`;
const loadRows = () =>
  q(`select id, category_override, name_override, name_en_override, source_override, sockets from character_items
     where (category_override = 'MH素材' or jsonb_array_length(coalesce(sockets, '[]'::jsonb)) > 0) ${ownerScope}`);

const rows = await loadRows();
const plan = planMigration({ catalog, items: rows });
const byId = new Map(rows.map((r) => [r.id, r]));

const renamed = {};
let sourceFilled = 0;
for (const c of plan.itemChanges) {
  const old = byId.get(c.id);
  if (c.name !== old.name_override) {
    const key = `${old.name_override} → ${c.name}`;
    renamed[key] = (renamed[key] ?? 0) + 1;
  }
  if (c.source !== (old.source_override ?? null)) sourceFilled++;
}
console.log(`== ${apply ? '寫入前' : '預覽（不寫入）'}｜範圍：${allPlayers ? '所有玩家' : OWNER_NAME} ==`);
console.log(`檢查道具 ${rows.length} 筆（MH素材或有插槽快照）`);
console.log(`MH素材道具變更 ${plan.itemChanges.length} 筆（改名 ${Object.values(renamed).reduce((a, b) => a + b, 0)}、補來源 ${sourceFilled}）`);
console.log(`插槽快照變更 ${plan.socketChanges.length} 件裝備`);
console.log(`名稱與英文名稱衝突（不改，需人工確認）${plan.conflicts} 筆`);
console.log('改名明細:', JSON.stringify(renamed));

if (!apply) process.exit(0);

if (!allPlayers) {
  const [{ n }] = await q(`select count(*)::int as n from characters where name = ${lit(OWNER_NAME)}`);
  if (n !== 1) {
    console.error(`❌ 找到 ${n} 個名為「${OWNER_NAME}」的角色，需剛好 1 個才能寫入，已中止`);
    process.exit(1);
  }
}
if (plan.itemChanges.length === 0 && plan.socketChanges.length === 0) {
  console.log('沒有需要寫入的變更');
  process.exit(0);
}

// 先備份原值（backups/ 已被 .gitignore 忽略；內含道具 id，不可上傳）
const backup = {
  createdAt: new Date().toISOString(),
  scope: allPlayers ? 'all-players' : OWNER_NAME,
  items: plan.itemChanges.map((c) => ({
    id: c.id,
    name_override: byId.get(c.id).name_override,
    source_override: byId.get(c.id).source_override ?? null,
  })),
  sockets: plan.socketChanges.map((c) => ({ id: c.id, sockets: byId.get(c.id).sockets })),
};
const backupDir = new URL('../backups/', import.meta.url);
fs.mkdirSync(backupDir, { recursive: true });
const backupPath = fileURLToPath(new URL(`mh-source-migration-${backup.createdAt.slice(0, 10)}.json`, backupDir));
fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
const check = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
if (check.items.length !== plan.itemChanges.length || check.sockets.length !== plan.socketChanges.length) {
  console.error('❌ 備份筆數與預覽不一致，已中止（尚未寫入任何資料）');
  process.exit(1);
}
console.log(`備份完成：backups/${backupPath.split(/[\\/]/).pop()}（道具 ${check.items.length}、插槽 ${check.sockets.length}）`);

const CHUNK = 200;
for (let i = 0; i < plan.itemChanges.length; i += CHUNK) {
  await q(`update character_items c set name_override = v.name, source_override = v.source
    from jsonb_to_recordset(${jsonLit(plan.itemChanges.slice(i, i + CHUNK))}) as v(id uuid, name text, source text)
    where c.id = v.id`);
}
for (let i = 0; i < plan.socketChanges.length; i += CHUNK) {
  await q(`update character_items c set sockets = v.sockets
    from jsonb_to_recordset(${jsonLit(plan.socketChanges.slice(i, i + CHUNK))}) as v(id uuid, sockets jsonb)
    where c.id = v.id`);
}

const after = planMigration({ catalog, items: await loadRows() });
console.log(`== 寫入後 ==\n剩餘 MH素材變更 ${after.itemChanges.length}、插槽變更 ${after.socketChanges.length}（應為 0）、衝突 ${after.conflicts}`);
