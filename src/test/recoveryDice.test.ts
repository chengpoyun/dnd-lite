import { describe, it, expect } from 'vitest';
import {
  DEFAULT_RECOVERY_DICE,
  MAX_RECOVERY_DICE_PART,
  parseRecoveryDice,
  normalizeRecoveryDice,
  rollRecoveryDice,
  isLongRestDiceItem,
  rollLongRestDiceRecovery,
  formatLongRestDiceMessage,
} from '../../utils/recoveryDice';
import type { CombatItem } from '../../utils/combatItemMapping';

const item = (overrides: Partial<CombatItem> = {}): CombatItem => ({
  id: 'i1',
  name: '法術反制(護甲)',
  icon: '✨',
  current: 3,
  max: 6,
  recovery: 'long',
  recoveryDice: '1d6',
  ...overrides,
});

/** 固定骰面：rng 回傳 (face-1)/sides，使 Math.floor(rng*sides)+1 = face */
const fixedFace = (face: number, sides: number) => () => (face - 1) / sides;

describe('DEFAULT_RECOVERY_DICE', () => {
  it('預設為 1d6', () => {
    expect(DEFAULT_RECOVERY_DICE).toBe('1d6');
  });
});

describe('parseRecoveryDice', () => {
  it.each(['1d3', '1d5', '2d7', '1d12', '10d10', '1D6', ' 1d6 '])('接受 %s', (raw) => {
    expect(parseRecoveryDice(raw)).not.toBeNull();
  });

  it('解析出顆數與面數', () => {
    expect(parseRecoveryDice('2d7')).toEqual({ count: 2, sides: 7 });
  });

  it.each(['', 'd5', '1d', 'abc', '1d6+1', '-1d6', '+1d6', '1 d6', '1.5d6', '0d6', '1d0'])('拒絕 %s', (raw) => {
    expect(parseRecoveryDice(raw)).toBeNull();
  });

  it('顆數與面數上限為 MAX_RECOVERY_DICE_PART（100）', () => {
    expect(MAX_RECOVERY_DICE_PART).toBe(100);
    expect(parseRecoveryDice('100d100')).toEqual({ count: 100, sides: 100 });
    expect(parseRecoveryDice('101d6')).toBeNull();
    expect(parseRecoveryDice('1d101')).toBeNull();
  });
});

describe('normalizeRecoveryDice', () => {
  it('去掉前後空白並統一小寫 d，符合 DB 的格式限制', () => {
    expect(normalizeRecoveryDice(' 2D7 ')).toBe('2d7');
  });

  it('不合法時回傳 null', () => {
    expect(normalizeRecoveryDice('abc')).toBeNull();
  });
});

describe('rollRecoveryDice', () => {
  it('擲出的點數落在 1 到面數之間（含頭尾）', () => {
    expect(rollRecoveryDice('1d6', () => 0)).toBe(1);
    expect(rollRecoveryDice('1d6', () => 0.999999)).toBe(6);
  });

  it('依 rng 決定點數', () => {
    expect(rollRecoveryDice('1d8', fixedFace(5, 8))).toBe(5);
  });

  it('支援多顆骰（2d4 為兩顆相加）', () => {
    expect(rollRecoveryDice('2d4', () => 0)).toBe(2);
    expect(rollRecoveryDice('2d4', () => 0.999999)).toBe(8);
  });

  it('不合法的記法回傳 null', () => {
    expect(rollRecoveryDice('abc')).toBeNull();
    expect(rollRecoveryDice('')).toBeNull();
    expect(rollRecoveryDice('0d6')).toBeNull();
  });

  it('超過上限的記法回傳 null', () => {
    expect(rollRecoveryDice('101d6')).toBeNull();
  });

  it('支援 2d7 這類非標準骰子（2～14）', () => {
    expect(rollRecoveryDice('2d7', () => 0)).toBe(2);
    expect(rollRecoveryDice('2d7', () => 0.999999)).toBe(14);
  });
});

describe('isLongRestDiceItem', () => {
  it('長休且有合法骰子記法才算', () => {
    expect(isLongRestDiceItem(item())).toBe(true);
  });

  it('沒有 recoveryDice、非長休、或記法不合法都不算', () => {
    expect(isLongRestDiceItem(item({ recoveryDice: undefined }))).toBe(false);
    expect(isLongRestDiceItem(item({ recovery: 'short' }))).toBe(false);
    expect(isLongRestDiceItem(item({ recoveryDice: 'abc' }))).toBe(false);
    expect(isLongRestDiceItem(item({ recoveryDice: '1d3' }))).toBe(true);
  });
});

describe('rollLongRestDiceRecovery', () => {
  it('擲骰後加到目前次數', () => {
    const [r] = rollLongRestDiceRecovery([item({ current: 1, max: 6 })], fixedFace(3, 6));
    expect(r).toMatchObject({ id: 'i1', name: '法術反制(護甲)', notation: '1d6', roll: 3, before: 1, after: 4, max: 6 });
  });

  it('恢復後不超過最大值', () => {
    const [r] = rollLongRestDiceRecovery([item({ current: 3, max: 6 })], fixedFace(6, 6));
    expect(r.roll).toBe(6);
    expect(r.after).toBe(6);
  });

  it('只處理長休擲骰項目，其他項目不會出現在結果裡', () => {
    const results = rollLongRestDiceRecovery(
      [
        item({ id: 'a' }),
        item({ id: 'b', recoveryDice: undefined }),
        item({ id: 'c', recovery: 'short' }),
      ],
      fixedFace(1, 6)
    );
    expect(results.map((r) => r.id)).toEqual(['a']);
  });

  it('已經是最大值的項目也會擲骰並列在結果裡（after 維持最大值）', () => {
    const [r] = rollLongRestDiceRecovery([item({ current: 6, max: 6 })], fixedFace(2, 6));
    expect(r.before).toBe(6);
    expect(r.after).toBe(6);
  });
});

describe('formatLongRestDiceMessage', () => {
  it('每個項目一行，顯示名稱、擲骰結果與次數變化', () => {
    const msg = formatLongRestDiceMessage([
      { id: 'a', name: '法術反制(護甲)', notation: '1d6', roll: 4, before: 3, after: 6, max: 6 },
      { id: 'b', name: '靈光', notation: '1d4', roll: 2, before: 0, after: 2, max: 5 },
    ]);
    expect(msg.split('\n')).toEqual([
      '法術反制(護甲)：擲 1d6 = 4，3 → 6',
      '靈光：擲 1d4 = 2，0 → 2',
    ]);
  });

  it('沒有結果時回傳空字串', () => {
    expect(formatLongRestDiceMessage([])).toBe('');
  });
});
