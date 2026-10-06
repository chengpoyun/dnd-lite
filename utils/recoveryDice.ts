/**
 * 戰鬥項目「長休擲骰恢復」：長休時不補滿，改為擲骰（如 1d6）增加剩餘次數，上限為最大值
 */
import { parseDiceTerm } from './characterAttributes';
import type { CombatItem } from './combatItemMapping';

export const RECOVERY_DICE_OPTIONS = ['1d4', '1d6', '1d8', '1d10', '1d12'] as const;

export interface LongRestDiceResult {
  id: string;
  name: string;
  notation: string;
  roll: number;
  before: number;
  after: number;
  max: number;
}

/** 擲骰記法（如 '1d6'、'2d4'）；記法不合法（或帶正負號）回傳 null */
export function rollRecoveryDice(notation: string, rng: () => number = Math.random): number | null {
  const term = parseDiceTerm(notation);
  if (!term || term.sign !== 1) return null;
  let total = 0;
  for (let i = 0; i < term.count; i++) {
    total += Math.floor(rng() * term.sides) + 1;
  }
  return total;
}

/** 長休且設有合法骰子記法的項目，長休時改為擲骰恢復 */
export function isLongRestDiceItem(item: Pick<CombatItem, 'recovery' | 'recoveryDice'>): boolean {
  return item.recovery === 'long' && !!item.recoveryDice && parseDiceTerm(item.recoveryDice) !== null;
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
