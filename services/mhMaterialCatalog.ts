/**
 * MH素材目錄（讀取 data/mh-materials.json，本地維護，不進 DB）
 * 「獲得物品」搜尋、地形採集自動帶入效果，皆從這裡取資料。
 */
import type { MHMaterialDef } from '../types/mhMaterial';
import type { CreateCharacterItemData, DecorationEffects } from './itemService';
import { matchesSearch } from '../utils/common';

let cached: MHMaterialDef[] | null = null;

export async function getMHMaterials(): Promise<MHMaterialDef[]> {
  if (cached) return cached;
  const data = await import('../data/mh-materials.json');
  cached = (data.default ?? data) as unknown as MHMaterialDef[];
  return cached;
}

/** 依名稱精準比對（目錄內名稱唯一） */
export async function findMHMaterialByName(name: string): Promise<MHMaterialDef | undefined> {
  const list = await getMHMaterials();
  return list.find((m) => m.name === name);
}

/** 依名稱／英文名／描述關鍵字篩選；查詢字串為空時回傳全部 */
export async function searchMHMaterials(query: string): Promise<MHMaterialDef[]> {
  const list = await getMHMaterials();
  return list.filter((m) => matchesSearch(query, m.name, m.nameEn, m.description));
}

/** 將目錄條目轉成「新增個人物品」的 payload，供獲得物品／地形採集帶入描述與插槽效果 */
export function mhMaterialToCreateData(entry: MHMaterialDef, quantity = 1): CreateCharacterItemData {
  let decorationEffects: DecorationEffects | undefined;
  if (entry.decorationEffects) {
    decorationEffects = {};
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
  }

  return {
    name: entry.name,
    category: 'MH素材',
    description: entry.description,
    quantity,
    is_magic: false,
    weapon_decoration: entry.weaponDecoration,
    armor_decoration: entry.armorDecoration,
    decoration_effects: decorationEffects,
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
