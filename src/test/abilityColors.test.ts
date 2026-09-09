import { describe, it, expect } from 'vitest';
import { getAbilitySourceBadgeClass, getAbilityRecoveryBadgeClass } from '../../utils/abilityColors';
import { ABILITY_SOURCE_ORDER } from '../../services/abilityService';

describe('getAbilitySourceBadgeClass', () => {
  it('每個官方來源（含「裝備」）都回傳非空 className，不會漏掉任何一個', () => {
    for (const source of ABILITY_SOURCE_ORDER) {
      const cls = getAbilitySourceBadgeClass(source);
      expect(cls).toBeTruthy();
      expect(cls).not.toContain('undefined');
    }
  });

  it('「裝備」回傳的 className 含 indigo 色系', () => {
    expect(getAbilitySourceBadgeClass('裝備')).toContain('indigo');
  });

  it('未知來源時退回「其他」的樣式，不會是 undefined', () => {
    const cls = getAbilitySourceBadgeClass('不存在的來源');
    expect(cls).toBeTruthy();
    expect(cls).not.toContain('undefined');
  });

  it('bordered 樣式含 border 與 900/30 背景，pill 樣式（預設）不含 border', () => {
    const pill = getAbilitySourceBadgeClass('職業');
    const bordered = getAbilitySourceBadgeClass('職業', 'bordered');
    expect(pill).not.toContain('border-');
    expect(bordered).toContain('border-blue-700');
    expect(bordered).toContain('bg-blue-900/30');
  });
});

describe('getAbilityRecoveryBadgeClass', () => {
  it('每個恢復規則都回傳非空 className', () => {
    for (const type of ['常駐', '短休', '長休'] as const) {
      const cls = getAbilityRecoveryBadgeClass(type);
      expect(cls).toBeTruthy();
      expect(cls).not.toContain('undefined');
    }
  });

  it('未知恢復規則時退回「常駐」的樣式', () => {
    const cls = getAbilityRecoveryBadgeClass('不存在');
    expect(cls).toBe(getAbilityRecoveryBadgeClass('常駐'));
  });

  it('bordered 樣式含 border', () => {
    expect(getAbilityRecoveryBadgeClass('短休', 'bordered')).toContain('border-cyan-700');
  });
});
