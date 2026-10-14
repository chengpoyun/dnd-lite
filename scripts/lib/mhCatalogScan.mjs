// 玩家資料 → data/mh-materials.json 的比對邏輯（純函式，不連線；由 scripts/scan-mh-materials.mjs 呼叫）。
// rows 是 character_items 的欄位（snake_case），catalog 是 data/mh-materials.json 的條目。

/** 英文名正規化：只留小寫英數，讓「Carver+」「carver」視為同一個素材 */
export function normalizeEnName(s) {
  return (s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

const isBlank = (v) => v === null || v === undefined || v === '';
const isEmptyObj = (v) => !v || Object.keys(v).length === 0;

/** DB 的 decoration_effects（snake_case）轉成目錄格式（camelCase）；沒有內容回傳 undefined */
function toCatalogEffects(db) {
  if (!db) return undefined;
  const out = {};
  for (const kind of ['weapon', 'armor']) {
    const e = db[kind];
    if (!e) continue;
    const entry = {};
    if (e.note) entry.note = e.note;
    if (!isEmptyObj(e.stat_bonuses)) entry.statBonuses = e.stat_bonuses;
    if (Object.keys(entry).length) out[kind] = entry;
  }
  return isEmptyObj(out) ? undefined : out;
}

function playerItem(r) {
  const rarity = Number(r.rarity_override);
  const item = {
    name: r.name_override,
    nameEn: r.name_en_override || '',
    rarity: isBlank(r.rarity_override) || Number.isNaN(rarity) ? null : rarity,
  };
  if (r.description_override) item.description = r.description_override;
  if (r.weapon_decoration) item.weaponDecoration = true;
  if (r.armor_decoration) item.armorDecoration = true;
  const effects = toCatalogEffects(r.decoration_effects);
  if (effects) item.decorationEffects = effects;
  return item;
}

/** 玩家填了、而目錄該欄位是空的 → 回傳可補進目錄的欄位 */
function fillableFields(entry, item) {
  const f = {};
  if (isBlank(entry.nameEn) && item.nameEn) f.nameEn = item.nameEn;
  if (isBlank(entry.rarity) && item.rarity !== null) f.rarity = item.rarity;
  if (isBlank(entry.description) && item.description) f.description = item.description;
  if (!entry.weaponDecoration && item.weaponDecoration) f.weaponDecoration = true;
  if (!entry.armorDecoration && item.armorDecoration) f.armorDecoration = true;
  if (isEmptyObj(entry.decorationEffects) && item.decorationEffects) f.decorationEffects = item.decorationEffects;
  return f;
}

function bump(map, key, make) {
  const e = map.get(key) ?? make();
  e.count++;
  map.set(key, e);
}

/**
 * 比對玩家的 MH素材（與裝備插槽內的素材快照）與目錄。
 * @returns {{ newMaterials, aliases, fillable, newSockets }}
 *   newMaterials: 目錄沒有的素材（同名不同內容各算一筆）
 *   aliases: 英文名對得上、但玩家用了不同中文名
 *   fillable: 目錄已有、玩家補了目錄缺的欄位
 *   newSockets: 目錄沒有的插槽鑲嵌素材
 */
export function scanMHMaterials(catalog, rows, { includeFixture = false } = {}) {
  const byName = new Map(catalog.map((c) => [c.name, c]));
  const byEn = new Map(catalog.filter((c) => c.nameEn).map((c) => [normalizeEnName(c.nameEn), c]));
  const findEntry = (name, nameEn) => byName.get(name) ?? (nameEn ? byEn.get(normalizeEnName(nameEn)) : undefined);

  const newMaterials = new Map();
  const aliases = new Map();
  const fillable = new Map();
  const newSockets = new Map();

  for (const r of rows) {
    if (r.is_fixture && !includeFixture) continue;

    if (r.category_override === 'MH素材' && r.name_override) {
      const item = playerItem(r);
      const entry = findEntry(item.name, item.nameEn);
      if (!entry) {
        bump(newMaterials, JSON.stringify(item), () => ({ count: 0, item }));
        continue;
      }
      if (entry.name !== item.name) {
        bump(aliases, `${entry.name}|${item.name}`, () => ({ count: 0, catalogName: entry.name, playerName: item.name }));
      }
      const fields = fillableFields(entry, item);
      if (Object.keys(fields).length) {
        bump(fillable, JSON.stringify([entry.name, fields]), () => ({ count: 0, catalogName: entry.name, fields }));
      }
    }

    const kind = r.equipment_kind_override === 'melee_weapon' || r.equipment_kind_override === 'ranged_weapon' ? 'weapon' : 'armor';
    for (const s of Array.isArray(r.sockets) ? r.sockets : []) {
      if (!s?.decoration_name || byName.has(s.decoration_name)) continue;
      const socket = { name: s.decoration_name, note: s.note ?? '', statBonuses: s.stat_bonuses ?? null };
      bump(newSockets, JSON.stringify([kind, socket]), () => ({ count: 0, kind, socket }));
    }
  }

  const list = (m) => [...m.values()];
  return { newMaterials: list(newMaterials), aliases: list(aliases), fillable: list(fillable), newSockets: list(newSockets) };
}
