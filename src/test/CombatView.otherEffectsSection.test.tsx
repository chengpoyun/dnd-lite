/**
 * CombatView - 「其他效果」獨立為自己的可收合區塊：
 * 位於筆記下方、屬性豁免/技能加值表上方，預設展開，可點標題收合/展開；
 * 原本的加值表標題改回「屬性豁免、技能加值」，內部不再重複顯示其他效果
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CombatView } from '../../components/CombatView';
import { HybridDataManager } from '../../services/hybridDataManager';
import type { CharacterStats } from '../../types';

vi.mock('../../services/hybridDataManager');
vi.mock('../../services/migration');

const mockHybridDataManager = vi.mocked(HybridDataManager);

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    clear: () => { store = {}; }
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

function buildStats(overrides: Partial<CharacterStats> = {}): CharacterStats {
  return {
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
    customRecords: [],
    ...overrides,
  } as CharacterStats;
}

const statsWithOther = () =>
  buildStats({
    extraData: {
      statBonusSources: [
        { id: 'a', type: 'item', name: '燃燒箭矢', other: '命中後燃燒，持續3輪' },
        { id: 'b', type: 'ability', name: '狂戰士之怒', other: '無法施法' },
      ],
    } as any,
  });

describe('CombatView - 其他效果獨立可收合區塊', () => {
  const defaultProps = {
    stats: {} as CharacterStats,
    setStats: vi.fn(),
    characterId: 'test-character-123',
    onSaveHP: vi.fn().mockResolvedValue(true),
    onSaveAC: vi.fn().mockResolvedValue(true),
    onSaveInitiative: vi.fn().mockResolvedValue(true),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    localStorageMock.setItem('current_character_id', 'test-character-123');
    mockHybridDataManager.getCombatItems.mockResolvedValue([]);
  });

  it('有其他效果時，獨立區塊預設展開：不需展開加值表就能看到各條目', async () => {
    render(<CombatView {...defaultProps} stats={statsWithOther()} />);
    await waitFor(() => {
      expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('其他效果')).toBeInTheDocument();
    expect(screen.getByText(/燃燒箭矢/)).toBeInTheDocument();
    expect(screen.getByText(/命中後燃燒，持續3輪/)).toBeInTheDocument();
    expect(screen.getByText(/狂戰士之怒/)).toBeInTheDocument();
  });

  it('點擊「其他效果」標題可收合，再點一次重新展開', async () => {
    render(<CombatView {...defaultProps} stats={statsWithOther()} />);
    await waitFor(() => {
      expect(screen.getByText('其他效果')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('其他效果'));
    await waitFor(() => {
      expect(screen.queryByText(/命中後燃燒，持續3輪/)).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('其他效果'));
    await waitFor(() => {
      expect(screen.getByText(/命中後燃燒，持續3輪/)).toBeInTheDocument();
    });
  });

  it('加值表標題改回「屬性豁免、技能加值」，展開後內部不再重複顯示其他效果', async () => {
    render(<CombatView {...defaultProps} stats={statsWithOther()} />);
    await waitFor(() => {
      expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('屬性豁免、技能加值')).toBeInTheDocument();
    expect(screen.queryByText('屬性豁免、技能加值、其他效果')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('屬性豁免、技能加值'));
    await waitFor(() => {
      expect(screen.getByText('力量豁免')).toBeInTheDocument();
    });
    // 「其他效果」標題與條目全頁各只出現一次（獨立區塊），加值表內沒有重複
    expect(screen.getAllByText('其他效果')).toHaveLength(1);
    expect(screen.getAllByText(/命中後燃燒，持續3輪/)).toHaveLength(1);
  });

  it('獨立區塊位於加值表上方（DOM 順序在「屬性豁免、技能加值」標題之前）', async () => {
    render(<CombatView {...defaultProps} stats={statsWithOther()} />);
    await waitFor(() => {
      expect(screen.getByText('其他效果')).toBeInTheDocument();
    });

    const otherHeader = screen.getByText('其他效果');
    const bonusHeader = screen.getByText('屬性豁免、技能加值');
    expect(
      otherHeader.compareDocumentPosition(bonusHeader) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('沒有任何其他效果時，整個獨立區塊不顯示', async () => {
    render(<CombatView {...defaultProps} stats={buildStats()} />);
    await waitFor(() => {
      expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
    });

    expect(screen.queryByText('其他效果')).not.toBeInTheDocument();
  });
});
