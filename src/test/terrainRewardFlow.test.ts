/**
 * 地形獎勵獲取流程：擲骰結果、成功/失敗次數、下修階級
 */
import { describe, it, expect } from 'vitest';
import {
  computeRollResults,
  getNextDowngradeTier,
  type RollResult,
} from '../../utils/terrainRewardFlow';
import type { TierKey } from '../../types/terrainReward';

describe('terrainRewardFlow - computeRollResults', () => {
  it('單次擲骰 >= DC 算 1 次成功，擲出 20 再 +1 次成功', () => {
    const dc = 15;
    const bonus = 2;
    const results = computeRollResults(3, dc, bonus, [20, 15, 10]);
    expect(results.successCount).toBe(3);
    expect(results.failureCount).toBe(1);
    expect(results.rollDetails).toHaveLength(3);
    expect(results.rollDetails[0].total).toBe(22);
    expect(results.rollDetails[0].success).toBe(true);
    expect(results.rollDetails[0].critical).toBe(true);
    expect(results.rollDetails[1].success).toBe(true);
    expect(results.rollDetails[1].critical).toBe(false);
    expect(results.rollDetails[2].success).toBe(false);
  });

  it('每次擲骰獨立計算，大成功單次最多 2 次成功', () => {
    const results = computeRollResults(2, 10, 0, [20, 20]);
    expect(results.successCount).toBe(4);
    expect(results.failureCount).toBe(0);
  });

  it('擲出 20 一律視為大成功，即使加總未達 DC 也算成功', () => {
    const dc = 30;
    const bonus = 0;
    const results = computeRollResults(2, dc, bonus, [20, 5]);
    expect(results.rollDetails[0].d20).toBe(20);
    expect(results.rollDetails[0].total).toBe(20);
    expect(results.rollDetails[0].success).toBe(true);
    expect(results.rollDetails[0].critical).toBe(true);
    expect(results.rollDetails[1].success).toBe(false);
    expect(results.successCount).toBe(2);
    expect(results.failureCount).toBe(1);
  });

  it('單次檢定總和 >= 20 計為 2 次獎勵（3 次皆總和 >= 20 則 6 次獎勵）', () => {
    const dc = 10;
    const bonus = 16;
    const results = computeRollResults(3, dc, bonus, [10, 10, 4]);
    expect(results.rollDetails[0].total).toBe(26);
    expect(results.rollDetails[1].total).toBe(26);
    expect(results.rollDetails[2].total).toBe(20);
    expect(results.successCount).toBe(6);
    expect(results.failureCount).toBe(0);
  });

  it('擲出 1 一律視為失敗，即使加總高於 DC 也算失敗', () => {
    const dc = 10;
    const bonus = 20;
    const results = computeRollResults(2, dc, bonus, [1, 15]);
    expect(results.rollDetails[0].d20).toBe(1);
    expect(results.rollDetails[0].total).toBe(21);
    expect(results.rollDetails[0].success).toBe(false);
    expect(results.rollDetails[1].success).toBe(true);
    expect(results.successCount).toBe(2);
    expect(results.failureCount).toBe(1);
  });
});

describe('terrainRewardFlow - getNextDowngradeTier', () => {
  it('進階 -> 初階，高階 -> 進階，特階 -> 高階', () => {
    expect(getNextDowngradeTier('advanced')).toBe('initial');
    expect(getNextDowngradeTier('high')).toBe('advanced');
    expect(getNextDowngradeTier('special')).toBe('high');
  });

  it('初階無可下修，回傳 null', () => {
    expect(getNextDowngradeTier('initial')).toBe(null);
  });
});
