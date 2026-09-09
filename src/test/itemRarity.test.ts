/**
 * utils/itemRarity - 稀有度徽章顯示邏輯
 * MH素材：稀有度是來源怪物的 CR（數字），顯示純數字徽章，不上色
 * 其他類別：稀有度是 D&D 標準 6 級文字，依固定配色顯示；非標準文字則退回灰底顯示原文字
 */
import { describe, it, expect } from 'vitest';
import { getRarityBadge, RARITY_TIERS } from '../../utils/itemRarity';

describe('getRarityBadge', () => {
  it('rarity 為 null 時不顯示徽章', () => {
    expect(getRarityBadge('裝備', null)).toBeNull();
  });

  it('rarity 為空字串時不顯示徽章', () => {
    expect(getRarityBadge('裝備', '')).toBeNull();
  });

  it('MH素材：顯示「CR {數字}」，不套用配色 class', () => {
    const badge = getRarityBadge('MH素材', '35');
    expect(badge).not.toBeNull();
    expect(badge!.label).toBe('CR 35');
  });

  it('MH素材：數字沒有範圍限制，超過100也正常顯示', () => {
    const badge = getRarityBadge('MH素材', '250');
    expect(badge!.label).toBe('CR 250');
  });

  for (const tier of RARITY_TIERS) {
    it(`一般類別：標準稀有度「${tier}」有專屬配色`, () => {
      const badge = getRarityBadge('裝備', tier);
      expect(badge).not.toBeNull();
      expect(badge!.label).toBe(tier);
      expect(badge!.className).toEqual(expect.any(String));
      expect(badge!.className.length).toBeGreaterThan(0);
    });
  }

  it('一般類別：不同稀有度的配色彼此不同', () => {
    const classes = new Set(RARITY_TIERS.map((tier) => getRarityBadge('雜項', tier)!.className));
    expect(classes.size).toBe(RARITY_TIERS.length);
  });

  it('一般類別：非標準文字時仍顯示徽章，退回中性樣式', () => {
    const badge = getRarityBadge('裝備', '未知等級');
    expect(badge).not.toBeNull();
    expect(badge!.label).toBe('未知等級');
  });
});
