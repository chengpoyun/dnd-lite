import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CharacterSheet } from '../../components/CharacterSheet';
import type { CharacterStats } from '../../types';

/**
 * 迴歸測試：豁免/技能詳細彈窗（點開角色頁的體質/運動等卡片）沒有顯示能力/物品賦予的熟練/專精。
 *
 * 實際案例：能力「適應力（體質）」賦予體質豁免熟練，角色頁外層卡片正確顯示「+4」（含熟練加值），
 * 但點開詳細彈窗後「最終豁免」仍是「+0」——因為彈窗的 saveBonusSources/skillBonusSources
 * 只讀角色本身的 savingProficiencies/proficiencies，沒有讀 statBonusSources 裡由能力/物品賦予的熟練。
 *
 * 設計取捨：彈窗裡的「無/熟練」切換只代表「角色自己的熟練」（職業/背景給的），刻意不因為
 * 能力/物品賦予熟練就自動打勾——否則使用者若沒動切換直接按「儲存」，會把「來源賦予的熟練」
 * 誤存成角色自己永久擁有的熟練（之後能力被移除，角色也不會跟著失去）。
 * 因此正確行為是：切換維持「無」，但「最終豁免」透過加值來源列表額外補上這筆熟練加值。
 */

const mockStatsWithSaveGrant: CharacterStats = {
  name: '測試角色',
  class: '法師',
  level: 5,
  exp: 0,
  hp: { current: 30, max: 30, temp: 0 },
  hitDice: { current: 5, total: 5, die: 'd6' },
  ac: 14,
  initiative: 1,
  speed: 30,
  abilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  proficiencies: {},
  savingProficiencies: [],
  downtime: 0,
  renown: { used: 0, total: 0 },
  attacks: [],
  currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
  customRecords: [],
  extraData: {
    abilityBonuses: {},
    modifierBonuses: {},
    statBonusSources: [
      { id: 'a1', type: 'ability', name: '適應力（體質）', savingThrowProficiency: ['con'] },
    ],
  },
} as unknown as CharacterStats;

const mockStatsWithSkillGrant: CharacterStats = {
  ...mockStatsWithSaveGrant,
  extraData: {
    abilityBonuses: {},
    modifierBonuses: {},
    statBonusSources: [
      { id: 'a1', type: 'ability', name: '運動大師', skillProficiency: { '運動': 2 } },
    ],
  },
} as unknown as CharacterStats;

const defaultProps = {
  setStats: vi.fn(),
  onSaveCurrencyAndExp: vi.fn().mockResolvedValue(true),
  onSaveExtraData: vi.fn().mockResolvedValue(true),
  onSaveCharacterBasicInfo: vi.fn().mockResolvedValue(true),
  onSaveAbilityScores: vi.fn().mockResolvedValue(true),
  onSaveSavingThrowProficiencies: vi.fn().mockResolvedValue(true),
  onSaveSkillProficiency: vi.fn().mockResolvedValue(true),
};

describe('豁免詳細彈窗 - 能力/物品賦予的熟練', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('「無/熟練」切換維持顯示「無」（不因來源賦予熟練就誤存成角色自己的熟練）', async () => {
    render(<CharacterSheet {...defaultProps} stats={mockStatsWithSaveGrant} />);
    fireEvent.click(screen.getByText('體質'));
    await waitFor(() => expect(screen.getByText('最終豁免')).toBeInTheDocument());

    const noneToggle = screen.getByText('無');
    expect(noneToggle.className).toContain('bg-slate-800');
  });

  it('「最終豁免」應包含熟練加值（不是 +0）', async () => {
    render(<CharacterSheet {...defaultProps} stats={mockStatsWithSaveGrant} />);
    fireEvent.click(screen.getByText('體質'));
    await waitFor(() => expect(screen.getByText('最終豁免')).toBeInTheDocument());

    const row = screen.getByText('最終豁免').closest('div') as HTMLElement;
    expect(row.textContent).toContain('+3'); // mod 0 + profBonus(lvl5)=3
  });

  it('加值來源列表應列出賦予熟練的能力名稱', async () => {
    render(<CharacterSheet {...defaultProps} stats={mockStatsWithSaveGrant} />);
    fireEvent.click(screen.getByText('體質'));
    await waitFor(() => expect(screen.getByText('最終豁免')).toBeInTheDocument());

    expect(screen.getByText(/適應力（體質）/)).toBeInTheDocument();
  });
});

describe('技能詳細彈窗 - 能力/物品賦予的熟練/專精', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('最終技能加值應包含專精加值（不是 +0）', async () => {
    render(<CharacterSheet {...defaultProps} stats={mockStatsWithSkillGrant} />);
    fireEvent.click(screen.getByText('運動'));
    await waitFor(() => expect(screen.getByText('最終總計')).toBeInTheDocument());

    // str mod 0（own 未熟練）+ 來源賦予專精(2) * profBonus(lvl5=3) = 6
    const row = screen.getByText('最終總計').closest('div') as HTMLElement;
    expect(row.textContent).toContain('+6');
  });

  it('加值來源列表應列出賦予專精的能力名稱', async () => {
    render(<CharacterSheet {...defaultProps} stats={mockStatsWithSkillGrant} />);
    fireEvent.click(screen.getByText('運動'));
    await waitFor(() => {
      expect(screen.getByText(/運動大師/)).toBeInTheDocument();
    });
  });
});
