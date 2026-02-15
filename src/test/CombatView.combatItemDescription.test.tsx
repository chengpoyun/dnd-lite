/**
 * CombatView - 自定義戰鬥項目 description 儲存與說明確認 modal
 * TDD：先寫測試，再實作。
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CombatView } from '../../components/CombatView';
import { HybridDataManager } from '../../services/hybridDataManager';
import type { CharacterStats } from '../../types';

vi.mock('../../services/hybridDataManager');
vi.mock('../../services/migration');

const mockHybrid = vi.mocked(HybridDataManager);

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('CombatView - 自定義項目 description', () => {
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
    characterId: 'test-char-id',
    onSaveHP: vi.fn().mockResolvedValue(true),
    onSaveAC: vi.fn().mockResolvedValue(true),
    onSaveInitiative: vi.fn().mockResolvedValue(true),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it('新增自定義項目並填寫 description 時，createCombatItem 收到 description', async () => {
    mockHybrid.getCombatItems.mockResolvedValue([]);
    mockHybrid.createCombatItem.mockResolvedValue({
      id: 'new-uuid',
      character_id: 'test-char-id',
      category: 'resource',
      name: '新資源',
      icon: '✨',
      max_uses: 2,
      current_uses: 2,
      recovery_type: 'long_rest',
      is_default: false,
      is_custom: true,
    } as any);

    render(<CombatView {...defaultProps} />);
    await waitFor(() => {
      expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
    });

    // 進入編輯模式 → 職業資源區點 + 新增
    fireEvent.click(screen.getByText('⚙️'));
    const resourceSection = screen.getByText('職業資源').closest('div');
    const addBtn = resourceSection?.querySelector('button');
    expect(addBtn).toBeTruthy();
    fireEvent.click(addBtn!);

    // 表單：名稱、描述（若 showDescription 會出現）
    const nameInput = screen.getByPlaceholderText('名稱');
    fireEvent.change(nameInput, { target: { value: '新資源' } });
    const descInput = screen.queryByLabelText(/描述/);
    if (descInput) {
      fireEvent.change(descInput, { target: { value: '資源說明' } });
    }
    fireEvent.click(screen.getByText('儲存'));

    await waitFor(() => {
      expect(mockHybrid.createCombatItem).toHaveBeenCalled();
    });
    const call = mockHybrid.createCombatItem.mock.calls[0][0];
    expect(call.description).toBeDefined();
    expect(call.description).toBe('資源說明');
  });

  it('一般模式點擊有 description 的項目時，先顯示以項目名稱為標題的說明 modal，確認後才執行消耗', async () => {
    const itemsWithDescription = [
      {
        id: 'custom-with-desc',
        character_id: 'test-char-id',
        category: 'resource',
        name: '帶說明的資源',
        icon: '📜',
        description: '使用前請先閱讀說明',
        current_uses: 2,
        max_uses: 2,
        recovery_type: 'long_rest',
        is_default: false,
        is_custom: true,
      },
    ];
    mockHybrid.getCombatItems.mockResolvedValue(itemsWithDescription as any);
    mockHybrid.updateCombatItem.mockResolvedValue(null as any);

    render(<CombatView {...defaultProps} />);
    await waitFor(() => {
      expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
    });

    // 一般模式點擊「帶說明的資源」
    const itemButton = screen.getByText('帶說明的資源').closest('button');
    expect(itemButton).toBeInTheDocument();
    fireEvent.click(itemButton!);

    // 應出現說明 modal：標題為項目名稱、內容為 description
    await waitFor(() => {
      expect(screen.getByText('使用前請先閱讀說明')).toBeInTheDocument();
    });
    expect(screen.getByText('確認')).toBeInTheDocument();
    expect(screen.getByText('取消')).toBeInTheDocument();

    // 尚未消耗
    expect(mockHybrid.updateCombatItem).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('確認'));

    // 確認後應執行消耗（更新 current_uses）
    await waitFor(() => {
      expect(mockHybrid.updateCombatItem).toHaveBeenCalledWith(
        'custom-with-desc',
        expect.objectContaining({ current_uses: 1 })
      );
    });
  });
});
