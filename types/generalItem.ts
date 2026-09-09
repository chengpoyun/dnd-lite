import type { StatBonusEditorValue } from '../components/StatBonusEditor';
import type { ItemCategory } from '../services/itemService';

/** 通用道具目錄條目（見 data/general-items.json，本地維護，不進 DB） */
export interface GeneralItemDef {
  /** 中文名稱，目錄內唯一鍵 */
  name: string;
  category: ItemCategory;
  rarity: string | null;
  nameEn?: string;
  description?: string;
  isMagic?: boolean;
  affectsStats?: boolean;
  appliesUnequipped?: boolean;
  equipmentKind?: string;
  statBonuses?: StatBonusEditorValue;
}
