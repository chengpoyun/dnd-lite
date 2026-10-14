// 唯讀掃描：比對所有角色持有的 MH素材（含裝備插槽內的素材快照）與 data/mh-materials.json，
// 列出「目錄還沒收錄」或「玩家補了目錄缺的欄位」的資料，供人工確認後更新目錄（可重複執行）。
// 用法: node scripts/scan-mh-materials.mjs [--include-fixture] [--json]
// - 只執行下方固定的 SELECT，不寫入任何資料；輸出不含 character_id / 使用者身分
// - 預設排除「開發固定測試角色」（測試資料）；--include-fixture 才納入
// - --json 輸出完整結構化結果，預設輸出摘要
// 比對邏輯在 scripts/lib/mhCatalogScan.mjs（有單元測試）
import fs from 'node:fs';
import { scanMHMaterials } from './lib/mhCatalogScan.mjs';

const args = new Set(process.argv.slice(2));
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
  select name_override, name_en_override, rarity_override, description_override,
         weapon_decoration, armor_decoration, decoration_effects, sockets, category_override, equipment_kind_override,
         (character_id = '61669877-fe13-4b33-ba8a-9bce40c881a2') as is_fixture
  from character_items
  where category_override = 'MH素材' or sockets is not null
`;

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: SQL }),
});
if (!res.ok) {
  console.error('❌ 查詢失敗：', res.status, (await res.text()).slice(0, 200));
  process.exit(1);
}
const rows = await res.json();
const catalog = JSON.parse(fs.readFileSync(new URL('../data/mh-materials.json', import.meta.url), 'utf8'));
const result = scanMHMaterials(catalog, rows, { includeFixture: args.has('--include-fixture') });

if (args.has('--json')) {
  console.log(JSON.stringify(result, null, 2));
} else {
  const section = (title, list, fmt) => {
    console.log(`\n## ${title}（${list.length}）`);
    for (const e of list) console.log(`- ×${e.count} ${fmt(e)}`);
  };
  console.log(`掃描 ${rows.length} 筆道具，目錄共 ${catalog.length} 筆`);
  section('目錄沒有的素材', result.newMaterials, (e) => JSON.stringify(e.item));
  section('可補進目錄的欄位', result.fillable, (e) => `${e.catalogName} ← ${JSON.stringify(e.fields)}`);
  section('中文名與目錄不同（英文名相同）', result.aliases, (e) => `目錄「${e.catalogName}」/ 玩家「${e.playerName}」`);
  section('目錄沒有的插槽鑲嵌素材', result.newSockets, (e) => `[${e.kind}] ${JSON.stringify(e.socket)}`);
}
