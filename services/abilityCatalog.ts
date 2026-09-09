/**
 * 特殊能力目錄（讀取 data/abilities.json，本地維護，不進 DB）
 * 「學習特殊能力」搜尋皆從這裡取資料，不再查詢 abilities 表。
 */
import type { AbilityDef } from '../types/ability';
import type { CreateCharacterAbilityData } from './abilityService';
import { matchesSearch } from '../utils/common';

let cached: AbilityDef[] | null = null;

export async function getAbilities(): Promise<AbilityDef[]> {
  if (cached) return cached;
  const data = await import('../data/abilities.json');
  cached = (data.default ?? data) as unknown as AbilityDef[];
  return cached;
}

/** 依名稱精準比對（目錄內名稱唯一） */
export async function findAbilityByName(name: string): Promise<AbilityDef | undefined> {
  const list = await getAbilities();
  return list.find((a) => a.name === name);
}

/** 依名稱／英文名／描述關鍵字篩選；查詢字串為空時回傳全部 */
export async function searchAbilities(query: string): Promise<AbilityDef[]> {
  const list = await getAbilities();
  return list.filter((a) => matchesSearch(query, a.name, a.nameEn, a.description));
}

/** 將目錄條目轉成「學習特殊能力」的 payload，供 createCharacterAbility 使用 */
export function abilityToCreateData(entry: AbilityDef, maxUses?: number): CreateCharacterAbilityData {
  return {
    name: entry.name,
    name_en: entry.nameEn,
    source: entry.source,
    recovery_type: entry.recoveryType,
    description: entry.description,
    max_uses: maxUses,
    affects_stats: entry.affectsStats,
    stat_bonuses: entry.statBonuses,
  };
}
