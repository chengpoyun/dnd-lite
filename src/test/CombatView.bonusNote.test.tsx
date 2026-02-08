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

describe('CombatView - 戰鬥筆記功能測試', () => {
  const mockCombatItems = [
    { id: 'r1', character_id: 'test-id', category: 'resource', name: '法術位', icon: '✨', current_uses: 2, max_uses: 3, recovery_type: 'long_rest', is_default: false, is_custom: false, default_item_id: null },
    { id: 'a1', character_id: 'test-id', category: 'action', name: '攻擊', icon: '⚔️', current_uses: 1, max_uses: 1, recovery_type: 'turn', is_default: true, is_custom: false, default_item_id: 'attack' },
  ];

  const baseStats: CharacterStats = {
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

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    localStorageMock.setItem('current_character_id', 'test-character-123');
    mockHybridDataManager.getCombatItems.mockResolvedValue(mockCombatItems);
  });

  const defaultProps = {
    stats: baseStats,
    setStats: vi.fn(),
    characterId: 'test-character-123',
    onSaveHP: vi.fn().mockResolvedValue(true),
    onSaveAC: vi.fn().mockResolvedValue(true),
    onSaveInitiative: vi.fn().mockResolvedValue(true)
  };

  it('在武器命中值下方、加值表上方應可直接看見筆記區', async () => {
    const onSaveCombatNotes = vi.fn().mockResolvedValue(true);
    render(<CombatView {...defaultProps} onSaveCombatNotes={onSaveCombatNotes} />);

    await waitFor(() => {
      expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('攻擊命中')).toBeInTheDocument();
    expect(screen.getByText(/屬性豁免與技能加值/)).toBeInTheDocument();
    expect(screen.getByText('筆記')).toBeInTheDocument();
  });

  it('點擊筆記區可開啟 CombatNoteModal（標題為戰鬥筆記）', async () => {
    const onSaveCombatNotes = vi.fn().mockResolvedValue(true);
    render(<CombatView {...defaultProps} onSaveCombatNotes={onSaveCombatNotes} />);

    await waitFor(() => {
      expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
    });

    const noteButton = screen.getAllByRole('button').find(b => b.textContent?.includes('筆記') && b.textContent?.includes('點擊新增筆記'))!;
    fireEvent.click(noteButton);

    await waitFor(() => {
      expect(screen.getByText('戰鬥筆記')).toBeInTheDocument();
    });
  });

  it('Modal 內可輸入內容、儲存後筆記區顯示剛儲存的內容', async () => {
    const setStats = vi.fn();
    const onSaveCombatNotes = vi.fn().mockResolvedValue(true);
    render(<CombatView {...defaultProps} stats={baseStats} setStats={setStats} onSaveCombatNotes={onSaveCombatNotes} />);

    await waitFor(() => {
      expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
    });

    const noteButton = screen.getAllByRole('button').find(b => b.textContent?.includes('筆記') && b.textContent?.includes('點擊新增筆記'))!;
    fireEvent.click(noteButton);

    await waitFor(() => {
      expect(screen.getByText('戰鬥筆記')).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText(/點擊新增筆記/);
    fireEvent.change(textarea, { target: { value: '我的戰鬥筆記' } });

    const saveButton = screen.getByText('儲存');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(onSaveCombatNotes).toHaveBeenCalledWith('我的戰鬥筆記');
      expect(screen.queryByText('戰鬥筆記')).not.toBeInTheDocument();
    });
  });

  it('stats.combatNotes 為 undefined 時應不崩潰', async () => {
    const statsNoNotes = { ...baseStats, combatNotes: undefined };
    const onSaveCombatNotes = vi.fn().mockResolvedValue(true);

    expect(() => {
      render(<CombatView {...defaultProps} stats={statsNoNotes} onSaveCombatNotes={onSaveCombatNotes} />);
    }).not.toThrow();

    await waitFor(() => {
      expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
    });
  });

  it('有筆記時應顯示筆記內容', async () => {
    const statsWithNote = { ...baseStats, combatNotes: '已有筆記' };
    const onSaveCombatNotes = vi.fn().mockResolvedValue(true);
    render(<CombatView {...defaultProps} stats={statsWithNote} onSaveCombatNotes={onSaveCombatNotes} />);

    await waitFor(() => {
      expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('已有筆記')).toBeInTheDocument();
  });

  it('Modal 內可刪除筆記，儲存後筆記區回到空狀態', async () => {
    const setStats = vi.fn();
    const statsWithNote = { ...baseStats, combatNotes: '待刪除筆記' };
    const onSaveCombatNotes = vi.fn().mockResolvedValue(true);
    render(<CombatView {...defaultProps} stats={statsWithNote} setStats={setStats} onSaveCombatNotes={onSaveCombatNotes} />);

    await waitFor(() => {
      expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
    });

    const noteButton = screen.getAllByRole('button').find(b => b.textContent?.includes('待刪除筆記'))!;
    fireEvent.click(noteButton);

    await waitFor(() => {
      expect(screen.getByText('戰鬥筆記')).toBeInTheDocument();
    });

    const deleteButton = screen.getByText('刪除');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(onSaveCombatNotes).toHaveBeenCalledWith(null);
    });
  });
});
