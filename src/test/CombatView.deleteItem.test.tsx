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
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// 回歸測試：戰鬥頁刪除自訂項目後 reload 又出現
// 原因：removeItem 以「顯示用 id + 前端類別字串」回查資料庫項目，
// 但資料庫的 category 為 'bonus_action'，與前端 'bonus' 不符，
// 導致 bonus 類別的自訂項目（如「劍歌」）永遠找不到、deleteCombatItem 未被呼叫。
describe('CombatView - 刪除自訂項目應真的從資料庫刪除', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  const mockStats = {
    hp: { current: 25, max: 30, temp: 0 },
    ac: 15,
    initiative: 3,
    speed: 30,
    abilityScores: { str: 14, dex: 16, con: 14, int: 10, wis: 12, cha: 8 },
    hitDice: { current: 3, total: 5, die: 'd8' },
  } as CharacterStats;

  const defaultProps = {
    stats: mockStats,
    setStats: vi.fn(),
    characterId: 'test-character-123',
    onSaveHP: vi.fn().mockResolvedValue(true),
    onSaveAC: vi.fn().mockResolvedValue(true),
    onSaveInitiative: vi.fn().mockResolvedValue(true),
  };

  it('刪除 bonus_action 類別的自訂項目（劍歌）時，應以資料庫列 ID 呼叫 deleteCombatItem', async () => {
    const items: import('../../lib/supabase').CharacterCombatAction[] = [
      {
        id: 'db-bladesong-1',
        character_id: 'test-character-123',
        category: 'bonus_action',
        name: '劍歌',
        icon: '🎵',
        current_uses: 1,
        max_uses: 1,
        recovery_type: 'long_rest',
        is_default: false,
        is_custom: true,
        default_item_id: undefined,
      },
    ];
    mockHybridDataManager.getCombatItems.mockResolvedValue(items);
    mockHybridDataManager.deleteCombatItem.mockResolvedValue(true);

    render(<CombatView {...defaultProps} />);

    await waitFor(() => {
      expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
    });

    // 進入編輯模式
    fireEvent.click(screen.getByText('⚙️'));

    // 找到「劍歌」項目的刪除按鈕並點擊
    const item = screen.getByText('劍歌').closest('button');
    expect(item).toBeInTheDocument();
    const deleteButton = item?.parentElement?.querySelector(
      'button[class*="bg-rose-600"]'
    ) as HTMLButtonElement;
    expect(deleteButton).not.toBeNull();
    fireEvent.click(deleteButton);

    // 核心回歸點：必須真的以資料庫列 ID 刪除，否則 reload 後會重新出現
    await waitFor(() => {
      expect(mockHybridDataManager.deleteCombatItem).toHaveBeenCalledWith('db-bladesong-1');
    });
  });
});
