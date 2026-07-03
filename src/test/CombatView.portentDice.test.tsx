/**
 * CombatView - 預言學派法師「預言骰」整合測試
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
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

describe('CombatView - 預言骰', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    mockHybridDataManager.getCombatItems.mockResolvedValue([]);
  });

  function createDivinationWizardStats(overrides: Partial<CharacterStats> = {}): CharacterStats {
    return {
      hp: { current: 20, max: 20, temp: 0 },
      ac: 12,
      initiative: 1,
      speed: 30,
      class: '法師',
      level: 5,
      classes: [{ name: '法師', level: 5, hitDie: 'd6', isPrimary: true, subclassName: '預言學派' }],
      abilityScores: { str: 8, dex: 12, con: 12, int: 16, wis: 10, cha: 8 },
      hitDice: { current: 5, total: 5, die: 'd6' },
      ...overrides,
    } as unknown as CharacterStats;
  }

  const baseProps = {
    setStats: vi.fn(),
    characterId: 'char-1',
    onSaveHP: vi.fn().mockResolvedValue(true),
    onSaveAC: vi.fn().mockResolvedValue(true),
    onSaveInitiative: vi.fn().mockResolvedValue(true),
  };

  it('非預言學派法師（如戰士）不顯示預言骰區塊', async () => {
    const stats = {
      hp: { current: 20, max: 20, temp: 0 },
      ac: 15,
      initiative: 1,
      speed: 30,
      class: '戰士',
      level: 5,
      classes: [{ name: '戰士', level: 5, hitDie: 'd10', isPrimary: true }],
      abilityScores: { str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 8 },
      hitDice: { current: 5, total: 5, die: 'd10' },
    } as unknown as CharacterStats;

    render(<CombatView {...baseProps} stats={stats} />);

    await waitFor(() => {
      expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
    });

    expect(screen.queryByText('預言骰')).not.toBeInTheDocument();
  });

  it('1 等預言學派法師（尚未取得特性）不顯示預言骰區塊', async () => {
    const stats = createDivinationWizardStats({
      level: 1,
      classes: [{ name: '法師', level: 1, hitDie: 'd6', isPrimary: true, subclassName: '預言學派' } as any],
    });

    render(<CombatView {...baseProps} stats={stats} />);

    await waitFor(() => {
      expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
    });

    expect(screen.queryByText('預言骰')).not.toBeInTheDocument();
  });

  it('5 等預言學派法師顯示 2 顆預言骰，數值取自 extraData.portentDice', async () => {
    const stats = createDivinationWizardStats({
      extraData: { portentDice: [{ value: 16, used: false }, { value: 7, used: true }] } as any,
    });

    render(<CombatView {...baseProps} stats={stats} />);

    await waitFor(() => {
      expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('預言骰')).toBeInTheDocument();
    expect(screen.getByText('16')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('已使用')).toBeInTheDocument();
  });

  it('14 等預言學派法師顯示 3 顆預言骰，且不換行（同一個 grid-cols-3 容器內）', async () => {
    const stats = createDivinationWizardStats({
      level: 14,
      classes: [{ name: '法師', level: 14, hitDie: 'd6', isPrimary: true, subclassName: '預言學派' } as any],
      extraData: { portentDice: [{ value: 5, used: false }, { value: 12, used: false }, { value: 20, used: false }] } as any,
    });

    render(<CombatView {...baseProps} stats={stats} />);

    await waitFor(() => {
      expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
    });

    const sectionTitle = screen.getByText('預言骰');
    const section = sectionTitle.closest('.shadow-inner')!;
    const container = section.querySelector('.grid')!;
    expect(container).toHaveClass('grid-cols-3');
    expect(within(container as HTMLElement).getByText('5')).toBeInTheDocument();
    expect(within(container as HTMLElement).getByText('12')).toBeInTheDocument();
    expect(within(container as HTMLElement).getByText('20')).toBeInTheDocument();
  });

  it('點擊可使用的骰子會開啟確認彈窗，確認後該骰標記為已使用並呼叫 onSaveExtraData', async () => {
    const setStats = vi.fn();
    const onSaveExtraData = vi.fn().mockResolvedValue(true);
    const stats = createDivinationWizardStats({
      extraData: { portentDice: [{ value: 16, used: false }, { value: 9, used: false }] } as any,
    });

    render(<CombatView {...baseProps} stats={stats} setStats={setStats} onSaveExtraData={onSaveExtraData} />);

    await waitFor(() => {
      expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('16'));
    expect(screen.getByText('確定使用預言骰？')).toBeInTheDocument();

    fireEvent.click(screen.getByText('確定使用'));

    await waitFor(() => {
      expect(onSaveExtraData).toHaveBeenCalledWith(
        expect.objectContaining({
          portentDice: [{ value: 16, used: true }, { value: 9, used: false }],
        })
      );
    });
    expect(setStats).toHaveBeenCalled();
  });

  it('已使用的骰子按鈕為 disabled，點擊不會開啟確認彈窗', async () => {
    const stats = createDivinationWizardStats({
      extraData: { portentDice: [{ value: 16, used: false }, { value: 7, used: true }] } as any,
    });

    render(<CombatView {...baseProps} stats={stats} />);

    await waitFor(() => {
      expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
    });

    const usedButton = screen.getByText('7').closest('button')!;
    expect(usedButton).toBeDisabled();
    fireEvent.click(usedButton);
    expect(screen.queryByText('確定使用預言骰？')).not.toBeInTheDocument();
  });

  it('長休完成後應開啟預言骰重骰彈窗；輸入新數值後整組換新並重置為未使用', async () => {
    const setStats = vi.fn();
    const onSaveExtraData = vi.fn().mockResolvedValue(true);
    const stats = createDivinationWizardStats({
      extraData: { portentDice: [{ value: 16, used: true }, { value: 7, used: true }] } as any,
    });

    render(<CombatView {...baseProps} stats={stats} setStats={setStats} onSaveExtraData={onSaveExtraData} />);

    await waitFor(() => {
      expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('🏕️'));
    fireEvent.click(screen.getByText('長休 (Long Rest)'));
    fireEvent.click(screen.getByText('確認長休'));

    await waitFor(() => {
      expect(screen.getByText('長休：輸入新的預言骰')).toBeInTheDocument();
    });

    const inputs = screen.getAllByPlaceholderText('1-20');
    fireEvent.change(inputs[0], { target: { value: '14' } });
    fireEvent.change(inputs[1], { target: { value: '3' } });
    fireEvent.click(screen.getByText('套用'));

    await waitFor(() => {
      expect(onSaveExtraData).toHaveBeenCalledWith(
        expect.objectContaining({
          portentDice: [{ value: 14, used: false }, { value: 3, used: false }],
        })
      );
    });
  });
});
