// D&D 5E 全施法者法術位計算：依合併施法者等級查表，支援多職業合併規則。
import type { ClassInfo } from '../types';

/** 索引 0 = 施法者等級 0（無法術位），索引 1~20 對應施法者等級的 1~9 環法術位數量 */
const FULL_CASTER_SPELL_SLOTS: readonly (readonly number[])[] = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [2, 0, 0, 0, 0, 0, 0, 0, 0],
  [3, 0, 0, 0, 0, 0, 0, 0, 0],
  [4, 2, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 2, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 1, 0, 0, 0, 0, 0],
  [4, 3, 3, 2, 0, 0, 0, 0, 0],
  [4, 3, 3, 3, 1, 0, 0, 0, 0],
  [4, 3, 3, 3, 2, 0, 0, 0, 0],
  [4, 3, 3, 3, 3, 1, 0, 0, 0],
  [4, 3, 3, 3, 3, 1, 0, 0, 0],
  [4, 3, 3, 3, 3, 1, 1, 0, 0],
  [4, 3, 3, 3, 3, 1, 1, 0, 0],
  [4, 3, 3, 3, 3, 1, 1, 1, 0],
  [4, 3, 3, 3, 3, 1, 1, 1, 0],
  [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 2, 1, 1],
];

/** 全施法者：等級直接加總 */
export const FULL_CASTER_CLASS_NAMES = ['吟遊詩人', '牧師', '德魯伊', '術士', '法師'];
/** 半施法者：等級加總後除以2無條件捨去 */
export const HALF_CASTER_CLASS_NAMES = ['聖騎士', '遊俠'];
/** 奇械師：等級除以2無條件進位（官方勘誤規則） */
export const ARTIFICER_CLASS_NAME = '奇械師';
/** 1/3施法者：職業需搭配指定子職業才計入，等級加總後除以3無條件捨去 */
export const THIRD_CASTER_CLASS_SUBCLASS: Record<string, string> = {
  '戰士': '奧術騎士',
  '遊蕩者': '奧術詭術師',
};

/** 依 D&D 5E 多職施法者規則，將各職業等級合併為單一「施法者等級」以查詢法術位表 */
export function calculateCasterLevelForSpellSlots(classes: ClassInfo[]): number {
  let fullLevel = 0;
  let halfLevel = 0;
  let artificerLevel = 0;
  let thirdLevel = 0;

  for (const cls of classes) {
    if (FULL_CASTER_CLASS_NAMES.includes(cls.name)) {
      fullLevel += cls.level;
    } else if (HALF_CASTER_CLASS_NAMES.includes(cls.name)) {
      halfLevel += cls.level;
    } else if (cls.name === ARTIFICER_CLASS_NAME) {
      artificerLevel += cls.level;
    } else if (THIRD_CASTER_CLASS_SUBCLASS[cls.name] && cls.subclassName === THIRD_CASTER_CLASS_SUBCLASS[cls.name]) {
      thirdLevel += cls.level;
    }
  }

  const casterLevel =
    fullLevel +
    Math.floor(halfLevel / 2) +
    Math.ceil(artificerLevel / 2) +
    Math.floor(thirdLevel / 3);

  return Math.min(20, Math.max(0, casterLevel));
}

/** 依合併施法者等級查表，回傳長度9的陣列（索引0=1環...索引8=9環） */
export function getSpellSlotsForCasterLevel(casterLevel: number): number[] {
  const clamped = Math.min(20, Math.max(0, Math.floor(casterLevel)));
  return [...FULL_CASTER_SPELL_SLOTS[clamped]];
}
