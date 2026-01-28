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

describe('CombatView - HP恢復後保存功能測試', () => {
  let originalMathRandom: () => number;
  
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    
    mockHybridDataManager.getCombatItems.mockResolvedValue([]);
    
    // 保存原始的 Math.random
    originalMathRandom = Math.random;
  });

  afterEach(() => {
    Math.random = originalMathRandom;
    vi.restoreAllMocks();
  });

  const mockStats: CharacterStats = {
    hp: { current: 20, max: 30 },
    ac: 15,
    initiative: 3,
    abilityScores: {
      str: 14, dex: 16, con: 14, int: 10, wis: 12, cha: 8
    },
    hitDice: { current: 2, total: 5, die: 'd8' },
    hitDicePools: {
      'd8': { current: 2, total: 3 },
      'd6': { current: 1, total: 1 },
      'd10': { current: 0, total: 0 },
      'd12': { current: 0, total: 0 }
    }
  };

  const defaultProps = {
    stats: mockStats,
    setStats: vi.fn(),
    characterId: 'test-character-123',
    onSaveHP: vi.fn().mockResolvedValue(true),
    onSaveAC: vi.fn().mockResolvedValue(true),
    onSaveInitiative: vi.fn().mockResolvedValue(true)
  };

  describe('單職業生命骰恢復', () => {
    it('使用生命骰恢復HP後應該調用保存函數', async () => {
      // Mock 骰出固定值
      Math.random = vi.fn().mockReturnValue(0.5); // d8 骰出 5
      
      const singleClassStats = {
        ...mockStats,
        hitDicePools: undefined // 單職業模式
      };
      
      const singleClassProps = {
        ...defaultProps,
        stats: singleClassStats
      };

      render(<CombatView {...singleClassProps} />);
      
      await waitFor(() => {
        expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
      });

      // 使用生命骰
      const hitDieButton = screen.getByText('🎲 消耗生命骰');
      fireEvent.click(hitDieButton);

      // 計算預期HP：20 + (5 + 2) = 27
      const expectedHP = 20 + 5 + 2;

      await waitFor(() => {
        expect(defaultProps.onSaveHP).toHaveBeenCalledWith(expectedHP);
      });
    });

    it('生命骰恢復HP不超過最大值', async () => {
      Math.random = vi.fn().mockReturnValue(0.875); // d8 骰出 8
      
      const nearMaxHPStats = {
        ...mockStats,
        hp: { current: 28, max: 30 }, // 接近最大值
        hitDicePools: undefined
      };
      
      const nearMaxProps = {
        ...defaultProps,
        stats: nearMaxHPStats
      };

      render(<CombatView {...nearMaxProps} />);
      
      await waitFor(() => {
        expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
      });

      const hitDieButton = screen.getByText('🎲 消耗生命骰');
      fireEvent.click(hitDieButton);

      // 計算：28 + (8 + 2) = 38，但最大30
      const expectedHP = 30; // 不超過最大值

      await waitFor(() => {
        expect(defaultProps.onSaveHP).toHaveBeenCalledWith(expectedHP);
      });
    });
  });

  describe('多職業生命骰恢復', () => {
    it('多職業生命骰恢復HP後應該調用保存函數', async () => {
      Math.random = vi.fn().mockReturnValue(0.5); // d8 骰出 5
      
      render(<CombatView {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
      });

      // 觸發短休來顯示多職業選項
      const restButton = screen.getByText('💤');
      fireEvent.click(restButton);
      
      const shortRestButton = screen.getByText('短休');
      fireEvent.click(shortRestButton);

      await waitFor(() => {
        expect(screen.getByText('正在短休...')).toBeInTheDocument();
      });

      // 使用 d8 生命骰
      const d8Button = screen.getByText('d8 (2)');
      fireEvent.click(d8Button);

      // 計算預期HP：20 + (5 + 2) = 27
      const expectedHP = 20 + 5 + 2;

      await waitFor(() => {
        expect(defaultProps.onSaveHP).toHaveBeenCalledWith(expectedHP);
      });
    });

    it('不同類型生命骰恢復應該使用對應的骰值', async () => {
      Math.random = vi.fn().mockReturnValue(0.83); // d6 骰出 6
      
      render(<CombatView {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
      });

      const restButton = screen.getByText('💤');
      fireEvent.click(restButton);
      
      const shortRestButton = screen.getByText('短休');
      fireEvent.click(shortRestButton);

      await waitFor(() => {
        expect(screen.getByText('d6 (1)')).toBeInTheDocument();
      });

      // 使用 d6 生命骰
      const d6Button = screen.getByText('d6 (1)');
      fireEvent.click(d6Button);

      // 計算預期HP：20 + (6 + 2) = 28
      const expectedHP = 20 + 6 + 2;

      await waitFor(() => {
        expect(defaultProps.onSaveHP).toHaveBeenCalledWith(expectedHP);
      });
    });
  });

  describe('長休功能', () => {
    it('長休後應該恢復到滿血並保存', async () => {
      render(<CombatView {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
      });

      const restButton = screen.getByText('💤');
      fireEvent.click(restButton);
      
      const longRestButton = screen.getByText('長休');
      fireEvent.click(longRestButton);
      
      const confirmButton = screen.getByText('確認長休');
      fireEvent.click(confirmButton);

      // 長休應該恢復到最大HP
      await waitFor(() => {
        expect(defaultProps.onSaveHP).toHaveBeenCalledWith(mockStats.hp.max);
      });
    });

    it('長休應該恢復生命骰數量', async () => {
      const mockSetStats = vi.fn();
      const propsWithMockSetStats = {
        ...defaultProps,
        setStats: mockSetStats
      };

      render(<CombatView {...propsWithMockSetStats} />);
      
      await waitFor(() => {
        expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
      });

      const restButton = screen.getByText('💤');
      fireEvent.click(restButton);
      
      const longRestButton = screen.getByText('長休');
      fireEvent.click(longRestButton);
      
      const confirmButton = screen.getByText('確認長休');
      fireEvent.click(confirmButton);

      // 檢查生命骰是否恢復（至少恢復一半）
      await waitFor(() => {
        expect(mockSetStats).toHaveBeenCalled();
        const lastCall = mockSetStats.mock.calls[mockSetStats.mock.calls.length - 1][0];
        if (typeof lastCall === 'function') {
          const result = lastCall(mockStats);
          
          // 多職業：應該恢復到至少一半
          if (result.hitDicePools) {
            expect(result.hitDicePools['d8'].current).toBeGreaterThan(mockStats.hitDicePools!['d8'].current);
          }
          // 單職業：也應該恢復
          if (result.hitDice) {
            expect(result.hitDice.current).toBeGreaterThan(mockStats.hitDice.current);
          }
        }
      });
    });
  });

  describe('保存失敗處理', () => {
    it('HP保存失敗時應該記錄錯誤', async () => {
      const failingOnSaveHP = vi.fn().mockRejectedValue(new Error('Database connection failed'));
      const propsWithFailingSave = {
        ...defaultProps,
        onSaveHP: failingOnSaveHP
      };

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      Math.random = vi.fn().mockReturnValue(0.5);
      
      render(<CombatView {...propsWithFailingSave} />);
      
      await waitFor(() => {
        expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
      });

      const hitDieButton = screen.getByText('🎲 消耗生命骰');
      fireEvent.click(hitDieButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('生命骰恢復後HP保存失敗'),
          expect.any(Error)
        );
      });
      
      consoleSpy.mockRestore();
    });

    it('長休HP保存失敗時應該記錄錯誤', async () => {
      const failingOnSaveHP = vi.fn().mockRejectedValue(new Error('Network error'));
      const propsWithFailingSave = {
        ...defaultProps,
        onSaveHP: failingOnSaveHP
      };

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<CombatView {...propsWithFailingSave} />);
      
      await waitFor(() => {
        expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
      });

      const restButton = screen.getByText('💤');
      fireEvent.click(restButton);
      
      const longRestButton = screen.getByText('長休');
      fireEvent.click(longRestButton);
      
      const confirmButton = screen.getByText('確認長休');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('長休後HP保存失敗'),
          expect.any(Error)
        );
      });
      
      consoleSpy.mockRestore();
    });
  });

  describe('邊界情況', () => {
    it('生命骰用完時不應該能繼續使用', async () => {
      const noHitDiceStats = {
        ...mockStats,
        hitDice: { current: 0, total: 5, die: 'd8' },
        hitDicePools: undefined
      };
      
      const noHitDiceProps = {
        ...defaultProps,
        stats: noHitDiceStats
      };

      render(<CombatView {...noHitDiceProps} />);
      
      await waitFor(() => {
        expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
      });

      // 生命骰按鈕應該被禁用
      const hitDieButton = screen.getByRole('button', { name: /🎲 消耗生命骰/ });
      expect(hitDieButton).toBeDisabled();
    });

    it('HP已滿時生命骰按鈕應該被禁用', async () => {
      const fullHPStats = {
        ...mockStats,
        hp: { current: 30, max: 30 },
        hitDicePools: undefined
      };
      
      const fullHPProps = {
        ...defaultProps,
        stats: fullHPStats
      };

      render(<CombatView {...fullHPProps} />);
      
      await waitFor(() => {
        expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
      });

      const hitDieButton = screen.getByText('🎲 消耗生命骰');
      expect(hitDieButton).toBeDisabled();
    });
  });
});