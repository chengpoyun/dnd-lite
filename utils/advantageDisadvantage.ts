/**
 * 豁免／技能優勢劣勢結算：純函數，供 detailedCharacter 聚合後呼叫。
 * 規則：任一來源給優勢且任一來源給劣勢 → normal；僅優勢 → advantage；僅劣勢 → disadvantage；皆無 → normal。
 */
import { ABILITY_KEYS } from './characterConstants';
import { SKILLS_MAP } from './characterConstants';

export type AdvantageDisadvantageVariant = 'advantage' | 'normal' | 'disadvantage';

export interface AdvantageDisadvantageSource {
  id: string;
  name?: string;
  savingThrowAdvantage?: string[];
  savingThrowDisadvantage?: string[];
  skillAdvantage?: string[];
  skillDisadvantage?: string[];
}

/**
 * 單一項（豁免或技能）的優劣勢結算。
 * 兩者皆非空 → normal；僅 advantage 非空 → advantage；僅 disadvantage 非空 → disadvantage；皆空 → normal。
 */
export function resolveAdvantageDisadvantage(
  advantageSources: string[],
  disadvantageSources: string[]
): AdvantageDisadvantageVariant {
  const hasAdv = Array.isArray(advantageSources) && advantageSources.length > 0;
  const hasDis = Array.isArray(disadvantageSources) && disadvantageSources.length > 0;
  if (hasAdv && hasDis) return 'normal';
  if (hasAdv) return 'advantage';
  if (hasDis) return 'disadvantage';
  return 'normal';
}

export interface SaveAndSkillAdvantageDisadvantageResult {
  saveAdvantageDisadvantage: Record<string, AdvantageDisadvantageVariant>;
  skillAdvantageDisadvantage: Record<string, AdvantageDisadvantageVariant>;
}

/**
 * 從多筆來源合併優劣勢，並對每個豁免 key、每個技能名結算為 advantage | normal | disadvantage。
 */
export function computeSaveAndSkillAdvantageDisadvantage(
  sources: AdvantageDisadvantageSource[]
): SaveAndSkillAdvantageDisadvantageResult {
  const saveAdv: Record<string, string[]> = {};
  const saveDis: Record<string, string[]> = {};
  const skillAdv: Record<string, string[]> = {};
  const skillDis: Record<string, string[]> = {};

  for (const src of sources) {
    const id = src.id ?? '';
    if (Array.isArray(src.savingThrowAdvantage)) {
      for (const k of src.savingThrowAdvantage) {
        if (!saveAdv[k]) saveAdv[k] = [];
        saveAdv[k].push(id);
      }
    }
    if (Array.isArray(src.savingThrowDisadvantage)) {
      for (const k of src.savingThrowDisadvantage) {
        if (!saveDis[k]) saveDis[k] = [];
        saveDis[k].push(id);
      }
    }
    if (Array.isArray(src.skillAdvantage)) {
      for (const k of src.skillAdvantage) {
        if (!skillAdv[k]) skillAdv[k] = [];
        skillAdv[k].push(id);
      }
    }
    if (Array.isArray(src.skillDisadvantage)) {
      for (const k of src.skillDisadvantage) {
        if (!skillDis[k]) skillDis[k] = [];
        skillDis[k].push(id);
      }
    }
  }

  const saveAdvantageDisadvantage: Record<string, AdvantageDisadvantageVariant> = {};
  for (const key of ABILITY_KEYS) {
    saveAdvantageDisadvantage[key] = resolveAdvantageDisadvantage(
      saveAdv[key] ?? [],
      saveDis[key] ?? []
    );
  }

  const skillAdvantageDisadvantage: Record<string, AdvantageDisadvantageVariant> = {};
  for (const s of SKILLS_MAP) {
    const name = s.name;
    skillAdvantageDisadvantage[name] = resolveAdvantageDisadvantage(
      skillAdv[name] ?? [],
      skillDis[name] ?? []
    );
  }

  return { saveAdvantageDisadvantage, skillAdvantageDisadvantage };
}
