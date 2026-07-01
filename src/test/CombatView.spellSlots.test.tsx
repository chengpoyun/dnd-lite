/**
 * CombatView - 法術位（全施法者職業資源）整合測試
 * 驗證：載入時觸發同步、消耗/編輯法術位時以正確的資料庫列 ID 寫回，
 * 且編輯 max 時換算為 max_uses_bonus 保存（basic 由等級自動計算，不應被覆蓋）。
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

describe('CombatView - 法術位', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  const mockStats = {
    hp: { current: 25, max: 30, temp: 0 },
    ac: 15,
    initiative: 3,
    speed: 30,
    class: '法師',
    level: 5,
    classes: [{ name: '法師', level: 5, hitDie: 'd6', isPrimary: true }],
    abilityScores: { str: 10, dex: 12, con: 14, int: 16, wis: 10, cha: 8 },
    hitDice: { current: 5, total: 5, die: 'd6' }
  } as unknown as CharacterStats;

  const defaultProps = {
    stats: mockStats,
    setStats: vi.fn(),
    characterId: 'char-1',
    onSaveHP: vi.fn().mockResolvedValue(true),
    onSaveAC: vi.fn().mockResolvedValue(true),
    onSaveInitiative: vi.fn().mockResolvedValue(true)
  };

  const spellSlotItem = {
    id: 'row-3ring',
    character_id: 'char-1',
    category: 'resource' as const,
    name: '3環法術位',
    icon: '🔮',
    current_uses: 2,
    max_uses: 2,
    max_uses_basic: 2,
    max_uses_bonus: 0,
    recovery_type: 'long_rest' as const,
    is_default: false,
    is_custom: false,
    default_item_id: 'tmpl-3',
  };

  it('尚未取得的環位（未被覆寫過的全域範本，max_uses=0）不應顯示卡片', async () => {
    // 未曾被同步覆寫過的範本項目，取自 default_combat_actions 全域範本，
    // 不會帶有 max_uses_basic 欄位（該欄位只存在於 character_combat_actions）
    const unlockedTemplateItem = {
      id: 'default_tmpl-9',
      character_id: 'char-1',
      category: 'resource' as const,
      name: '9環法術位',
      icon: '🔮',
      current_uses: 0,
      max_uses: 0,
      recovery_type: 'long_rest' as const,
      is_default: true,
      is_custom: false,
      default_item_id: 'tmpl-9',
    };
    mockHybridDataManager.getCombatItems.mockResolvedValue([spellSlotItem, unlockedTemplateItem]);

    render(<CombatView {...defaultProps} />);

    await waitFor(() => {
      expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('3環法術位')).toBeInTheDocument();
    expect(screen.queryByText('9環法術位')).not.toBeInTheDocument();
  });

  it('載入時應以合併施法者等級呼叫 syncSpellSlotResources', async () => {
    mockHybridDataManager.getCombatItems.mockResolvedValue([spellSlotItem]);

    render(<CombatView {...defaultProps} />);

    await waitFor(() => {
      expect(mockHybridDataManager.syncSpellSlotResources).toHaveBeenCalledWith('char-1', 5);
    });
  });

  it('消耗法術位時應以資料庫列 ID（非顯示用 id）寫回 current_uses', async () => {
    mockHybridDataManager.getCombatItems.mockResolvedValue([spellSlotItem]);

    render(<CombatView {...defaultProps} />);

    await waitFor(() => {
      expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
    });

    const item = screen.getByText('3環法術位').closest('button')!;
    fireEvent.click(item);

    await waitFor(() => {
      expect(mockHybridDataManager.updateCombatItem).toHaveBeenCalledWith(
        'row-3ring',
        expect.objectContaining({ current_uses: 1 })
      );
    });
  });

  it('編輯法術位上限時，應換算為 max_uses_bonus 並保留 basic', async () => {
    mockHybridDataManager.getCombatItems.mockResolvedValue([spellSlotItem]);

    render(<CombatView {...defaultProps} />);

    await waitFor(() => {
      expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
    });

    // 進入編輯模式，點擊法術位卡片開啟編輯彈窗
    fireEvent.click(screen.getByText('⚙️'));
    fireEvent.click(screen.getByText('3環法術位').closest('button')!);

    // 表單輸入順序：icon, name, current, max（無描述欄位，因為是預設關聯項目）
    const inputs = document.querySelectorAll('input');
    const maxInput = inputs[3];
    fireEvent.change(maxInput, { target: { value: '3' } });
    fireEvent.click(screen.getByText('儲存'));

    await waitFor(() => {
      expect(mockHybridDataManager.updateCombatItem).toHaveBeenCalledWith(
        'row-3ring',
        expect.objectContaining({
          max_uses: 3,
          max_uses_bonus: 1, // 3 - basic(2)
          current_uses: 2,
        })
      );
    });
  });
});
