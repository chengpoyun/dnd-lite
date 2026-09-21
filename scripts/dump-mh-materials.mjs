// 唯讀查詢：列出所有角色持有的 MH素材（含裝備插槽內鑲嵌的素材快照），
// 用來比對 data/mh-materials.json 是否有玩家已填寫、但目錄還沒收錄的資料。
// 用法: node scripts/dump-mh-materials.mjs
// - 只執行下方固定的 SELECT，不接受任何參數，不寫入任何資料
// - 輸出不含 character_id / 使用者身分，只有素材名稱、效果、稀有度等欄位與持有筆數
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
  select name_override, name_en_override, rarity_override, description_override,
         weapon_decoration, armor_decoration, decoration_effects, sockets, category_override, equipment_kind_override, (character_id = '61669877-fe13-4b33-ba8a-9bce40c881a2') as is_fixture
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

const materials = new Map();
const sockets = new Map();
for (const r of rows) {
  if (r.category_override === 'MH素材' && r.name_override) {
    const key = JSON.stringify([r.is_fixture, r.name_override, r.name_en_override, r.rarity_override, r.description_override,
      r.weapon_decoration, r.armor_decoration, r.decoration_effects]);
    const e = materials.get(key) ?? { count: 0, fixture: r.is_fixture, item: {
      name: r.name_override, nameEn: r.name_en_override, rarity: r.rarity_override,
      description: r.description_override, weaponDecoration: r.weapon_decoration,
      armorDecoration: r.armor_decoration, decorationEffects: r.decoration_effects } };
    e.count++;
    materials.set(key, e);
  }
  for (const s of Array.isArray(r.sockets) ? r.sockets : []) {
    if (!s?.decoration_name) continue;
    const kind = r.equipment_kind_override === 'melee_weapon' || r.equipment_kind_override === 'ranged_weapon' ? 'weapon' : 'armor';
    const key = JSON.stringify([r.is_fixture, s.decoration_name, s.note, s.stat_bonuses, kind]);
    const e = sockets.get(key) ?? { count: 0, kind, fixture: r.is_fixture, socket: s };
    e.count++;
    sockets.set(key, e);
  }
}

console.log(JSON.stringify({
  materials: [...materials.values()],
  sockets: [...sockets.values()],
}, null, 2));
