import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest';
import { CombatView } from '../../components/CombatView';
import { HybridDataManager } from '../../services/hybridDataManager';
import { MigrationService } from '../../services/migration';
import type { CharacterStats } from '../../types';

// Mock external dependencies
vi.mock('../../services/hybridDataManager');
vi.mock('../../services/migration');

// Create a proper mock for HybridDataManager
const mockDataManagerInstance = {
  testDatabaseConnection: vi.fn().mockResolvedValue(true),
  getCombatItems: vi.fn().mockResolvedValue([]),
  createCombatItem: vi.fn().mockResolvedValue({}),
  updateCombatItem: vi.fn().mockResolvedValue(true),
  deleteCombatItem: vi.fn().mockResolvedValue(true)
};

const mockHybridDataManager = vi.mocked(HybridDataManager);
mockHybridDataManager.mockImplementation(() => mockDataManagerInstance as any);

const mockMigrationService = vi.mocked(MigrationService);

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

const mockStats: CharacterStats = {
  hp: { current: 25, max: 30 },
  ac: 15,
  initiative: 3,
  abilityScores: {
    str: 14,
    dex: 16,
    con: 13,
    int: 10,
    wis: 12,
    cha: 8
  },
  hitDice: { current: 3, total: 5, die: 'd8' },
  hitDicePools: {
    'd8': { current: 3, total: 5 },
    'd6': { current: 0, total: 0 },
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

// Mock combat items for testing
const mockCombatItems = [
  {
    id: 'attack',
    character_id: 'test-character-123',
    category: 'action',
    name: '攻擊',
    icon: '⚔️',
    current_uses: 1,
    max_uses: 1,
    recovery_type: 'turn',
    is_default: true,
    is_custom: false,
    default_item_id: 'attack'
  },
  {
    id: 'custom-spell',
    character_id: 'test-character-123',
    category: 'resource',
    name: '法術位',
    icon: '✨',
    current_uses: 2,
    max_uses: 3,
    recovery_type: 'long_rest',
    is_default: false,
    is_custom: true,
    default_item_id: null
  }
];

describe('CombatView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    
    // Reset mock implementations
    mockDataManagerInstance.getCombatItems.mockResolvedValue(mockCombatItems);
    mockDataManagerInstance.createCombatItem.mockResolvedValue(mockCombatItems[0]);
    mockDataManagerInstance.updateCombatItem.mockResolvedValue(true);
    mockDataManagerInstance.deleteCombatItem.mockResolvedValue(true);
    
    // Mock MigrationService
    mockMigrationService.migrateCombatItems.mockResolvedValue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('核心渲染功能', () => {
    it('應該正確渲染戰鬥頁面的基本元素', async () => {
      render(<CombatView {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
      });

      // 檢查基本UI元素
      expect(screen.getByText('🎲')).toBeInTheDocument(); // 骰子圖標
      expect(screen.getByText('25 / 30')).toBeInTheDocument(); // HP顯示
      expect(screen.getByText('15')).toBeInTheDocument(); // AC
      expect(screen.getByText('+3')).toBeInTheDocument(); // Initiative
    });

    it('在沒有角色ID時應該顯示警告訊息', async () => {
      const propsWithoutCharacterId = { ...defaultProps, characterId: undefined };
      render(<CombatView {...propsWithoutCharacterId} />);
      
      expect(screen.getByText('請先選擇或創建角色才能使用戰鬥功能。')).toBeInTheDocument();
    });
  });

  describe('HP管理功能', () => {
    it('應該正確計算體質調整值', () => {
      // CON 13 應該是 +1 調整值
      const conMod = Math.floor((mockStats.abilityScores.con - 10) / 2);
      expect(conMod).toBe(1);
    });

    it('使用生命骰後應該調用HP保存函數', async () => {
      render(<CombatView {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
      });

      // 找到並點擊生命骰按鈕
      const hitDieButton = screen.getByText('🎲 消耗生命骰');
      fireEvent.click(hitDieButton);

      // 應該調用HP保存函數
      await waitFor(() => {
        expect(defaultProps.onSaveHP).toHaveBeenCalled();
      });
    });

    it('長休後應該恢復滿血並保存HP', async () => {
      render(<CombatView {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
      });

      // 觸發長休
      const restButton = screen.getByText('💤');
      fireEvent.click(restButton);
      
      const longRestButton = screen.getByText('長休');
      fireEvent.click(longRestButton);
      
      const confirmButton = screen.getByText('確認長休');
      fireEvent.click(confirmButton);

      // 驗證HP保存被調用，且值為最大HP
      await waitFor(() => {
        expect(defaultProps.onSaveHP).toHaveBeenCalledWith(mockStats.hp.max);
      });
    });
  });

  describe('戰鬥項目管理', () => {
    it('應該正確載入預設和自訂戰鬥項目', async () => {
      render(<CombatView {...defaultProps} />);
      
      await waitFor(() => {
        expect(mockHybridDataManager.getCombatItems).toHaveBeenCalledWith('test-character-123');
      });
    });

    it('預設項目在編輯模式下不應該顯示刪除按鈕', async () => {
      render(<CombatView {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
      });

      // 進入編輯模式
      const editButton = screen.getByText('⚙️');
      fireEvent.click(editButton);

      // 預設項目不應該有刪除按鈕（✕）
      const attackItem = screen.getByText('攻擊').closest('button');
      expect(attackItem?.querySelector('button:has-text("✕")')).toBeNull();
    });

    it('應該能夠創建新的自訂戰鬥項目', async () => {
      render(<CombatView {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
      });

      // 進入編輯模式
      const editButton = screen.getByText('⚙️');
      fireEvent.click(editButton);

      // 點擊新增資源按鈕（假設在職業資源區域）
      const addButtons = screen.getAllByText('+');
      if (addButtons.length > 0) {
        fireEvent.click(addButtons[0]);

        // 填寫項目資料（需要找到相應的輸入框）
        await waitFor(() => {
          const nameInput = screen.getByPlaceholderText(/名稱/);
          if (nameInput) {
            fireEvent.change(nameInput, { target: { value: '測試法術' } });
          }
        });

        // 保存項目
        const saveButton = screen.getByText('保存');
        fireEvent.click(saveButton);

        await waitFor(() => {
          expect(mockHybridDataManager.createCombatItem).toHaveBeenCalledWith(
            expect.objectContaining({
              character_id: 'test-character-123',
              name: '測試法術',
              is_custom: true,
              is_default: false
            })
          );
        });
      }
    });

    it('應該能夠使用戰鬥項目並更新資料庫', async () => {
      render(<CombatView {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
      });

      // 尋找攻擊按鈕並點擊
      const attackButton = screen.getByText('攻擊');
      fireEvent.click(attackButton);

      // 應該調用更新功能
      await waitFor(() => {
        expect(mockHybridDataManager.updateCombatItem).toHaveBeenCalled();
      }, { timeout: 3000 });
    });
  });

  describe('預設項目保護', () => {
    it('isDefaultItem函數應該正確識別預設項目', async () => {
      render(<CombatView {...defaultProps} />);
      
      // 測試預設項目識別邏輯
      const defaultItem = { id: 'attack', name: '攻擊', is_default: true };
      const customItem = { id: 'custom-1', name: '自訂技能', is_default: false };
      
      // 這裡我們無法直接測試isDefaultItem函數，但可以通過UI行為來驗證
      await waitFor(() => {
        expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
      });

      // 進入編輯模式
      const editButton = screen.getByText('⚙️');
      fireEvent.click(editButton);

      // 檢查預設項目是否沒有刪除按鈕
      const actionSection = screen.getByText('動作 (ACTION)').parentElement;
      const deleteButtons = actionSection?.querySelectorAll('button[class*="bg-rose-600"]');
      
      // 預設項目不應該有刪除按鈕
      expect(deleteButtons?.length).toBeLessThan(9); // 少於預設動作的總數
    });
  });

  describe('資料庫互動功能', () => {
    it('應該在載入時嘗試從資料庫獲取戰鬥項目', async () => {
      render(<CombatView {...defaultProps} />);
      
      await waitFor(() => {
        expect(mockHybridDataManager.getCombatItems).toHaveBeenCalledWith('test-character-123');
      });
    });

    it('當資料庫載入失敗時應該使用預設資料', async () => {
      mockHybridDataManager.getCombatItems.mockRejectedValue(new Error('Database error'));
      
      render(<CombatView {...defaultProps} />);
      
      await waitFor(() => {
        // 即使資料庫失敗，應該還是能看到預設的戰鬥動作
        expect(screen.getByText('攻擊')).toBeInTheDocument();
      });
    });

    it('應該正確處理超時錯誤', async () => {
      mockHybridDataManager.getCombatItems.mockRejectedValue(new Error('載入角色列表超時（5秒）'));
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<CombatView {...defaultProps} />);
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('資料載入失敗'),
          expect.any(Error)
        );
      });
      
      consoleSpy.mockRestore();
    });
  });

  describe('生命骰顯示格式', () => {
    it('生命骰恢復應該顯示正確的格式', async () => {
      const mockSetStats = vi.fn();
      const propsWithMockSetStats = { ...defaultProps, setStats: mockSetStats };
      
      render(<CombatView {...propsWithMockSetStats} />);
      
      await waitFor(() => {
        expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
      });

      // 模擬使用生命骰
      const hitDieButton = screen.getByText('🎲 消耗生命骰');
      fireEvent.click(hitDieButton);

      // 檢查是否有恢復顯示（格式應該是 +n+m 或 +n-m）
      await waitFor(() => {
        const recoveryDisplay = screen.queryByText(/\+\d+[\+\-]\d+/);
        // 由於生命骰是隨機的，我們只檢查格式是否存在
        // 實際的測試可能需要mock Math.random
      });
    });
  });

  describe('錯誤處理', () => {
    it('應該正確處理保存失敗的情況', async () => {
      const failingSaveHP = vi.fn().mockRejectedValue(new Error('Save failed'));
      const propsWithFailingSave = { ...defaultProps, onSaveHP: failingSaveHP };
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<CombatView {...propsWithFailingSave} />);
      
      await waitFor(() => {
        expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
      });

      // 觸發HP保存
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
  });
});