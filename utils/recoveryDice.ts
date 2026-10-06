/**
 * 戰鬥項目「長休擲骰恢復」：長休時不補滿，改為擲骰（如 1d6）增加剩餘次數，上限為最大值
 */
import type { CombatItem } from './combatItemMapping';

export const DEFAULT_RECOVERY_DICE = '1d6';

/** 骰子顆數與面數的上限，避免輸入沒有意義的大數字（如 1000d1000） */
export const MAX_RECOVERY_DICE_PART = 100;

/** 解析「NdM」（不含正負號與修正值）；顆數、面數需在 1 到 MAX_RECOVERY_DICE_PART 之間，否則回傳 null */
export function parseRecoveryDice(raw: string): { count: number; sides: number } | null {
  const m = /^(\d+)d(\d+)$/i.exec(raw.trim());
  if (!m) return null;
  const count = parseInt(m[1], 10);
  const sides = parseInt(m[2], 10);
  const inRange = (n: number) => n >= 1 && n <= MAX_RECOVERY_DICE_PART;
  return inRange(count) && inRange(sides) ? { count, sides } : null;
}

/** 正規化成儲存格式（去前後空白、小寫 d，符合 DB 的格式限制）；不合法回傳 null */
export function normalizeRecoveryDice(raw: string): string | null {
  const parsed = parseRecoveryDice(raw);
  return parsed ? `${parsed.count}d${parsed.sides}` : null;
}

export interface LongRestDiceResult {
  id: string;
  name: string;
  notation: string;
  roll: number;
  before: number;
  after: number;
  max: number;
}

/** 擲骰記法（如 '1d6'、'2d7'）；記法不合法回傳 null */
export function rollRecoveryDice(notation: string, rng: () => number = Math.random): number | null {
  const term = parseRecoveryDice(notation);
  if (!term) return null;
  let total = 0;
  for (let i = 0; i < term.count; i++) {
    total += Math.floor(rng() * term.sides) + 1;
  }
  return total;
}

/** 長休且設有合法骰子記法的項目，長休時改為擲骰恢復 */
export function isLongRestDiceItem(item: Pick<CombatItem, 'recovery' | 'recoveryDice'>): boolean {
  return item.recovery === 'long' && !!item.recoveryDice && parseRecoveryDice(item.recoveryDice) !== null;
}

/** 對所有長休擲骰項目擲骰；回傳每個項目的結果（恢復後次數不超過最大值） */
export function rollLongRestDiceRecovery(items: CombatItem[], rng: () => number = Math.random): LongRestDiceResult[] {
  return items.filter(isLongRestDiceItem).map((item) => {
    const notation = item.recoveryDice as string;
    const roll = rollRecoveryDice(notation, rng) ?? 0;
    return {
      id: item.id,
      name: item.name,
      notation,
      roll,
      before: item.current,
      after: Math.min(item.max, item.current + roll),
      max: item.max,
    };
  });
}

/** 長休擲骰結果的顯示文字（每個項目一行） */
export function formatLongRestDiceMessage(results: LongRestDiceResult[]): string {
  return results.map((r) => `${r.name}：擲 ${r.notation} = ${r.roll}，${r.before} → ${r.after}`).join('\n');
}
