/**
 * Modal UI 優化測試
 * 
 * 測試目標：
 * 1. AddMonsterModal 和 MonsterSettingsModal 使用共用 CSS 類別
 * 2. 輸入框右側邊緣與容器對齊
 * 3. 抗性設定可摺疊功能正常
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import AddMonsterModal from '../../components/AddMonsterModal';
import MonsterSettingsModal from '../../components/MonsterSettingsModal';

describe('Modal UI 優化測試', () => {
  describe('AddMonsterModal - 共用樣式', () => {
    const mockOnClose = vi.fn();
    const mockOnConfirm = vi.fn();

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('應該顯示所有必要的輸入框', () => {
      render(
        <AddMonsterModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      // 檢查 4 個輸入框都存在
      expect(screen.getByPlaceholderText('食人魔、地精...')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('1')).toBeInTheDocument();
      expect(screen.getAllByPlaceholderText('未知')).toHaveLength(2); // AC 和 HP
    });

    it('輸入框應該使用統一的寬度計算', () => {
      render(
        <AddMonsterModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      // 所有輸入框應該有相同的寬度類別
      const inputs = screen.getAllByRole('spinbutton');
      inputs.forEach(input => {
        expect(input.className).toContain('w-[calc(100%-5.5rem)]');
      });
    });

    it('抗性設定預設應該是摺疊的', () => {
      render(
        <AddMonsterModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      // 檢查抗性按鈕存在
      const resistanceButton = screen.getByText(/已知抗性/);
      expect(resistanceButton).toBeInTheDocument();

      // 抗性選單不應該立即顯示（摺疊狀態）
      const damageTypeSelects = screen.queryAllByRole('combobox');
      expect(damageTypeSelects).toHaveLength(0); // 摺疊時沒有下拉選單
    });

    it('點擊抗性按鈕應該展開/收合抗性設定', async () => {
      render(
        <AddMonsterModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const resistanceButton = screen.getByText(/已知抗性/);

      // 第一次點擊 - 展開
      fireEvent.click(resistanceButton);
      await waitFor(() => {
        const selects = screen.getAllByRole('combobox');
        expect(selects.length).toBeGreaterThan(0); // 應該顯示抗性選單
      });

      // 第二次點擊 - 收合
      fireEvent.click(resistanceButton);
      await waitFor(() => {
        const selects = screen.queryAllByRole('combobox');
        expect(selects).toHaveLength(0); // 應該隱藏抗性選單
      });
    });

    it('驗證輸入時應該正確處理空值為未知', async () => {
      render(
        <AddMonsterModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm.mockResolvedValue(undefined)}
        />
      );

      // 填寫怪物名稱
      const nameInput = screen.getByPlaceholderText('食人魔、地精...');
      fireEvent.change(nameInput, { target: { value: '地精' } });

      // AC 和 HP 留空（未知）
      const confirmButton = screen.getByText('確認新增');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith(
          '地精',
          1,
          null, // AC 未知
          null, // HP 未知
          {}    // 無抗性
        );
      });
    });
  });

  describe('MonsterSettingsModal - 橫向佈局', () => {
    const mockOnClose = vi.fn();
    const mockOnSuccess = vi.fn();
    const mockOnConflict = vi.fn().mockResolvedValue(false);

    const defaultProps = {
      isOpen: true,
      onClose: mockOnClose,
      monsterId: 'test-id',
      monsterNumber: 8,
      monsterName: '怪物14',
      currentACRange: { min: 0, max: null },
      currentMaxHP: 46,
      currentResistances: {},
      currentNotes: null as string | null,
      onSuccess: mockOnSuccess,
      onConflict: mockOnConflict,
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('應該顯示橫向排列的 AC 和 HP 輸入框', () => {
      render(<MonsterSettingsModal {...defaultProps} />);

      // 檢查 AC 與 HP 相關內容存在（AC 為 "< AC <=" 區塊，HP 為「最大 HP」）
      expect(screen.getByText(/< AC <=/)).toBeInTheDocument();
      expect(screen.getByText('最大 HP')).toBeInTheDocument();

      // 檢查數字輸入框存在：AC 兩格（min/max）+ HP 一格
      const spinbuttons = screen.getAllByRole('spinbutton');
      expect(spinbuttons).toHaveLength(3);
    });

    it('AC 輸入框應顯示目前的 AC 範圍', () => {
      render(
        <MonsterSettingsModal
          {...defaultProps}
          currentACRange={{ min: 10, max: 15 }}
        />
      );

      const acMinInput = screen.getAllByRole('spinbutton')[0];
      const acMaxInput = screen.getAllByRole('spinbutton')[1];
      expect(acMinInput).toHaveValue(10);
      expect(acMaxInput).toHaveValue(15);
    });

    it('HP placeholder 應該顯示目前的 HP 值', () => {
      render(
        <MonsterSettingsModal
          {...defaultProps}
          currentMaxHP={46}
        />
      );

      const hpInput = screen.getAllByRole('spinbutton')[2];
      expect(hpInput).toHaveAttribute('placeholder', '46');
    });

    it('未知 HP 應該顯示「未知」', () => {
      render(
        <MonsterSettingsModal
          {...defaultProps}
          currentMaxHP={null}
        />
      );

      const hpInput = screen.getAllByRole('spinbutton')[2];
      expect(hpInput).toHaveAttribute('placeholder', '未知');
    });

    it('抗性設定應該預設摺疊', () => {
      render(<MonsterSettingsModal {...defaultProps} />);

      const resistanceButton = screen.getByText(/已知抗性/);
      expect(resistanceButton).toBeInTheDocument();

      // 摺疊時不顯示抗性選單
      const selects = screen.queryAllByRole('combobox');
      expect(selects).toHaveLength(0);
    });

    it('輸入框應該使用與 AddMonsterModal 相同的寬度計算', () => {
      render(<MonsterSettingsModal {...defaultProps} />);

      const spinbuttons = screen.getAllByRole('spinbutton');
      expect(spinbuttons.length).toBeGreaterThanOrEqual(1);
      spinbuttons.forEach(input => {
        expect(input.className).toContain('w-[calc(100%-5.5rem)]');
      });
    });
  });

  describe('CSS 類別統一性測試', () => {
    it('兩個 Modal 應該使用相同的 label 寬度', () => {
      const { container: addContainer } = render(
        <AddMonsterModal
          isOpen={true}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
        />
      );

      const { container: settingsContainer } = render(
        <MonsterSettingsModal
          isOpen={true}
          onClose={vi.fn()}
          monsterId="test"
          monsterNumber={1}
          monsterName="測試"
          currentACRange={{ min: 0, max: null }}
          currentMaxHP={null}
          currentResistances={{}}
          onSuccess={vi.fn()}
          onConflict={vi.fn().mockResolvedValue(false)}
        />
      );

      // 兩個 Modal 的 label 都應該是 w-20
      const addLabels = addContainer.querySelectorAll('label');
      const settingsLabels = settingsContainer.querySelectorAll('label');

      addLabels.forEach(label => {
        expect(label.className).toContain('w-20');
      });

      settingsLabels.forEach(label => {
        expect(label.className).toContain('w-20');
      });
    });

    it('兩個 Modal 的 padding 應該一致', () => {
      const { container: addContainer } = render(
        <AddMonsterModal
          isOpen={true}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
        />
      );

      const { container: settingsContainer } = render(
        <MonsterSettingsModal
          isOpen={true}
          onClose={vi.fn()}
          monsterId="test"
          monsterNumber={1}
          monsterName="測試"
          currentACRange={{ min: 0, max: null }}
          currentMaxHP={null}
          currentResistances={{}}
          onSuccess={vi.fn()}
          onConflict={vi.fn().mockResolvedValue(false)}
        />
      );

      const addModalBox = addContainer.querySelector('.bg-slate-800');
      const settingsModalBox = settingsContainer.querySelector('.bg-slate-800');

      expect(addModalBox?.className).toContain('px-3');
      expect(addModalBox?.className).toContain('py-3');
      expect(settingsModalBox?.className).toContain('px-3');
      expect(settingsModalBox?.className).toContain('py-3');
    });
  });
});
