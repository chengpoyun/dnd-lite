/**
 * 地形獎勵資料型別（依 field-selection-bonus.md）
 */

export interface TerrainSkillDc {
  求生: number;
  觀察: number;
  自然: number;
}

/** 資源類別 id（英文，避免中文判讀錯誤） */
export type ResourceCategoryKey =
  | 'bonepiles'
  | 'fish'
  | 'insects'
  | 'minerals'
  | 'mushrooms'
  | 'plants';

export interface TierCategory {
  id: ResourceCategoryKey;
  label: string;
  backupDc: number;
  /** 備用技能由 getBackupSkillsForCategory(id) 取得，可不存於 JSON */
  backupSkills?: string[];
}

export interface TierTable {
  levelMin: number;
  levelMax: number;
  xDie: 6 | 10;
  categories: TierCategory[];
  /** 以 x 軸為主：key 為 x 欄位（"1".."6" 或 "1~2","3~4",.."9~10"），value 為該欄 y=1..6 的獎勵格字串陣列 */
  columns: Record<string, string[]>;
}

export type TierKey = 'initial' | 'advanced' | 'high' | 'special';

export interface TerrainDef {
  id: string;
  name: string;
  nameEn: string;
  landscapes: string[];
  skillDc: TerrainSkillDc;
  tiers: TierKey[];
  tables: Record<TierKey, TierTable | null>;
}

export interface ParsedReward {
  name: string;
  quantity: number;
}
