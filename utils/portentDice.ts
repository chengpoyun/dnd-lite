// 預言學派法師「預言骰」（Portent）：2 等取得 2 顆，14 等（更偉大的預言）起變為 3 顆。
import type { CharacterStats, ClassInfo } from '../types';
import { getClassHitDie } from './classUtils';

export const DIVINATION_WIZARD_CLASS_NAME = '法師';
export const DIVINATION_SUBCLASS_NAME = '預言學派';

/** 取得更偉大的預言（3 顆骰）生效的法師等級 */
export const GREATER_PORTENT_LEVEL = 14;

/** 單顆預言骰狀態：value 為 null 代表尚未擲骰（如剛升級但還沒經過長休） */
export interface PortentDieState {
  value: number | null;
  used: boolean;
}

/** 找出角色的預言學派法師職業（多職時只看法師那一格，找不到回傳 undefined） */
export function getDivinationWizardClass(stats: CharacterStats): ClassInfo | undefined {
  const classes: ClassInfo[] = stats.classes?.length
    ? stats.classes
    : (stats.class
      ? [{ name: stats.class, level: stats.level ?? 1, hitDie: getClassHitDie(stats.class), isPrimary: true }]
      : []);

  return classes.find(
    (c) => c.name === DIVINATION_WIZARD_CLASS_NAME && c.subclassName === DIVINATION_SUBCLASS_NAME
  );
}

/** 依法師職業等級計算預言骰數量（2 等以下沒有此特性，回傳 0） */
export function getPortentDiceCount(wizardLevel: number): number {
  if (wizardLevel < 2) return 0;
  return wizardLevel >= GREATER_PORTENT_LEVEL ? 3 : 2;
}

/**
 * 依目前應有的骰子數量，補齊／裁切既有骰子陣列供畫面顯示
 * 多出的位置（如剛升級到14等，還沒經過長休）補上 value:null 的佔位骰
 */
export function getPortentDiceForDisplay(
  storedDice: PortentDieState[] | undefined,
  diceCount: number
): PortentDieState[] {
  const dice = storedDice ?? [];
  return Array.from({ length: diceCount }, (_, i) => dice[i] ?? { value: null, used: false });
}

/** 長休重骰：依輸入的新數值組出全新一組（皆為未使用）的預言骰 */
export function createRerolledPortentDice(values: number[]): PortentDieState[] {
  return values.map((value) => ({ value, used: false }));
}
