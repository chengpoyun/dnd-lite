/**
 * MH素材目錄（讀取 data/mh-materials.json，本地維護，不進 DB）
 * 「獲得物品」搜尋、地形採集自動帶入效果，皆從這裡取資料。
 */
import type { MHMaterialDef } from '../types/mhMaterial';
import type { CharacterItem, CreateCharacterItemData, DecorationEffect, DecorationEffects, UpdateCharacterItemData } from './itemService';
import { createLocalCatalog } from '../utils/localCatalog';

const catalog = createLocalCatalog<MHMaterialDef>(() => import('../data/mh-materials.json'));

export const getMHMaterials = catalog.getAll;

/** 依名稱精準比對（目錄內名稱唯一） */
export async function findMHMaterialByName(name: string): Promise<MHMaterialDef | undefined> {
  const list = await getMHMaterials();
  return list.find((m) => m.name === name);
}

/** 英文名稱正規化：只留小寫英數，讓大小寫、空白、符號不同的寫法視為同一個 */
const normalizeEnName = (s: string | null | undefined) => (s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * 建立「角色持有素材 → 目錄條目」的查找函式：先依名稱，對不上再依英文名稱（正規化）比對。
 * 目錄改名（如加上怪物名前綴）後，仍用舊名稱的道具靠英文名稱還是能對到目錄、顯示「可更新」。
 */
export function createCatalogLookup(entries: MHMaterialDef[]) {
  const byName = new Map(entries.map((e) => [e.name, e]));
  const byEn = new Map(entries.filter((e) => e.nameEn).map((e) => [normalizeEnName(e.nameEn), e]));
  return (item: Pick<CharacterItem, 'name_override' | 'name_en_override'>): MHMaterialDef | undefined => {
    const byNameHit = item.name_override ? byName.get(item.name_override) : undefined;
    if (byNameHit) return byNameHit;
    const en = normalizeEnName(item.name_en_override);
    return en ? byEn.get(en) : undefined;
  };
}

/** 依名稱／英文名／描述關鍵字篩選；查詢字串為空時回傳全部 */
export async function searchMHMaterials(query: string): Promise<MHMaterialDef[]> {
  return catalog.search(query, (m) => [m.name, m.nameEn, m.source, m.description]);
}

/** 依目錄條目組出 decoration_effects（武器／護甲各自的 note + stat_bonuses）；目錄完全沒設定時回傳 undefined */
function buildDecorationEffectsFromEntry(entry: MHMaterialDef): DecorationEffects | undefined {
  if (!entry.decorationEffects) return undefined;
  const decorationEffects: DecorationEffects = {};
  if (entry.decorationEffects.weapon) {
    decorationEffects.weapon = {
      note: entry.decorationEffects.weapon.note ?? '',
      stat_bonuses: entry.decorationEffects.weapon.statBonuses,
    };
  }
  if (entry.decorationEffects.armor) {
    decorationEffects.armor = {
      note: entry.decorationEffects.armor.note ?? '',
      stat_bonuses: entry.decorationEffects.armor.statBonuses,
    };
  }
  return decorationEffects;
}

/** 將目錄條目轉成「新增個人物品」的 payload，供獲得物品／地形採集帶入描述與插槽效果 */
export function mhMaterialToCreateData(entry: MHMaterialDef, quantity = 1): CreateCharacterItemData {
  return {
    name: entry.name,
    category: 'MH素材',
    description: entry.description,
    quantity,
    is_magic: false,
    name_en: entry.nameEn,
    source: entry.source,
    rarity: entry.rarity != null ? String(entry.rarity) : null,
    weapon_decoration: entry.weaponDecoration,
    armor_decoration: entry.armorDecoration,
    decoration_effects: buildDecorationEffectsFromEntry(entry),
  };
}

/** 角色持有素材與目錄資料的差異：僅列出「有差異」的欄位，完全一致時為 null */
export interface MHMaterialUpdatePreview {
  /** 目錄名稱與角色持有的不同（如目錄加上怪物名前綴）；只在角色已有名稱時才比對 */
  name?: { old: string; new: string };
  source?: { old: string | null; new: string };
  nameEn?: { old: string | null; new: string | null };
  rarity?: { old: string | null; new: string | null };
  weapon?: { old?: DecorationEffect; new?: DecorationEffect };
  armor?: { old?: DecorationEffect; new?: DecorationEffect };
  /** 素材本身自帶的效果說明（非鑲嵌效果）；只在角色原本完全沒填時才算差異，避免蓋掉玩家自訂內容 */
  description?: { old: null; new: string };
}

function decorationEffectEquals(a: DecorationEffect | undefined, b: DecorationEffect | undefined): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

/**
 * 比對角色持有的這筆 MH素材與目錄（catalogEntry）是否有「目錄新增／修正」的資料可套用，
 * 供道具頁判斷是否顯示「可更新」提示。
 * 只在目錄那一側「有實際內容」且與角色現有資料不同時才算數——目錄沒填的欄位一律不算差異，
 * 避免把角色自己填寫過的資料（目錄還沒收錄）誤判成「可更新」而顯示提示、甚至被覆蓋掉。
 * 完全一致（或目錄沒有更多資訊）時回傳 null。
 */
export function getMHMaterialUpdatePreview(
  item: Pick<
    CharacterItem,
    'rarity_override' | 'decoration_effects' | 'name_en_override' | 'description_override'
  > &
    Partial<Pick<CharacterItem, 'name_override' | 'source_override'>>,
  catalogEntry: MHMaterialDef
): MHMaterialUpdatePreview | null {
  const preview: MHMaterialUpdatePreview = {};

  if (item.name_override && item.name_override !== catalogEntry.name) {
    preview.name = { old: item.name_override, new: catalogEntry.name };
  }
  const oldSource = item.source_override ?? null;
  if (catalogEntry.source && catalogEntry.source !== oldSource) {
    preview.source = { old: oldSource, new: catalogEntry.source };
  }

  const oldNameEn = item.name_en_override ?? null;
  const newNameEn = catalogEntry.nameEn || null;
  if (newNameEn !== null && newNameEn !== oldNameEn) {
    preview.nameEn = { old: oldNameEn, new: newNameEn };
  }

  const oldRarity = item.rarity_override ?? null;
  const newRarity = catalogEntry.rarity != null ? String(catalogEntry.rarity) : null;
  if (newRarity !== null && newRarity !== oldRarity) {
    preview.rarity = { old: oldRarity, new: newRarity };
  }

  const oldEffects = item.decoration_effects ?? {};
  const newEffects = buildDecorationEffectsFromEntry(catalogEntry) ?? {};
  if (newEffects.weapon && !decorationEffectEquals(oldEffects.weapon, newEffects.weapon)) {
    preview.weapon = { old: oldEffects.weapon, new: newEffects.weapon };
  }
  if (newEffects.armor && !decorationEffectEquals(oldEffects.armor, newEffects.armor)) {
    preview.armor = { old: oldEffects.armor, new: newEffects.armor };
  }

  const oldDescription = item.description_override?.trim() || '';
  const newDescription = catalogEntry.description?.trim() || '';
  if (!oldDescription && newDescription) {
    preview.description = { old: null, new: newDescription };
  }

  return Object.keys(preview).length > 0 ? preview : null;
}

/**
 * 依目錄條目組出「套用更新」要寫回 character_items 的欄位。
 * 只疊加目錄「有資料」的部分（稀有度、武器/護甲鑲嵌效果各自判斷），角色原本就有、
 * 但目錄還沒收錄的資料維持原樣（不會被 null 蓋掉）；鑲嵌旗標同理，只會加開、不會關閉。
 */
export function buildMHMaterialUpdatePayload(
  item: Pick<
    CharacterItem,
    | 'rarity_override'
    | 'decoration_effects'
    | 'weapon_decoration'
    | 'armor_decoration'
    | 'name_en_override'
    | 'description_override'
  > &
    Partial<Pick<CharacterItem, 'name_override' | 'source_override'>>,
  catalogEntry: MHMaterialDef
): UpdateCharacterItemData {
  const catalogEffects = buildDecorationEffectsFromEntry(catalogEntry);
  const mergedEffects: DecorationEffects = { ...(item.decoration_effects ?? {}) };
  if (catalogEffects?.weapon) mergedEffects.weapon = catalogEffects.weapon;
  if (catalogEffects?.armor) mergedEffects.armor = catalogEffects.armor;

  const newRarity = catalogEntry.rarity != null ? String(catalogEntry.rarity) : null;
  const newNameEn = catalogEntry.nameEn || null;

  const oldDescription = item.description_override?.trim() || '';
  const newDescription = catalogEntry.description?.trim() || '';

  return {
    name_override: catalogEntry.name,
    source_override: catalogEntry.source || item.source_override || null,
    name_en_override: newNameEn ?? item.name_en_override ?? null,
    rarity_override: newRarity ?? item.rarity_override ?? null,
    weapon_decoration: !!catalogEntry.weaponDecoration || !!item.weapon_decoration,
    armor_decoration: !!catalogEntry.armorDecoration || !!item.armor_decoration,
    decoration_effects: Object.keys(mergedEffects).length > 0 ? mergedEffects : null,
    description_override: oldDescription || newDescription || item.description_override || null,
  };
}

/**
 * 地形採集自動加入物品時用：依採集到的名稱查目錄，找得到就把描述／插槽效果一起帶入，
 * 找不到（還沒收錄的素材）就退回只有名稱的基本欄位，不報錯。
 */
export async function resolveGatheredMaterialCreateData(
  name: string,
  quantity: number
): Promise<CreateCharacterItemData> {
  const found = await findMHMaterialByName(name);
  if (found) return mhMaterialToCreateData(found, quantity);
  return { name, category: 'MH素材', quantity, is_magic: false };
}
