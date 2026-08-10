import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { CharacterSheet } from '../../components/CharacterSheet';
import { getFinalAbilityScore, getFinalAbilityModifier } from '../../utils/characterAttributes';
import type { CharacterStats } from '../../types';

/**
 * 迴歸測試：屬性詳細彈窗把「只加調整值」的來源誤算進「能力值」。
 *
 * 實際案例：道具「力量證明」只有 `abilityModifiers: { str: 1 }`，沒有 `abilityScores`。
 * 角色頁用 getFinalAbilityScore 算得正確（19），但詳細彈窗把力量證明的 +1
 * 也當成能力值加值，最終屬性值變 20，連帶把基礎調整值墊高成 getModifier(20)。
 *
 * 規則：能力值加值只能來自 `abilityScores`；`abilityModifiers` 只屬於調整值。
 */

// 基礎力量 6、食人魔力量手套把力量墊到 19（聚合後存成 +13 的 abilityScores）、
// 力量證明只加調整值 +1。這組數字直接取自實際重現此 bug 的角色。
const mockStats: CharacterStats = {
  name: '測試角色',
  class: '法師',
  level: 10,
  exp: 0,
  hp: { current: 72, max: 72, temp: 0 },
  hitDice: { current: 10, total: 10, die: 'd6' },
  ac: 19,
  initiative: 7,
  speed: 35,
  abilityScores: { str: 6, dex: 12, con: 8, int: 14, wis: 10, cha: 16 },
  proficiencies: {},
  savingProficiencies: ['str'],
  downtime: 0,
  renown: { used: 0, total: 0 },
  prestige: { org: '', level: 0, rankName: '' },
  attacks: [],
  currency: { cp: 0, sp: 0, ep: 0, gp: 150, pp: 0 },
  avatarUrl: undefined,
  customRecords: [],
  extraData: {
    abilityBonuses: { str: 13, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
    modifierBonuses: { str: 1, dex: 1, con: 1, int: 0, wis: 0, cha: 0 },
    statBonusSources: [
      { id: 'i1', type: 'item', name: '力量證明', abilityModifiers: { str: 1, dex: 1, con: 1 } },
      { id: 'i2', type: 'item', name: '食人魔力量手套', abilityScores: { str: 13 } },
    ],
  },
} as unknown as CharacterStats;

const openStrengthModal = async () => {
  fireEvent.click(screen.getByText('力量'));
  await waitFor(() => {
    expect(screen.getByText('最終屬性值')).toBeInTheDocument();
  });
  return screen.getByText('最終屬性值').closest('div.fixed') as HTMLElement;
};

describe('屬性詳細彈窗 - 能力值與調整值不可混算', () => {
  const defaultProps = {
    stats: mockStats,
    setStats: vi.fn(),
    onSaveCurrencyAndExp: vi.fn().mockResolvedValue(true),
    onSaveExtraData: vi.fn().mockResolvedValue(true),
    onSaveCharacterBasicInfo: vi.fn().mockResolvedValue(true),
    onSaveAbilityScores: vi.fn().mockResolvedValue(true),
    onSaveSavingThrowProficiencies: vi.fn().mockResolvedValue(true),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('最終屬性值應與角色頁一致（不可把只加調整值的來源算進去）', async () => {
    render(<CharacterSheet {...defaultProps} />);
    await openStrengthModal();

    // 角色頁的權威值：6 + 13 = 19
    expect(getFinalAbilityScore(mockStats, 'str')).toBe(19);

    const row = screen.getByText('最終屬性值').closest('div') as HTMLElement;
    expect(row.textContent).toContain('19');
    expect(row.textContent).not.toContain('20');
  });

  it('「能力值」區塊不應列出只加調整值的來源', async () => {
    render(<CharacterSheet {...defaultProps} />);
    const modal = await openStrengthModal();

    // 力量證明只有 abilityModifiers，應只出現在調整值區塊（1 次），不該出現在能力值區塊
    expect(within(modal).getAllByText('力量證明')).toHaveLength(1);
    // 食人魔力量手套有 abilityScores，應該要在
    expect(within(modal).getAllByText('食人魔力量手套')).toHaveLength(1);
  });

  it('最終調整值應與角色頁一致', async () => {
    render(<CharacterSheet {...defaultProps} />);
    await openStrengthModal();

    // getModifier(19) = +4，再加 modifierBonuses.str = 1 → +5
    expect(getFinalAbilityModifier(mockStats, 'str')).toBe(5);

    const row = screen.getByText('最終調整值').closest('div') as HTMLElement;
    expect(row.textContent).toContain('+5');
  });

  it('沒有任何加值來源的屬性不受影響', async () => {
    render(<CharacterSheet {...defaultProps} />);
    fireEvent.click(screen.getByText('智力'));
    await waitFor(() => {
      expect(screen.getByText('最終屬性值')).toBeInTheDocument();
    });

    expect(getFinalAbilityScore(mockStats, 'int')).toBe(14);
    const row = screen.getByText('最終屬性值').closest('div') as HTMLElement;
    expect(row.textContent).toContain('14');
  });
});
