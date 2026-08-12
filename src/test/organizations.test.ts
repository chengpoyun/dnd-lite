import { describe, it, expect } from 'vitest';
import {
  ORGANIZATIONS,
  getOrganizationDef,
  getOrgRank,
  getOrgMultiplier,
  getGatherMultiplier,
  getNextThreshold,
} from '../../utils/organizations';
import type { CharacterStats } from '../../types';

/**
 * 組織系統的核心計算。
 *
 * 階級 = 聲望達到或超過的門檻個數。倍數一般組織為 2^(階級-1)、塔龍協會為 2^階級，
 * 但**階級 0 一律 ×1**（否則 2^(0-1) 會算出 0.5）。加入多個組織時取倍數最高者。
 */

const statsWith = (orgs: Array<{ id: string; reputation: number }>) =>
  ({ organizations: orgs } as unknown as CharacterStats);

describe('組織定義', () => {
  it('五個組織的門檻與倍數模式與規格一致', () => {
    expect(ORGANIZATIONS.map((o) => [o.id, o.thresholds.length, o.multiplierMode])).toEqual([
      ['hunters-guild', 4, 'standard'],
      ['royal-paleontology', 7, 'standard'],
      ['talon-society', 3, 'talon'],
      ['wikadmi-academy', 5, 'standard'],
      ['spiral-council', 5, 'standard'],
    ]);
  });

  it('門檻必須嚴格遞增（階級判定才有意義）', () => {
    for (const org of ORGANIZATIONS) {
      const sorted = [...org.thresholds].sort((a, b) => a - b);
      expect(org.thresholds).toEqual(sorted);
      expect(new Set(org.thresholds).size).toBe(org.thresholds.length);
    }
  });

  it('getOrganizationDef 查得到、查不到回 undefined', () => {
    expect(getOrganizationDef('hunters-guild')?.name).toBe('獵人公會');
    expect(getOrganizationDef('not-exist')).toBeUndefined();
  });
});

describe('getOrgRank — 聲望轉階級', () => {
  const guild = getOrganizationDef('hunters-guild')!; // [1,10,25,50]

  it('使用者給的例子：0→0、1~9→1、10~24→2', () => {
    expect(getOrgRank(0, guild)).toBe(0);
    expect(getOrgRank(1, guild)).toBe(1);
    expect(getOrgRank(9, guild)).toBe(1);
    expect(getOrgRank(10, guild)).toBe(2);
    expect(getOrgRank(24, guild)).toBe(2);
    expect(getOrgRank(25, guild)).toBe(3);
    expect(getOrgRank(50, guild)).toBe(4);
  });

  it('聲望沒有上限，超過最高門檻停在最高階級', () => {
    expect(getOrgRank(999, guild)).toBe(4);
  });

  it('負數聲望視為 0 階', () => {
    expect(getOrgRank(-5, guild)).toBe(0);
  });
});

describe('getOrgMultiplier — 階級轉倍數', () => {
  const guild = getOrganizationDef('hunters-guild')!;
  const talon = getOrganizationDef('talon-society')!;

  it('一般組織：階級 0 為 ×1，之後 2^(n-1)', () => {
    expect(getOrgMultiplier(0, guild)).toBe(1);
    expect(getOrgMultiplier(1, guild)).toBe(1);
    expect(getOrgMultiplier(2, guild)).toBe(2);
    expect(getOrgMultiplier(3, guild)).toBe(4);
    expect(getOrgMultiplier(4, guild)).toBe(8);
  });

  it('階級 0 絕不可算出 0.5', () => {
    for (const org of ORGANIZATIONS) {
      expect(getOrgMultiplier(0, org)).toBe(1);
    }
  });

  it('塔龍協會用 2^n，階級 1 就 ×2', () => {
    expect(getOrgMultiplier(0, talon)).toBe(1);
    expect(getOrgMultiplier(1, talon)).toBe(2);
    expect(getOrgMultiplier(2, talon)).toBe(4);
    expect(getOrgMultiplier(3, talon)).toBe(8);
  });

  it('使用者的例子：獵人公會階級 3 → 蜂蜜 1 個變 4 個', () => {
    expect(getOrgMultiplier(3, guild)).toBe(4);
  });
});

describe('getGatherMultiplier — 角色的採集倍數', () => {
  it('沒有 organizations 欄位時為 1', () => {
    expect(getGatherMultiplier({} as CharacterStats)).toBe(1);
  });

  it('沒加入任何組織時為 1', () => {
    expect(getGatherMultiplier(statsWith([]))).toBe(1);
  });

  it('單一組織就用它的倍數', () => {
    expect(getGatherMultiplier(statsWith([{ id: 'hunters-guild', reputation: 32 }]))).toBe(4);
  });

  it('多個組織取最高（獵人公會階級3 ×4 vs 塔龍協會階級1 ×2）', () => {
    const stats = statsWith([
      { id: 'hunters-guild', reputation: 32 },
      { id: 'talon-society', reputation: 6 },
    ]);
    expect(getGatherMultiplier(stats)).toBe(4);
  });

  it('塔龍協會階級 2（×4）可以贏過獵人公會階級 2（×2）', () => {
    const stats = statsWith([
      { id: 'hunters-guild', reputation: 10 },
      { id: 'talon-society', reputation: 10 },
    ]);
    expect(getGatherMultiplier(stats)).toBe(4);
  });

  it('加入了但聲望 0 的組織不會把倍數拉低到 0.5', () => {
    expect(getGatherMultiplier(statsWith([{ id: 'hunters-guild', reputation: 0 }]))).toBe(1);
  });

  it('未知的組織 id 會被忽略，不影響其他組織', () => {
    const stats = statsWith([
      { id: 'not-exist', reputation: 999 },
      { id: 'hunters-guild', reputation: 32 },
    ]);
    expect(getGatherMultiplier(stats)).toBe(4);
  });
});

describe('getNextThreshold — 下一階還差多少', () => {
  const guild = getOrganizationDef('hunters-guild')!;

  it('回傳下一個門檻值', () => {
    expect(getNextThreshold(0, guild)).toBe(1);
    expect(getNextThreshold(32, guild)).toBe(50);
  });

  it('已達最高階級時回傳 null', () => {
    expect(getNextThreshold(50, guild)).toBeNull();
    expect(getNextThreshold(999, guild)).toBeNull();
  });
});
