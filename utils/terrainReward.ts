/**
 * 地形獎勵查表與解析（依 field-selection-bonus 規則）
 */
import type { TerrainDef, TierTable, TierKey, ParsedReward, ResourceCategoryKey } from '../types/terrainReward';

/** 資源類別 id（英文）對應的備用技能（規則書固定，無需存於 JSON） */
export const CATEGORY_BACKUP_SKILLS: Record<ResourceCategoryKey, string[]> = {
  bonepiles: ['歷史', '觀察'],
  fish: ['運動', '巧手'],
  insects: ['巧手', '觀察'],
  minerals: ['運動'],
  mushrooms: ['自然', '求生'],
  plants: ['自然', '求生'],
};

/** 依資源類別 id 取得備用技能列表 */
export function getBackupSkillsForCategory(categoryId: ResourceCategoryKey | string): string[] {
  return CATEGORY_BACKUP_SKILLS[categoryId as ResourceCategoryKey] ?? [];
}

/** 解析單格獎勵字串，如 "藥草" -> { name, quantity: 1 }，"藥草 x 2" -> { name, quantity: 2 } */
export function parseRewardCell(cell: string): ParsedReward {
  const t = (cell ?? '').trim();
  if (!t) return { name: '', quantity: 1 };
  const match = t.match(/^(.+?)\s*[xX×]\s*(\d+)\s*$/);
  if (match) {
    return { name: match[1].trim().replace(/\\/g, ''), quantity: Math.max(1, parseInt(match[2], 10)) };
  }
  return { name: t.replace(/\\/g, ''), quantity: 1 };
}

/** 依角色等級回傳當前階級；若無對應表則 null */
export function getTierForLevel(terrain: TerrainDef, level: number): TierKey | null {
  const keys: TierKey[] = ['initial', 'advanced', 'high', 'special'];
  for (const key of keys) {
    const table = terrain.tables[key];
    if (table && level >= table.levelMin && level <= table.levelMax) return key;
  }
  return null;
}

/** 依擲骰結果取得 X 欄的 cell key（1d6 -> "1".."6"，1d10 -> "1~2","3~4",.."9~10"） */
export function resolveXKeyForRoll(table: TierTable, rollX: number): string {
  if (table.xDie === 6) {
    if (rollX < 1 || rollX > 6) return '';
    return String(rollX);
  }
  if (table.xDie === 10) {
    if (rollX < 1 || rollX > 10) return '';
    if (rollX <= 2) return '1~2';
    if (rollX <= 4) return '3~4';
    if (rollX <= 6) return '5~6';
    if (rollX <= 8) return '7~8';
    return '9~10';
  }
  return '';
}

/** 依 xDie 回傳欄位 key 的順序（對應 categories 順序） */
export function getColumnKeys(table: TierTable): string[] {
  if (table.xDie === 6) return ['1', '2', '3', '4', '5', '6'];
  return ['1~2', '3~4', '5~6', '7~8', '9~10'];
}

/** 依 table、擲出的 x（1..xDie）、y（1..6）查表並回傳解析後獎勵 */
export function getRewardFromTable(table: TierTable, rollX: number, y: number): ParsedReward | null {
  const xKey = resolveXKeyForRoll(table, rollX);
  if (!xKey) return null;
  if (y < 1 || y > 6) return null;
  const col = table.columns[xKey];
  if (!col || !col[y - 1]) return null;
  const cell = col[y - 1].trim();
  if (!cell) return null;
  const parsed = parseRewardCell(cell);
  if (!parsed.name) return null;
  return parsed;
}

/** 取得該階表中某資源類別（X 欄）下所有 Y 的獎勵列表（供失敗檢定成功時自選） */
export function getRewardsForCategoryInTier(
  table: TierTable,
  categoryIndex: number
): ParsedReward[] {
  const colKeys = getColumnKeys(table);
  const xKey = colKeys[categoryIndex];
  if (!xKey) return [];
  const col = table.columns[xKey] ?? [];
  const results: ParsedReward[] = [];
  for (const cell of col) {
    if (cell && cell.trim()) {
      const p = parseRewardCell(cell);
      if (p.name) results.push(p);
    }
  }
  return results;
}

/** 取得該階表所有可獲取物資名稱（去重，供地形卡簡表顯示） */
export function getRewardSummaryNames(table: TierTable): string[] {
  const names = new Set<string>();
  for (const col of Object.values(table.columns)) {
    for (const cell of col ?? []) {
      if (cell && cell.trim()) {
        const p = parseRewardCell(cell);
        if (p.name) names.add(p.name);
      }
    }
  }
  return Array.from(names).sort();
}
