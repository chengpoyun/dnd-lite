import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CharacterSheet } from '../../components/CharacterSheet';
import type { CharacterStats } from '../../types';

const mockStats: CharacterStats = {
  name: '測試角色',
  class: '戰士',
  level: 5,
  exp: 6500,
  hp: { current: 45, max: 55, temp: 0 },
  hitDice: { current: 3, total: 5, die: 'd10' },
  ac: 16,
  initiative: 2,
  speed: 30,
  abilityScores: { str: 16, dex: 14, con: 15, int: 10, wis: 12, cha: 8 },
  proficiencies: { 運動: 1, 威嚇: 1 },
  savingProficiencies: ['str', 'con'],
  downtime: 5,
  renown: { used: 2, total: 8 },
  prestige: { org: '冒險者公會', level: 1, rankName: '見習冒險者' },
  attacks: [],
  currency: { cp: 10, sp: 25, ep: 0, gp: 150, pp: 2 },
  avatarUrl: undefined,
  customRecords: [
    { id: '1', name: '完成任務', value: '救援村民', note: '獲得村長感謝' },
  ],
};

describe('CharacterSheet - Modal 開啟與儲存', () => {
  const mockSetStats = vi.fn();
  const mockOnSaveCurrencyAndExp = vi.fn();
  const mockOnSaveExtraData = vi.fn();
  const mockOnSaveCharacterBasicInfo = vi.fn();
  const mockOnSaveAbilityScores = vi.fn();
  const mockOnSaveSavingThrowProficiencies = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSaveCurrencyAndExp.mockResolvedValue(true);
    mockOnSaveExtraData.mockResolvedValue(true);
    mockOnSaveCharacterBasicInfo.mockResolvedValue(true);
    mockOnSaveAbilityScores.mockResolvedValue(true);
    mockOnSaveSavingThrowProficiencies.mockResolvedValue(true);
  });

  const defaultProps = {
    stats: mockStats,
    setStats: mockSetStats,
    onSaveCurrencyAndExp: mockOnSaveCurrencyAndExp,
    onSaveExtraData: mockOnSaveExtraData,
    onSaveCharacterBasicInfo: mockOnSaveCharacterBasicInfo,
    onSaveAbilityScores: mockOnSaveAbilityScores,
    onSaveSavingThrowProficiencies: mockOnSaveSavingThrowProficiencies,
  };

  it('經驗值 modal：開啟、輸入、套用後應呼叫 onSaveCurrencyAndExp 並更新 setStats', async () => {
    render(<CharacterSheet {...defaultProps} />);
    fireEvent.click(screen.getByText('經驗值'));
    await waitFor(() => {
      expect(screen.getByText('修改經驗值')).toBeInTheDocument();
    });
    const input = screen.getByPlaceholderText('6500');
    fireEvent.change(input, { target: { value: '14000' } });
    fireEvent.click(screen.getByText('套用'));
    await waitFor(() => {
      expect(mockOnSaveCurrencyAndExp).toHaveBeenCalledWith(150, 14000);
      expect(mockSetStats).toHaveBeenCalled();
    });
  });

  it('金幣 modal：開啟、輸入、套用後應更新 setStats 並呼叫 onSaveCurrencyAndExp', async () => {
    render(<CharacterSheet {...defaultProps} />);
    fireEvent.click(screen.getByText('金幣'));
    await waitFor(() => {
      expect(screen.getByText('修改資金')).toBeInTheDocument();
    });
    const input = document.querySelector('input[placeholder*="150"]') || screen.getByRole('textbox', { name: '' });
    const inputs = screen.getAllByRole('textbox');
    const gpInput = inputs.find((el) => (el as HTMLInputElement).placeholder?.includes('150')) ?? inputs[0];
    fireEvent.change(gpInput, { target: { value: '200' } });
    fireEvent.click(screen.getByText('套用'));
    await waitFor(() => {
      expect(mockOnSaveCurrencyAndExp).toHaveBeenCalledWith(200, 6500);
      expect(mockSetStats).toHaveBeenCalled();
    });
  });

  it('編輯角色資料 modal：開啟後可看到名稱與職業等級區塊', async () => {
    render(<CharacterSheet {...defaultProps} />);
    fireEvent.click(screen.getByText('測試角色'));
    await waitFor(() => {
      expect(screen.getByText('編輯角色資料')).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue('測試角色')).toBeInTheDocument();
    expect(screen.getByText('職業與等級')).toBeInTheDocument();
  });

  it('編輯角色資料 modal：無 characterId 時點擊儲存不會呼叫 onSaveCharacterBasicInfo（早期 return）', async () => {
    render(<CharacterSheet {...defaultProps} />);
    fireEvent.click(screen.getByText('測試角色'));
    await waitFor(() => {
      expect(screen.getByText('編輯角色資料')).toBeInTheDocument();
    });
    const nameInput = screen.getByDisplayValue('測試角色');
    fireEvent.change(nameInput, { target: { value: '新名字' } });
    fireEvent.click(screen.getByText('儲存'));
    await waitFor(() => {
      expect(mockOnSaveCharacterBasicInfo).not.toHaveBeenCalled();
    });
  });

  it('修整期 modal：開啟、輸入、套用後應呼叫 onSaveExtraData 並 setStats', async () => {
    render(<CharacterSheet {...defaultProps} />);
    const downtimeRows = screen.getAllByText('修整期');
    fireEvent.click(downtimeRows[0].closest('div')!);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '套用' })).toBeInTheDocument();
    });
    const inputs = screen.getAllByRole('textbox');
    const downtimeInput = inputs.find((i) => (i as HTMLInputElement).placeholder === '5') ?? inputs[0];
    fireEvent.change(downtimeInput, { target: { value: '10' } });
    fireEvent.click(screen.getByText('套用'));
    await waitFor(() => {
      expect(mockOnSaveExtraData).toHaveBeenCalled();
      expect(mockSetStats).toHaveBeenCalled();
    });
  });

  it('名聲 modal：開啟、輸入使用/累計、儲存後應呼叫 onSaveExtraData 並 setStats', async () => {
    render(<CharacterSheet {...defaultProps} />);
    const renownRows = screen.getAllByText('名聲');
    fireEvent.click(renownRows[0].closest('div')!);
    await waitFor(() => {
      expect(screen.getByText('名聲 (使用)')).toBeInTheDocument();
    });
    const usedLabel = screen.getByText('名聲 (使用)');
    const usedInput = usedLabel.parentElement?.querySelector('input') ?? screen.getAllByRole('textbox')[0];
    fireEvent.change(usedInput, { target: { value: '3' } });
    fireEvent.click(screen.getByText('儲存'));
    await waitFor(() => {
      expect(mockOnSaveExtraData).toHaveBeenCalled();
      expect(mockSetStats).toHaveBeenCalled();
    });
  });

  it('能力值 modal：點擊屬性後開啟，儲存應呼叫 onSaveAbilityScores 與 onSaveSavingThrowProficiencies', async () => {
    render(<CharacterSheet {...defaultProps} />);
    fireEvent.click(screen.getByText('力量'));
    await waitFor(() => {
      expect(screen.getByText('基礎值')).toBeInTheDocument();
    });
    const saveButtons = screen.getAllByText('儲存');
    fireEvent.click(saveButtons[saveButtons.length - 1]);
    await waitFor(() => {
      expect(mockOnSaveAbilityScores).toHaveBeenCalled();
      expect(mockOnSaveSavingThrowProficiencies).toHaveBeenCalled();
    });
  });

  it('新增紀錄 modal：開啟、填寫名稱與數值、新增後應呼叫 onSaveExtraData 並 setStats', async () => {
    render(<CharacterSheet {...defaultProps} />);
    fireEvent.click(screen.getByText('+'));
    await waitFor(() => {
      expect(screen.getByText('新增紀錄')).toBeInTheDocument();
    });
    const inputs = screen.getAllByRole('textbox');
    const nameInput = inputs.find((i) => (i as HTMLInputElement).placeholder?.includes('皇家')) ?? inputs[0];
    const valueInput = inputs.find((i) => (i as HTMLInputElement).placeholder?.includes('1')) ?? inputs[1];
    fireEvent.change(nameInput, { target: { value: '新紀錄' } });
    fireEvent.change(valueInput, { target: { value: '10' } });
    fireEvent.click(screen.getByText('新增'));
    await waitFor(() => {
      expect(mockOnSaveExtraData).toHaveBeenCalled();
      expect(mockSetStats).toHaveBeenCalled();
    });
  });

  it('編輯紀錄 modal：點擊紀錄開啟、修改後更新應呼叫 onSaveExtraData', async () => {
    render(<CharacterSheet {...defaultProps} />);
    fireEvent.click(screen.getByText('完成任務'));
    await waitFor(() => {
      expect(screen.getByText('編輯紀錄')).toBeInTheDocument();
    });
    const nameInput = screen.getByDisplayValue('完成任務');
    fireEvent.change(nameInput, { target: { value: '已完成任務' } });
    fireEvent.click(screen.getByText('更新'));
    await waitFor(() => {
      expect(mockOnSaveExtraData).toHaveBeenCalled();
      expect(mockSetStats).toHaveBeenCalled();
    });
  });

  it('各 modal 取消按鈕應關閉 modal 且不呼叫儲存', async () => {
    render(<CharacterSheet {...defaultProps} />);
    fireEvent.click(screen.getByText('經驗值'));
    await waitFor(() => {
      expect(screen.getByText('修改經驗值')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('取消'));
    await waitFor(() => {
      expect(screen.queryByText('修改經驗值')).not.toBeInTheDocument();
    });
    expect(mockOnSaveCurrencyAndExp).not.toHaveBeenCalled();
  });
});
