import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { CharacterSheet } from '../../components/CharacterSheet';
import type { CharacterStats } from '../../types';
import * as TemporaryConditionService from '../../services/temporaryConditionService';

vi.mock('../../services/temporaryConditionService');

const baseStats: CharacterStats = {
  name: '測試角色',
  class: '戰士',
  level: 5,
  exp: 0,
  hp: { current: 10, max: 10, temp: 0 },
  hitDice: { current: 5, total: 5, die: 'd10' },
  ac: 16,
  initiative: 2,
  speed: 30,
  abilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  proficiencies: {},
  savingProficiencies: [],
  downtime: 0,
  renown: { used: 0, total: 0 },
  attacks: [],
  currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
  customRecords: [],
} as unknown as CharacterStats;

const CHARACTER_ID = 'char-1';
const setStats = vi.fn();
const onLevelOrClassesSaved = vi.fn().mockResolvedValue(undefined);

const renderSheet = () =>
  render(
    <CharacterSheet
      stats={baseStats}
      setStats={setStats}
      characterId={CHARACTER_ID}
      onLevelOrClassesSaved={onLevelOrClassesSaved}
      onSaveCurrencyAndExp={vi.fn().mockResolvedValue(true)}
      onSaveExtraData={vi.fn().mockResolvedValue(true)}
      onSaveCharacterBasicInfo={vi.fn().mockResolvedValue(true)}
      onSaveAbilityScores={vi.fn().mockResolvedValue(true)}
      onSaveSavingThrowProficiencies={vi.fn().mockResolvedValue(true)}
    />
  );

describe('角色頁 - 臨時狀態', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    onLevelOrClassesSaved.mockResolvedValue(undefined);
    vi.mocked(TemporaryConditionService.getTemporaryConditions).mockResolvedValue({ success: true, conditions: [] });
  });

  it('沒有臨時狀態時只顯示單行標題列，不顯示提示語', async () => {
    renderSheet();
    await waitFor(() => expect(TemporaryConditionService.getTemporaryConditions).toHaveBeenCalledWith(CHARACTER_ID));

    expect(screen.getByText('臨時狀態')).toBeInTheDocument();
    expect(screen.queryByText(/目前沒有臨時狀態/)).not.toBeInTheDocument();
  });

  it('載入時已有臨時狀態則顯示為 chip，含名稱與 ✕ 按鈕', async () => {
    vi.mocked(TemporaryConditionService.getTemporaryConditions).mockResolvedValue({
      success: true,
      conditions: [
        {
          id: 'tc-1',
          character_id: CHARACTER_ID,
          name: '中毒',
          duration: '1 分鐘',
          description: '',
          affects_stats: false,
          stat_bonuses: {},
          created_at: '',
          updated_at: '',
        },
      ],
    });

    renderSheet();

    expect(await screen.findByText('中毒')).toBeInTheDocument();
    expect(screen.getByLabelText('刪除臨時狀態 中毒')).toBeInTheDocument();
  });

  it('新增臨時狀態：點擊 + 開啟表單，提交後呼叫 createTemporaryCondition 並刷新列表與角色數值', async () => {
    vi.mocked(TemporaryConditionService.createTemporaryCondition).mockResolvedValue({
      success: true,
      condition: {
        id: 'tc-2',
        character_id: CHARACTER_ID,
        name: '虛弱',
        duration: '',
        description: '',
        affects_stats: true,
        stat_bonuses: {},
        created_at: '',
        updated_at: '',
      },
    });

    renderSheet();
    await waitFor(() => expect(TemporaryConditionService.getTemporaryConditions).toHaveBeenCalled());

    fireEvent.click(screen.getByLabelText('新增臨時狀態'));
    const dialog = await screen.findByText('新增臨時狀態', { selector: 'h2' });
    const modal = dialog.closest('div.fixed') as HTMLElement;

    fireEvent.change(within(modal).getByPlaceholderText('例：中毒'), { target: { value: '虛弱' } });
    fireEvent.click(within(modal).getByText('新增'));

    await waitFor(() => {
      expect(TemporaryConditionService.createTemporaryCondition).toHaveBeenCalledWith(
        CHARACTER_ID,
        expect.objectContaining({ name: '虛弱' })
      );
    });
    await waitFor(() => expect(onLevelOrClassesSaved).toHaveBeenCalled());
  });

  it('刪除臨時狀態：點擊 ✕ 跳確認視窗，確認後呼叫 deleteTemporaryCondition 並移除 chip', async () => {
    vi.mocked(TemporaryConditionService.getTemporaryConditions).mockResolvedValue({
      success: true,
      conditions: [
        {
          id: 'tc-3',
          character_id: CHARACTER_ID,
          name: '流血',
          duration: '',
          description: '',
          affects_stats: false,
          stat_bonuses: {},
          created_at: '',
          updated_at: '',
        },
      ],
    });
    vi.mocked(TemporaryConditionService.deleteTemporaryCondition).mockResolvedValue({ success: true });

    renderSheet();
    await screen.findByText('流血');

    fireEvent.click(screen.getByLabelText('刪除臨時狀態 流血'));
    expect(await screen.findByText('確認刪除臨時狀態')).toBeInTheDocument();

    fireEvent.click(screen.getByText('確認刪除'));

    await waitFor(() => {
      expect(TemporaryConditionService.deleteTemporaryCondition).toHaveBeenCalledWith('tc-3');
    });
    await waitFor(() => expect(screen.queryByText('流血')).not.toBeInTheDocument());
    await waitFor(() => expect(onLevelOrClassesSaved).toHaveBeenCalled());
  });

  it('編輯臨時狀態：點擊 chip 本體開啟預填表單，儲存後呼叫 updateTemporaryCondition 並刷新列表與角色數值', async () => {
    vi.mocked(TemporaryConditionService.getTemporaryConditions).mockResolvedValue({
      success: true,
      conditions: [
        {
          id: 'tc-4',
          character_id: CHARACTER_ID,
          name: '虛弱',
          duration: '1 分鐘',
          description: '力量減弱',
          affects_stats: true,
          stat_bonuses: { abilityModifiers: { str: -2 } },
          created_at: '',
          updated_at: '',
        },
      ],
    });
    vi.mocked(TemporaryConditionService.updateTemporaryCondition).mockResolvedValue({ success: true });

    renderSheet();
    await screen.findByText('虛弱');

    fireEvent.click(screen.getByLabelText('編輯臨時狀態 虛弱'));
    const dialog = await screen.findByText('編輯臨時狀態', { selector: 'h2' });
    const modal = dialog.closest('div.fixed') as HTMLElement;

    expect(within(modal).getByPlaceholderText('例：中毒')).toHaveValue('虛弱');

    fireEvent.change(within(modal).getByPlaceholderText('例：1 分鐘'), { target: { value: '2 分鐘' } });
    fireEvent.click(within(modal).getByText('儲存'));

    await waitFor(() => {
      expect(TemporaryConditionService.updateTemporaryCondition).toHaveBeenCalledWith(
        'tc-4',
        expect.objectContaining({ name: '虛弱', duration: '2 分鐘' })
      );
    });
    await waitFor(() => expect(onLevelOrClassesSaved).toHaveBeenCalled());
  });
});
