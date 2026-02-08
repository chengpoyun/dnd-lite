/**
 * 角色屬性計算 - basic + bonus = final
 * 供各 Page 與 buildCharacterStats 使用
 */
import type { CharacterStats } from '../types';
import { getModifier, getProfBonus } from './helpers';
import { SKILLS_MAP } from './characterConstants';
import { ABILITY_KEYS } from './characterConstants';

export type CombatStatKey =
  | 'ac'
  | 'initiative'
  | 'speed'
  | 'maxHp'
  | 'attackHit'
  | 'attackDamage'
  | 'spellHit'
  | 'spellDc';

export type AbilityKey = keyof CharacterStats['abilityScores'];

interface BasicBonusValue {
  basic: number;
  bonus: number;
}

function getBasicBonusFinal(
  value: number | BasicBonusValue | undefined,
  defaultVal = 0
): number {
  if (value === undefined || value === null) return defaultVal;
  if (typeof value === 'number') return value;
  return (value.basic ?? 0) + (value.bonus ?? 0);
}

function getBasicValue(
  value: number | BasicBonusValue | undefined,
  defaultVal = 0
): number {
  if (value === undefined || value === null) return defaultVal;
  if (typeof value === 'number') return value;
  return value.basic ?? defaultVal;
}

function getBonusValue(value: number | BasicBonusValue | undefined): number {
  if (value === undefined || value === null || typeof value === 'number') return 0;
  return value.bonus ?? 0;
}

/**
 * 取得戰鬥屬性的 basic 值（僅可編輯 basic，bonus 唯讀）
 */
export function getBasicCombatStat(
  stats: CharacterStats,
  key: CombatStatKey
): number {
  switch (key) {
    case 'ac':
      return getBasicValue((stats as any).ac, 10);
    case 'initiative':
      return getBasicValue((stats as any).initiative, 0);
    case 'speed':
      return getBasicValue((stats as any).speed, 30);
    case 'maxHp': {
      const maxHp = (stats as any).maxHp;
      if (maxHp !== undefined) return getBasicValue(maxHp, 1);
      return stats.hp?.max ?? 1;
    }
    case 'attackHit': {
      const v = (stats as any).attackHit ?? (stats as any).weapon_attack_bonus;
      return getBasicValue(v, 0);
    }
    case 'attackDamage': {
      const v = (stats as any).attackDamage ?? (stats as any).weapon_damage_bonus;
      return getBasicValue(v, 0);
    }
    case 'spellHit': {
      const v = (stats as any).spellHit ?? (stats as any).spell_attack_bonus;
      return getBasicValue(v, 0);
    }
    case 'spellDc': {
      const v = (stats as any).spellDc ?? (stats as any).spell_save_dc;
      return getBasicValue(v, 0);
    }
  }
}

/**
 * 取得戰鬥屬性 final 值（支援舊 flat 與新 basic+bonus 格式）
 */
export function getFinalCombatStat(
  stats: CharacterStats,
  key: CombatStatKey
): number {
  switch (key) {
    case 'ac':
      return getBasicValue((stats as any).ac, 10) + getFinalAbilityModifier(stats, 'dex') + getBonusValue((stats as any).ac);
    case 'initiative':
      return getBasicBonusFinal((stats as any).initiative, 0);
    case 'speed':
      return getBasicBonusFinal((stats as any).speed, 30);
    case 'maxHp': {
      const maxHp = (stats as any).maxHp;
      if (maxHp !== undefined) return getBasicBonusFinal(maxHp, 1);
      return stats.hp?.max ?? 1;
    }
    case 'attackHit': {
      const v = (stats as any).attackHit ?? (stats as any).weapon_attack_bonus;
      return getBasicBonusFinal(v, 0);
    }
    case 'attackDamage': {
      const v = (stats as any).attackDamage ?? (stats as any).weapon_damage_bonus;
      return getBasicBonusFinal(v, 0);
    }
    case 'spellHit': {
      const v = (stats as any).spellHit ?? (stats as any).spell_attack_bonus;
      return getBasicBonusFinal(v, 0);
    }
    case 'spellDc': {
      const v = (stats as any).spellDc ?? (stats as any).spell_save_dc;
      return getBasicBonusFinal(v, 0);
    }
  }
}

/**
 * 取得 6 屬性最終調整值
 */
export function getFinalAbilityModifier(
  stats: CharacterStats,
  key: AbilityKey
): number {
  const score = stats.abilityScores?.[key] ?? 10;
  const abilityBonus =
    (stats.extraData?.abilityBonuses as Record<string, number>)?.[key] ?? 0;
  const modifierBonus =
    (stats.extraData?.modifierBonuses as Record<string, number>)?.[key] ?? 0;
  const finalScore = score + abilityBonus;
  return getModifier(finalScore) + modifierBonus;
}

/**
 * 取得 6 豁免加值 final = ability_mod + (prof ? profBonus : 0) + misc_bonus
 */
export function getFinalSavingThrow(
  stats: CharacterStats,
  abilityKey: AbilityKey
): number {
  const mod = getFinalAbilityModifier(stats, abilityKey);
  const profBonus = getProfBonus(stats.level ?? 1);
  const saveProfs = stats.savingProficiencies ?? [];
  const isProf = saveProfs.includes(abilityKey);
  const miscBonus =
    ((stats as any).saveBonuses as Record<string, number>)?.[abilityKey] ?? 0;
  return mod + (isProf ? profBonus : 0) + miscBonus;
}

/**
 * 取得 18 技能加值 final = ability_mod + profLevel * profBonus + misc_bonus
 */
export function getFinalSkillBonus(
  stats: CharacterStats,
  skillName: string
): number {
  const skill = SKILLS_MAP.find((s) => s.name === skillName);
  if (!skill) return 0;
  const mod = getFinalAbilityModifier(stats, skill.base);
  const profBonus = getProfBonus(stats.level ?? 1);
  const profLevel = (stats.proficiencies ?? {})[skillName] ?? 0;
  const miscBonus =
    ((stats as any).skillBonuses as Record<string, number>)?.[skillName] ?? 0;
  return mod + profLevel * profBonus + miscBonus;
}
