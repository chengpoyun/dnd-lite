import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CombatView } from '../../components/CombatView';
import { HybridDataManager } from '../../services/hybridDataManager';
import type { CharacterStats } from '../../types';

// Mock external dependencies
vi.mock('../../services/hybridDataManager');
vi.mock('../../services/migration');

const mockHybridDataManager = vi.mocked(HybridDataManager);

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    clear: () => { store = {}; }
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('CombatView - 加值表功能測試', () => {
  const mockCombatItems = [
    { id: 'r1', character_id: 'test-id', category: 'resource', name: '法術位', icon: '✨', current_uses: 2, max_uses: 3, recovery_type: 'long_rest', is_default: false, is_custom: false, default_item_id: null },
    { id: 'a1', character_id: 'test-id', category: 'action', name: '攻擊', icon: '⚔️', current_uses: 1, max_uses: 1, recovery_type: 'turn', is_default: true, is_custom: false, default_item_id: 'attack' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    localStorageMock.setItem('current_character_id', 'test-character-123');
    mockHybridDataManager.getCombatItems.mockResolvedValue(mockCombatItems);
  });

  const defaultProps = {
    stats: {} as CharacterStats,
    setStats: vi.fn(),
    characterId: 'test-character-123',
    onSaveHP: vi.fn().mockResolvedValue(true),
    onSaveAC: vi.fn().mockResolvedValue(true),
    onSaveInitiative: vi.fn().mockResolvedValue(true)
  };

  it('應該顯示加值表標題', async () => {
    const statsWithBonus: CharacterStats = {
      name: 'Test',
      class: '戰士',
      level: 5,
      exp: 0,
      hp: { current: 30, max: 30, temp: 0 },
      hitDice: { current: 5, total: 5, die: 'd10' },
      ac: 16,
      initiative: 3,
      speed: 30,
      abilityScores: { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 },
      proficiencies: {},
      savingProficiencies: [],
      downtime: 0,
      renown: { used: 0, total: 0 },
      prestige: { org: '', level: 0, rankName: '' },
      attacks: [],
      currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
      customRecords: []
    };

    render(<CombatView {...defaultProps} stats={statsWithBonus} />);

    await waitFor(() => {
      expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
    });

    expect(screen.getByText(/屬性豁免與技能加值/)).toBeInTheDocument();
  });

  it('預設應為收合狀態，點擊標題後展開', async () => {
    const statsWithBonus: CharacterStats = {
      name: 'Test',
      class: '戰士',
      level: 5,
      exp: 0,
      hp: { current: 30, max: 30, temp: 0 },
      hitDice: { current: 5, total: 5, die: 'd10' },
      ac: 16,
      initiative: 3,
      speed: 30,
      abilityScores: { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 },
      proficiencies: {},
      savingProficiencies: [],
      downtime: 0,
      renown: { used: 0, total: 0 },
      prestige: { org: '', level: 0, rankName: '' },
      attacks: [],
      currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
      customRecords: []
    };

    render(<CombatView {...defaultProps} stats={statsWithBonus} />);

    await waitFor(() => {
      expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
    });

    // 預設收合：力量豁免應不在畫面上（或不可見）
    const titleButton = screen.getByText(/屬性豁免與技能加值/);
    expect(titleButton).toBeInTheDocument();

    fireEvent.click(titleButton);

    await waitFor(() => {
      expect(screen.getByText('力量豁免')).toBeInTheDocument();
    });
  });

  it('展開後應顯示 6 種屬性豁免', async () => {
    const statsWithBonus: CharacterStats = {
      name: 'Test',
      class: '戰士',
      level: 5,
      exp: 0,
      hp: { current: 30, max: 30, temp: 0 },
      hitDice: { current: 5, total: 5, die: 'd10' },
      ac: 16,
      initiative: 3,
      speed: 30,
      abilityScores: { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 },
      proficiencies: {},
      savingProficiencies: [],
      downtime: 0,
      renown: { used: 0, total: 0 },
      prestige: { org: '', level: 0, rankName: '' },
      attacks: [],
      currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
      customRecords: []
    };

    render(<CombatView {...defaultProps} stats={statsWithBonus} />);

    await waitFor(() => {
      expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/屬性豁免與技能加值/));

    await waitFor(() => {
      expect(screen.getByText('力量豁免')).toBeInTheDocument();
      expect(screen.getByText('敏捷豁免')).toBeInTheDocument();
      expect(screen.getByText('體質豁免')).toBeInTheDocument();
      expect(screen.getByText('智力豁免')).toBeInTheDocument();
      expect(screen.getByText('感知豁免')).toBeInTheDocument();
      expect(screen.getByText('魅力豁免')).toBeInTheDocument();
    });
  });

  it('展開後應顯示 18 種技能', async () => {
    const skillNames = ['運動', '特技', '巧手', '隱匿', '奧秘', '歷史', '調查', '自然', '宗教', '馴獸', '觀察', '醫術', '察覺', '生存', '欺瞞', '威嚇', '表演', '說服'];

    const statsWithBonus: CharacterStats = {
      name: 'Test',
      class: '戰士',
      level: 5,
      exp: 0,
      hp: { current: 30, max: 30, temp: 0 },
      hitDice: { current: 5, total: 5, die: 'd10' },
      ac: 16,
      initiative: 3,
      speed: 30,
      abilityScores: { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 },
      proficiencies: {},
      savingProficiencies: [],
      downtime: 0,
      renown: { used: 0, total: 0 },
      prestige: { org: '', level: 0, rankName: '' },
      attacks: [],
      currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
      customRecords: []
    };

    render(<CombatView {...defaultProps} stats={statsWithBonus} />);

    await waitFor(() => {
      expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/屬性豁免與技能加值/));

    await waitFor(() => {
      skillNames.forEach(name => {
        expect(screen.getByText(name)).toBeInTheDocument();
      });
    });
  });

  it('給定 proficiencies 和 savingProficiencies 為 undefined 時應不崩潰', async () => {
    const statsMinimal: CharacterStats = {
      name: 'Test',
      class: '戰士',
      level: 5,
      exp: 0,
      hp: { current: 30, max: 30, temp: 0 },
      hitDice: { current: 5, total: 5, die: 'd10' },
      ac: 16,
      initiative: 3,
      speed: 30,
      abilityScores: { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 },
      proficiencies: {} as any,
      savingProficiencies: undefined as any,
      downtime: 0,
      renown: { used: 0, total: 0 },
      prestige: { org: '', level: 0, rankName: '' },
      attacks: [],
      currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
      customRecords: []
    };

    expect(() => {
      render(<CombatView {...defaultProps} stats={statsMinimal} />);
    }).not.toThrow();
  });

  it('給定 proficiencies 為 undefined 時應不崩潰', async () => {
    const statsNoProfs: CharacterStats = {
      name: 'Test',
      class: '戰士',
      level: 5,
      exp: 0,
      hp: { current: 30, max: 30, temp: 0 },
      hitDice: { current: 5, total: 5, die: 'd10' },
      ac: 16,
      initiative: 3,
      speed: 30,
      abilityScores: { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 },
      proficiencies: undefined as any,
      savingProficiencies: [],
      downtime: 0,
      renown: { used: 0, total: 0 },
      prestige: { org: '', level: 0, rankName: '' },
      attacks: [],
      currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
      customRecords: []
    };

    render(<CombatView {...defaultProps} stats={statsNoProfs} />);

    await waitFor(() => {
      expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/屬性豁免與技能加值/));

    await waitFor(() => {
      expect(screen.getByText('力量豁免')).toBeInTheDocument();
    });
  });

  it('給定 mock stats 時應顯示正確的加值', async () => {
    // str 16 -> mod +3, con 14 -> mod +2, savingProficiencies: ['str','con'] -> +profBonus(3) each
    // 力量豁免 = +3+3 = +6, 體質豁免 = +2+3 = +5
    // 運動 str 16, prof 1 -> +3 + 3 = +6
    const statsWithProfs: CharacterStats = {
      name: 'Test',
      class: '戰士',
      level: 5,
      exp: 0,
      hp: { current: 30, max: 30, temp: 0 },
      hitDice: { current: 5, total: 5, die: 'd10' },
      ac: 16,
      initiative: 3,
      speed: 30,
      abilityScores: { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 },
      proficiencies: { '運動': 1 },
      savingProficiencies: ['str', 'con'],
      downtime: 0,
      renown: { used: 0, total: 0 },
      prestige: { org: '', level: 0, rankName: '' },
      attacks: [],
      currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
      customRecords: []
    };

    render(<CombatView {...defaultProps} stats={statsWithProfs} />);

    await waitFor(() => {
      expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/屬性豁免與技能加值/));

    await waitFor(() => {
      expect(screen.getByText('力量豁免')).toBeInTheDocument();
      expect(screen.getByText('運動')).toBeInTheDocument();
      // 體質豁免 con 14 -> mod +2, proficient -> +2+3 = +5（此值在加值表中應唯一）
      expect(screen.getByText('+5')).toBeInTheDocument();
    });
  });

  it('再次點擊標題應收合', async () => {
    const statsWithBonus: CharacterStats = {
      name: 'Test',
      class: '戰士',
      level: 5,
      exp: 0,
      hp: { current: 30, max: 30, temp: 0 },
      hitDice: { current: 5, total: 5, die: 'd10' },
      ac: 16,
      initiative: 3,
      speed: 30,
      abilityScores: { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 },
      proficiencies: {},
      savingProficiencies: [],
      downtime: 0,
      renown: { used: 0, total: 0 },
      prestige: { org: '', level: 0, rankName: '' },
      attacks: [],
      currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
      customRecords: []
    };

    render(<CombatView {...defaultProps} stats={statsWithBonus} />);

    await waitFor(() => {
      expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
    });

    const titleButton = screen.getByText(/屬性豁免與技能加值/);
    fireEvent.click(titleButton);

    await waitFor(() => {
      expect(screen.getByText('力量豁免')).toBeInTheDocument();
    });

    fireEvent.click(titleButton);

    await waitFor(() => {
      expect(screen.queryByText('力量豁免')).not.toBeInTheDocument();
    });
  });
});
