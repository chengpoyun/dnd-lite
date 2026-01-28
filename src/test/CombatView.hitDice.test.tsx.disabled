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
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('CombatView - 生命骰恢復顯示格式測試', () => {
  let originalMathRandom: () => number;
  
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    
    // Mock empty combat items to use defaults
    mockHybridDataManager.getCombatItems.mockResolvedValue([]);
    mockHybridDataManager.createCombatItem.mockResolvedValue({} as any);
    
    // 保存原始的 Math.random
    originalMathRandom = Math.random;
  });

  afterEach(() => {
    // 恢復原始的 Math.random
    Math.random = originalMathRandom;
    vi.restoreAllMocks();
  });

  const mockStats: CharacterStats = {
    hp: { current: 25, max: 30 },
    ac: 15,
    initiative: 3,
    abilityScores: {
      str: 14,
      dex: 16,
      con: 14, // +2 調整值
      int: 10,
      wis: 12,
      cha: 8
    },
    hitDice: { current: 3, total: 5, die: 'd8' }
  };

  const defaultProps = {
    stats: mockStats,
    setStats: vi.fn(),
    characterId: 'test-character-123',
    onSaveHP: vi.fn().mockResolvedValue(true),
    onSaveAC: vi.fn().mockResolvedValue(true),
    onSaveInitiative: vi.fn().mockResolvedValue(true)
  };

  it('生命骰恢復應該顯示正確的 n+m 格式 (正數調整)', async () => {
    // Mock Math.random 返回固定值 (0.5 = 骰出 5 在 d8 上)
    Math.random = vi.fn().mockReturnValue(0.5);
    
    render(<CombatView {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
    });

    // 使用生命骰
    const hitDieButton = screen.getByText('🎲 消耗生命骰');
    fireEvent.click(hitDieButton);

    // 檢查顯示格式：應該是 +5+2 (骰值5 + 體質調整值+2)
    await waitFor(() => {
      expect(screen.getByText('+5+2')).toBeInTheDocument();
    });
  });

  it('生命骰恢復應該顯示正確的 n-m 格式 (負數調整)', async () => {
    // 設置負體質調整值
    const statsWithNegativeCon = {
      ...mockStats,
      abilityScores: {
        ...mockStats.abilityScores,
        con: 8 // -1 調整值
      }
    };

    const propsWithNegativeCon = {
      ...defaultProps,
      stats: statsWithNegativeCon
    };

    // Mock Math.random 返回固定值 (0.75 = 骰出 7 在 d8 上)  
    Math.random = vi.fn().mockReturnValue(0.75);
    
    render(<CombatView {...propsWithNegativeCon} />);
    
    await waitFor(() => {
      expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
    });

    // 使用生命骰
    const hitDieButton = screen.getByText('🎲 消耗生命骰');
    fireEvent.click(hitDieButton);

    // 檢查顯示格式：應該是 +7-1 (骰值7 + 體質調整值-1)
    await waitFor(() => {
      expect(screen.getByText('+7-1')).toBeInTheDocument();
    });
  });

  it('生命骰恢復應該顯示正確的 n+0 格式 (零調整)', async () => {
    // 設置零體質調整值
    const statsWithZeroCon = {
      ...mockStats,
      abilityScores: {
        ...mockStats.abilityScores,
        con: 10 // 0 調整值
      }
    };

    const propsWithZeroCon = {
      ...defaultProps,
      stats: statsWithZeroCon
    };

    // Mock Math.random 返回固定值 (0.25 = 骰出 3 在 d8 上)
    Math.random = vi.fn().mockReturnValue(0.25);
    
    render(<CombatView {...propsWithZeroCon} />);
    
    await waitFor(() => {
      expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
    });

    // 使用生命骰
    const hitDieButton = screen.getByText('🎲 消耗生命骰');
    fireEvent.click(hitDieButton);

    // 檢查顯示格式：應該是 +3+0 (骰值3 + 體質調整值0)
    await waitFor(() => {
      expect(screen.getByText('+3+0')).toBeInTheDocument();
    });
  });

  it('多職業生命骰也應該顯示正確格式', async () => {
    // 使用多職業狀態
    const multiclassStats = {
      ...mockStats,
      hitDicePools: {
        'd8': { current: 2, total: 3 },
        'd6': { current: 1, total: 1 },
        'd10': { current: 0, total: 0 },
        'd12': { current: 0, total: 0 }
      }
    };

    const propsWithMulticlass = {
      ...defaultProps,
      stats: multiclassStats
    };

    // Mock Math.random 返回固定值 (0.83 = 骰出 6 在 d6 上)
    Math.random = vi.fn().mockReturnValue(0.83);
    
    render(<CombatView {...propsWithMulticlass} />);
    
    await waitFor(() => {
      expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
    });

    // 觸發短休來顯示多職業生命骰選項
    const restButton = screen.getByText('💤');
    fireEvent.click(restButton);
    
    const shortRestButton = screen.getByText('短休');
    fireEvent.click(shortRestButton);

    // 等待短休對話框出現
    await waitFor(() => {
      expect(screen.getByText('正在短休...')).toBeInTheDocument();
    });

    // 點擊 d6 生命骰
    const d6Button = screen.getByText('d6 (1)');
    fireEvent.click(d6Button);

    // 檢查顯示格式：應該是 +6+2 (d6骰出6 + 體質調整值+2)
    await waitFor(() => {
      expect(screen.getByText('+6+2')).toBeInTheDocument();
    });
  });

  it('生命骰恢復後應該正確調用保存函數', async () => {
    Math.random = vi.fn().mockReturnValue(0.5); // 骰出5
    
    render(<CombatView {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
    });

    // 記錄原始HP
    const originalHP = mockStats.hp.current;
    
    // 使用生命骰
    const hitDieButton = screen.getByText('🎲 消耗生命骰');
    fireEvent.click(hitDieButton);

    // 計算預期的新HP：原始25 + (骰值5 + 體質調整+2) = 32，但最大30
    const expectedHP = Math.min(30, originalHP + 5 + 2);

    // 檢查保存函數被調用且傳入正確的HP值
    await waitFor(() => {
      expect(defaultProps.onSaveHP).toHaveBeenCalledWith(expectedHP);
    });
  });
});