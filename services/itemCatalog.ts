/**
 * 合併本地兩份目錄（MH素材 + 通用道具）的搜尋，供 LearnItemModal「獲得物品」使用。
 * 「獲得物品」不再查詢 DB，全部從本地 JSON 檔即時篩選。
 */
import type { MHMaterialDef } from '../types/mhMaterial';
import type { GeneralItemDef } from '../types/generalItem';
import type { CreateCharacterItemData } from './itemService';
import { searchMHMaterials, mhMaterialToCreateData } from './mhMaterialCatalog';
import { searchGeneralItems, generalItemToCreateData } from './generalItemCatalog';

export type CatalogItem =
  | { source: 'material'; entry: MHMaterialDef }
  | { source: 'general'; entry: GeneralItemDef };

/** 合併兩份目錄的搜尋結果，依名稱排序（zh-TW） */
export async function searchLocalCatalog(query: string): Promise<CatalogItem[]> {
  const [materials, generals] = await Promise.all([
    searchMHMaterials(query),
    searchGeneralItems(query),
  ]);
  const combined: CatalogItem[] = [
    ...materials.map((entry) => ({ source: 'material' as const, entry })),
    ...generals.map((entry) => ({ source: 'general' as const, entry })),
  ];
  combined.sort((a, b) => a.entry.name.localeCompare(b.entry.name, 'zh-TW'));
  return combined;
}

export function catalogItemToCreateData(item: CatalogItem, quantity = 1): CreateCharacterItemData {
  return item.source === 'material'
    ? mhMaterialToCreateData(item.entry, quantity)
    : generalItemToCreateData(item.entry, quantity);
}
