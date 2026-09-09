import type { ClassInfo } from '../types';
import {
  FULL_CASTER_CLASS_NAMES,
  HALF_CASTER_CLASS_NAMES,
  ARTIFICER_CLASS_NAME,
  calculateCasterLevelForSpellSlots,
} from './spellSlots';

export const SPELL_SCHOOLS = {
  '塑能': { 
    name: '塑能',
    color: 'red', 
    bg: 'bg-red-500', 
    text: 'text-red-400', 
    border: 'border-red-500',
    bgLight: 'bg-red-500/20'
  },
  '惑控': { 
    name: '惑控',
    color: 'pink', 
    bg: 'bg-pink-500', 
    text: 'text-pink-400', 
    border: 'border-pink-500',
    bgLight: 'bg-pink-500/20'
  },
  '預言': { 
    name: '預言',
    color: 'gray', 
    bg: 'bg-gray-500', 
    text: 'text-gray-400', 
    border: 'border-gray-500',
    bgLight: 'bg-gray-500/20'
  },
  '咒法': { 
    name: '咒法',
    color: 'yellow', 
    bg: 'bg-yellow-500', 
    text: 'text-yellow-400', 
    border: 'border-yellow-500',
    bgLight: 'bg-yellow-500/20'
  },
  '變化': { 
    name: '變化',
    color: 'orange', 
    bg: 'bg-orange-500', 
    text: 'text-orange-400', 
    border: 'border-orange-500',
    bgLight: 'bg-orange-500/20'
  },
  '防護': { 
    name: '防護',
    color: 'blue', 
    bg: 'bg-blue-500', 
    text: 'text-blue-400', 
    border: 'border-blue-500',
    bgLight: 'bg-blue-500/20'
  },
  '死靈': { 
    name: '死靈',
    color: 'green', 
    bg: 'bg-green-500', 
    text: 'text-green-400', 
    border: 'border-green-500',
    bgLight: 'bg-green-500/20'
  },
  '幻術': { 
    name: '幻術',
    color: 'purple', 
    bg: 'bg-purple-500', 
    text: 'text-purple-400', 
    border: 'border-purple-500',
    bgLight: 'bg-purple-500/20'
  },
} as const;

export type SpellSchool = keyof typeof SPELL_SCHOOLS;

/**
 * 施法職業名稱（不含 1/3 施法者，那需要搭配特定子職業才算，見 spellSlots.ts 的
 * THIRD_CASTER_CLASS_SUBCLASS）。跟 spellSlots.ts 共用同一份分類，避免兩邊各自
 * 維護一套「誰算施法者」的名單而互相矛盾（曾經這裡誤把武僧列為施法職業）。
 */
const SPELLCASTER_CLASSES: readonly string[] = [
  ...FULL_CASTER_CLASS_NAMES,
  ...HALF_CASTER_CLASS_NAMES,
  ARTIFICER_CLASS_NAME,
];

/**
 * 取得法術環位的顯示文字
 * @param level 0-9 環位
 * @returns "戲法" 或 "N環法術"
 */
export function getSpellLevelText(level: number): string {
  if (level === 0) return '戲法';
  return `${level}環法術`;
}

/**
 * 取得法術學派的顏色配置
 * @param school 法術學派名稱
 * @returns 顏色配置物件
 */
export function getSchoolColor(school: SpellSchool) {
  return SPELL_SCHOOLS[school];
}

/**
 * 判斷職業列表中是否包含施法職業
 * @param classNames 職業名稱陣列
 * @returns 是否為施法者
 */
export function isSpellcaster(classNames: string[]): boolean {
  return classNames.some(name => SPELLCASTER_CLASSES.includes(name as any));
}

/**
 * 計算角色可準備的法術數量
 * D&D 5E 規則：施法能力調整值 + 施法職業等級
 * 使用「最終」智力調整值（含能力加值、裝備等）與施法職業等級計算。
 *
 * @param intelligenceModifier 智力調整值（應使用 getFinalAbilityModifier(stats, 'int')）
 * @param spellcasterLevel 施法職業的等級
 * @returns 可準備法術數量（最少為 1）
 */
export function calculateMaxPrepared(intelligenceModifier: number, spellcasterLevel: number): number {
  return Math.max(1, intelligenceModifier + spellcasterLevel);
}

/**
 * 取得施法職業的合併等級（用於計算可準備數量）。
 * 直接委派給 spellSlots.ts 的 calculateCasterLevelForSpellSlots——D&D 5E 多職施法者
 * 規則是依全/半/1/3施法者分別加權後加總，不是「取最高等級」，兩邊各自實作一套
 * 容易互相矛盾（例如多職法師+牧師的合併施法等級應該是等級相加，不是取較高者）。
 * @param classes 角色的職業列表（需含 subclassName 才能正確判斷 1/3 施法者）
 * @returns 合併後的施法者等級
 */
export function getSpellcasterLevel(classes: ClassInfo[]): number {
  return calculateCasterLevelForSpellSlots(classes);
}

/**
 * 計算法師可準備的戲法數量
 * 1-3等: 3個
 * 4-9等: 4個
 * 10等+: 5個
 * 
 * @param wizardLevel 法師等級
 * @returns 可準備戲法數量
 */
export function calculateMaxCantrips(wizardLevel: number): number {
  if (wizardLevel === 0) return 0;
  if (wizardLevel <= 3) return 3;
  if (wizardLevel <= 9) return 4;
  return 5;
}
