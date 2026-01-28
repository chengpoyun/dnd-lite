import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { CombatView } from '../../components/CombatView';
import type { CharacterStats } from '../../types';

// Mock modules
vi.mock('../../services/hybridDataManager', () => ({
  HybridDataManager: {
    getCombatItems: vi.fn().mockResolvedValue([]),
    createCombatItem: vi.fn().mockResolvedValue({}),
    updateCombatItem: vi.fn().mockResolvedValue(true),
    deleteCombatItem: vi.fn().mockResolvedValue(true)
  }
}));
vi.mock('../../services/migration');
vi.mock('../../utils/classUtils', () => ({
  formatHitDicePools: vi.fn(() => ''),
  getTotalCurrentHitDice: vi.fn(() => 2),
  useHitDie: vi.fn((pools, type, count) => ({ ...pools })),
  recoverHitDiceOnLongRest: vi.fn((pools) => ({ ...pools }))
}));

// Mock Math.random for consistent test results
const mockMath = Object.create(global.Math);
mockMath.random = vi.fn(() => 0.5);
global.Math = mockMath;

// 建立模擬的MigrationService
vi.mock('../../services/migration', () => ({
  MigrationService: {
    migrateCombatItems: vi.fn().mockResolvedValue(true)
  }
}));

describe('CombatView - 基本功能測試', () => {
  const mockStats: CharacterStats = {
    name: '測試角色',
    hp: { current: 25, max: 30 },
    ac: 15,
    initiative: '+3',
    hitDice: { current: 3, max: 3 },
    constitution: 14
  };

  const mockSetStats = vi.fn();
  const mockOnSaveHP = vi.fn().mockResolvedValue(true);

  beforeEach(() => {
    vi.clearAllMocks();
    mockSetStats.mockClear();
    mockOnSaveHP.mockClear();
  });

  it('應該正確渲染戰鬥頁面', async () => {
    render(
      <CombatView 
        stats={mockStats}
        setStats={mockSetStats}
        characterId="test-character"
        onSaveHP={mockOnSaveHP}
      />
    );

    // 等待加載完成
    await waitFor(() => {
      expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
    });

    // 檢查HP顯示 - 通過生命值標題來定位父容器，然後檢查HP值
    await waitFor(() => {
      const hpContainer = screen.getByText('生命值').closest('div');
      expect(hpContainer).toBeInTheDocument();
      expect(hpContainer).toHaveTextContent('25');
      expect(hpContainer).toHaveTextContent('30');
    });
    
    // 檢查AC顯示
    expect(screen.getByText('15')).toBeInTheDocument();
    
    // 檢查先攻顯示 - 通過先攻標題來定位容器
    const initiativeContainer = screen.getByText('先攻').closest('div');
    expect(initiativeContainer).toBeInTheDocument();
    expect(initiativeContainer).toHaveTextContent('+3');
  });

  it('應該能夠處理HP點擊編輯', async () => {
    render(
      <CombatView 
        stats={mockStats}
        setStats={mockSetStats}
        characterId="test-character"
        onSaveHP={mockOnSaveHP}
      />
    );

    // 等待加載完成
    await waitFor(() => {
      expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
    });

    // 點擊HP區域
    await waitFor(() => {
      const hpSection = screen.getByText('生命值').closest('div');
      expect(hpSection).toBeInTheDocument();
      if (hpSection) {
        fireEvent.click(hpSection);
      }
    });
    
    // 應該打開HP編輯彈窗
    await waitFor(() => {
      expect(screen.getByText('修改生命值')).toBeInTheDocument();
    });
  });

  it('戰鬥動作部分應該能正常顯示', async () => {
    render(
      <CombatView 
        stats={mockStats}
        setStats={mockSetStats}
        characterId="test-character"
        onSaveHP={mockOnSaveHP}
      />
    );

    // 等待加載完成
    await waitFor(() => {
      expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
    });

    // 檢查動作分類標題
    await waitFor(() => {
      expect(screen.getByText(/動作.*Action/)).toBeInTheDocument();
    });
    expect(screen.getByText(/附贈動作.*Bonus/)).toBeInTheDocument();
    expect(screen.getByText(/反應.*Reaction/)).toBeInTheDocument();
    expect(screen.getByText('職業資源')).toBeInTheDocument();
  });

  it('應該能夠打開休息選項', async () => {
    render(
      <CombatView 
        stats={mockStats}
        setStats={mockSetStats}
        characterId="test-character"
        onSaveHP={mockOnSaveHP}
      />
    );

    // 等待加載完成
    await waitFor(() => {
      expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
    });

    // 點擊休息按鈕（🏕️圖標）
    await waitFor(() => {
      const restButton = screen.getByRole('button', { name: /🏕️/ });
      fireEvent.click(restButton);
    });

    // 應該打開休息選項彈窗
    await waitFor(() => {
      expect(screen.getByText('選擇休息方式')).toBeInTheDocument();
    });
  });

  it('HP保存功能應該正常工作', async () => {
    const { rerender } = render(
      <CombatView 
        stats={mockStats}
        setStats={mockSetStats}
        characterId="test-character"
        onSaveHP={mockOnSaveHP}
      />
    );

    // 等待首次加載完成
    await waitFor(() => {
      expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
    });

    // 修改HP值並觸發保存
    const newStats = { ...mockStats, hp: { current: 20, max: 30 } };
    rerender(
      <CombatView 
        stats={newStats}
        setStats={mockSetStats}
        characterId="test-character"
        onSaveHP={mockOnSaveHP}
      />
    );

    // 這個測試主要確保組件能正確接收和顯示新的HP值
    await waitFor(() => {
      const hpContainer = screen.getByText('生命值').closest('div');
      expect(hpContainer).toHaveTextContent('20');
      expect(hpContainer).toHaveTextContent('30');
    }, { timeout: 5000 });
  });
});