import { describe, it, expect } from 'vitest';
import {
  migrateLegacyCharacterStats,
  needsMulticlassMigration,
  validateMulticlassData,
  ensureDisplayClass,
} from '../../utils/migrationHelpers';
import type { CharacterStats, ClassInfo, HitDicePools } from '../../types';

function makeStats(overrides: Partial<CharacterStats> = {}): CharacterStats {
  return {
    class: '法師',
    level: 5,
    hitDice: { current: 5, total: 5, die: 'd6' },
    ...overrides,
  } as CharacterStats;
}

const emptyPools = (): HitDicePools => ({
  d12: { current: 0, total: 0 },
  d10: { current: 0, total: 0 },
  d8: { current: 0, total: 0 },
  d6: { current: 0, total: 0 },
});

describe('migrateLegacyCharacterStats', () => {
  it('已有 classes 與 hitDicePools 時，原封不動回傳同一物件', () => {
    const classes: ClassInfo[] = [{ name: '法師', level: 5, hitDie: 'd6', isPrimary: true }];
    const hitDicePools: HitDicePools = { ...emptyPools(), d6: { current: 5, total: 5 } };
    const stats = makeStats({ classes, hitDicePools });

    const result = migrateLegacyCharacterStats(stats);

    expect(result).toBe(stats);
  });

  it('缺少 classes 資料時，依 class/level 建立主職業並正確帶入該職業的生命骰類型', () => {
    const stats = makeStats({ class: '法師', level: 5, hitDice: { current: 5, total: 5, die: 'd8' } });

    const result = migrateLegacyCharacterStats(stats);

    expect(result.classes).toEqual([
      { name: '法師', level: 5, hitDie: 'd6', isPrimary: true },
    ]);
    expect(result.hitDicePools?.d6).toEqual({ current: 5, total: 5 });
  });

  it('遷移後的生命骰 current 值，取角色現有 current 與職業總量的較小值（避免超過上限）', () => {
    const stats = makeStats({ class: '戰士', level: 3, hitDice: { current: 10, total: 10, die: 'd10' } });

    const result = migrateLegacyCharacterStats(stats);

    // 戰士 3 級的生命骰總量只有 3，即使舊資料 current=10，也要被夾在 3 以內
    expect(result.hitDicePools?.d10).toEqual({ current: 3, total: 3 });
  });

  it('current 小於職業總量時，直接沿用該值', () => {
    const stats = makeStats({ class: '戰士', level: 5, hitDice: { current: 2, total: 2, die: 'd10' } });

    const result = migrateLegacyCharacterStats(stats);

    expect(result.hitDicePools?.d10).toEqual({ current: 2, total: 5 });
  });

  it('已有 classes 但缺少 hitDicePools 時，仍會重建 classes（以 stats.class/level 為準，覆蓋既有 classes）', () => {
    // 這是目前實作的真實行為：跳過遷移的條件是 classes && hitDicePools 同時存在，
    // 只要缺其中之一就會整個重建，即使 stats.classes 原本已經是正確的多職業資料。
    const staleClasses: ClassInfo[] = [{ name: '戰士', level: 99, hitDie: 'd10', isPrimary: true }];
    const stats = makeStats({ class: '法師', level: 5, classes: staleClasses, hitDicePools: undefined });

    const result = migrateLegacyCharacterStats(stats);

    expect(result.classes).toEqual([{ name: '法師', level: 5, hitDie: 'd6', isPrimary: true }]);
  });
});

describe('needsMulticlassMigration', () => {
  it('完全沒有 classes 資料時需要遷移', () => {
    expect(needsMulticlassMigration(makeStats({ classes: undefined }))).toBe(true);
  });

  it('已有多個職業（多職業）時不需要遷移', () => {
    const classes: ClassInfo[] = [
      { name: '法師', level: 3, hitDie: 'd6', isPrimary: true },
      { name: '戰士', level: 2, hitDie: 'd10', isPrimary: false },
    ];
    expect(needsMulticlassMigration(makeStats({ classes }))).toBe(false);
  });

  it('單一職業且已有 hitDicePools 時不需要遷移', () => {
    const classes: ClassInfo[] = [{ name: '法師', level: 5, hitDie: 'd6', isPrimary: true }];
    expect(needsMulticlassMigration(makeStats({ classes, hitDicePools: emptyPools() }))).toBe(false);
  });

  it('單一職業但缺少 hitDicePools 時，回傳 false（不需要遷移）—— 與 migrateLegacyCharacterStats 的判斷條件不一致', () => {
    // 這是目前實作的真實行為（非期望行為的斷言）：needsMulticlassMigration 只要 stats.classes 存在就不算需要遷移，
    // 但 migrateLegacyCharacterStats 的跳過條件是 classes && hitDicePools 同時存在。
    // 也就是說：對這種輸入，needsMulticlassMigration 說「不用遷移」，但若真的呼叫 migrateLegacyCharacterStats 卻仍會重建 classes。
    const classes: ClassInfo[] = [{ name: '法師', level: 5, hitDie: 'd6', isPrimary: true }];
    const stats = makeStats({ classes, hitDicePools: undefined });

    expect(needsMulticlassMigration(stats)).toBe(false);
  });
});

describe('validateMulticlassData', () => {
  it('缺少 classes 時回報錯誤', () => {
    const result = validateMulticlassData(makeStats({ classes: undefined, hitDicePools: emptyPools() }));
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('No classes found');
  });

  it('缺少 hitDicePools 時回報錯誤', () => {
    const classes: ClassInfo[] = [{ name: '法師', level: 5, hitDie: 'd6', isPrimary: true }];
    const result = validateMulticlassData(makeStats({ classes, hitDicePools: undefined }));
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('No hit dice pools found');
  });

  it('主職業數量不是剛好 1 個時回報錯誤（0 個或 2 個都算錯）', () => {
    const noPrimary: ClassInfo[] = [{ name: '法師', level: 5, hitDie: 'd6', isPrimary: false }];
    const resultNone = validateMulticlassData(
      makeStats({ classes: noPrimary, hitDicePools: { ...emptyPools(), d6: { current: 5, total: 5 } } })
    );
    expect(resultNone.errors).toContain('Expected exactly 1 primary class, found 0');

    const twoPrimary: ClassInfo[] = [
      { name: '法師', level: 3, hitDie: 'd6', isPrimary: true },
      { name: '戰士', level: 2, hitDie: 'd10', isPrimary: true },
    ];
    const resultTwo = validateMulticlassData(
      makeStats({
        classes: twoPrimary,
        hitDicePools: { ...emptyPools(), d6: { current: 3, total: 3 }, d10: { current: 2, total: 2 } },
      })
    );
    expect(resultTwo.errors).toContain('Expected exactly 1 primary class, found 2');
  });

  it('職業等級加總與角色總等級不一致時回報錯誤', () => {
    const classes: ClassInfo[] = [{ name: '法師', level: 5, hitDie: 'd6', isPrimary: true }];
    const result = validateMulticlassData(
      makeStats({
        level: 10,
        classes,
        hitDicePools: { ...emptyPools(), d6: { current: 5, total: 5 } },
      })
    );
    expect(result.errors).toContain('Total class levels (5) don\'t match character level (10)');
  });

  it('hitDicePools 總量與職業實際應有的生命骰總量不符時回報錯誤', () => {
    const classes: ClassInfo[] = [{ name: '法師', level: 5, hitDie: 'd6', isPrimary: true }];
    const result = validateMulticlassData(
      makeStats({
        level: 5,
        classes,
        hitDicePools: { ...emptyPools(), d6: { current: 5, total: 99 } },
      })
    );
    expect(result.errors.some((e) => e.includes('Hit dice total mismatch for d6'))).toBe(true);
  });

  it('完全合法的多職業資料應該回傳 isValid: true 且沒有任何錯誤', () => {
    const classes: ClassInfo[] = [
      { name: '法師', level: 3, hitDie: 'd6', isPrimary: true },
      { name: '戰士', level: 2, hitDie: 'd10', isPrimary: false },
    ];
    const result = validateMulticlassData(
      makeStats({
        level: 5,
        classes,
        hitDicePools: { ...emptyPools(), d6: { current: 3, total: 3 }, d10: { current: 2, total: 2 } },
      })
    );
    expect(result).toEqual({ isValid: true, errors: [] });
  });
});

describe('ensureDisplayClass', () => {
  it('沒有 classes 時原樣回傳', () => {
    const stats = makeStats({ classes: undefined });
    expect(ensureDisplayClass(stats)).toBe(stats);
  });

  it('classes 為空陣列時原樣回傳', () => {
    const stats = makeStats({ classes: [] });
    expect(ensureDisplayClass(stats)).toBe(stats);
  });

  it('有 isPrimary 標記的職業時，以該職業作為顯示用 class，並把等級改成所有職業總和', () => {
    const classes: ClassInfo[] = [
      { name: '法師', level: 3, hitDie: 'd6', isPrimary: false },
      { name: '戰士', level: 2, hitDie: 'd10', isPrimary: true },
    ];
    const result = ensureDisplayClass(makeStats({ class: '???', level: 999, classes }));

    expect(result.class).toBe('戰士');
    expect(result.level).toBe(5);
  });

  it('沒有任何職業標記 isPrimary 時，退而使用陣列中第一個職業', () => {
    const classes: ClassInfo[] = [
      { name: '法師', level: 4, hitDie: 'd6', isPrimary: false },
      { name: '戰士', level: 1, hitDie: 'd10', isPrimary: false },
    ];
    const result = ensureDisplayClass(makeStats({ classes }));

    expect(result.class).toBe('法師');
    expect(result.level).toBe(5);
  });
});
