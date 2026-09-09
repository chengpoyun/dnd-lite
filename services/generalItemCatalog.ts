/**
 * 通用道具目錄（讀取 data/general-items.json，本地維護，不進 DB）
 * 「獲得物品」搜尋非 MH素材類別（裝備/藥水/雜項）時從這裡取資料。
 */
import type { GeneralItemDef } from '../types/generalItem';
import type { CreateCharacterItemData } from './itemService';
import { createLocalCatalog } from '../utils/localCatalog';

const catalog = createLocalCatalog<GeneralItemDef>(() => import('../data/general-items.json'));

export const getGeneralItems = catalog.getAll;

/** 依名稱／英文名／描述關鍵字篩選；查詢字串為空時回傳全部 */
export async function searchGeneralItems(query: string): Promise<GeneralItemDef[]> {
  return catalog.search(query, (i) => [i.name, i.nameEn, i.description]);
}

/** 將目錄條目轉成「新增個人物品」的 payload */
export function generalItemToCreateData(entry: GeneralItemDef, quantity = 1): CreateCharacterItemData {
  return {
    name: entry.name,
    category: entry.category,
    description: entry.description,
    quantity,
    is_magic: entry.isMagic ?? false,
    name_en: entry.nameEn ?? null,
    rarity: entry.rarity ?? null,
    affects_stats: entry.affectsStats,
    applies_unequipped: entry.appliesUnequipped,
    stat_bonuses: entry.statBonuses,
    equipment_kind_override: entry.equipmentKind ?? null,
  };
}
