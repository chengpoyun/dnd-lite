/**
 * 地形獎勵獲取流程：擲骰結果、成功/失敗次數、下修階級
 */
import type { TierKey } from '../types/terrainReward';

export interface RollDetail {
  d20: number;
  bonus: number;
  total: number;
  success: boolean;
  critical: boolean;
}

export interface RollResults {
  successCount: number;
  failureCount: number;
  rollDetails: RollDetail[];
}

/**
 * 依「獲取次數」與每次 d20 結果計算成功獎勵次數、失敗次數與每筆擲骰明細。
 * 擲出 1 一律視為失敗（即使加總高於 DC）；擲出 20 一律視為成功（即使加總未達 DC）；單次 >= DC 算 1 次成功；總和 >= 20 再 +1 次成功（即單次總和 >= 20 計為 2 次獎勵）；否則算 1 次失敗。
 */
export function computeRollResults(
  attempts: number,
  dc: number,
  bonus: number,
  d20Rolls: number[]
): RollResults {
  const rollDetails: RollDetail[] = [];
  let successCount = 0;
  let failureCount = 0;
  for (let i = 0; i < attempts; i++) {
    const d20 = d20Rolls[i] ?? 0;
    const total = d20 + bonus;
    const critical = d20 === 20;
    const fumble = d20 === 1;
    const success = !fumble && (total >= dc || critical);
    rollDetails.push({ d20, bonus, total, success, critical });
    if (success) {
      successCount += 1;
      if (total >= 20) successCount += 1;
    } else {
      failureCount += 1;
    }
  }
  return { successCount, failureCount, rollDetails };
}

const TIER_ORDER: TierKey[] = ['initial', 'advanced', 'high', 'special'];

/** 下修一階：進階->初階、高階->進階、特階->高階；初階回傳 null */
export function getNextDowngradeTier(current: TierKey): TierKey | null {
  const idx = TIER_ORDER.indexOf(current);
  if (idx <= 0) return null;
  return TIER_ORDER[idx - 1];
}
