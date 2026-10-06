/**
 * CombatView - 戰鬥項目「長休骰」：長休時擲骰恢復（而不是補滿），並顯示擲骰結果
 */
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
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
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

const stats = {
  hp: { current: 10, max: 20, temp: 0 },
  ac: 15,
  initiative: 1,
  speed: 30,
  class: '戰士',
  level: 5,
  classes: [{ name: '戰士', level: 5, hitDie: 'd10', isPrimary: true }],
  abilityScores: { str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 8 },
  hitDice: { current: 2, total: 5, die: 'd10' },
} as unknown as CharacterStats;

const baseProps = {
  stats,
  setStats: vi.fn(),
  characterId: 'char-1',
  onSaveHP: vi.fn().mockResolvedValue(true),
  onSaveAC: vi.fn().mockResolvedValue(true),
  onSaveInitiative: vi.fn().mockResolvedValue(true),
};

const dbItem = (overrides: Record<string, unknown> = {}) => ({
  id: 'db-1',
  character_id: 'char-1',
  category: 'resource',
  name: '法術反制(護甲)',
  icon: '✨',
  current_uses: 1,
  max_uses: 8,
  recovery_type: 'long_rest',
  recovery_dice: '1d6',
  is_default: false,
  is_custom: true,
  ...overrides,
});

const loaded = async () => {
  render(<CombatView {...baseProps} />);
  await waitFor(() => expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument());
};

const performLongRest = () => {
  fireEvent.click(screen.getByText('🏕️'));
  fireEvent.click(screen.getByText('長休 (Long Rest)'));
  fireEvent.click(screen.getByText('確認長休'));
};

describe('CombatView - 長休骰', () => {
  let randomSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    mockHybrid.updateCombatItem.mockResolvedValue(true as never);
    randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5); // 1d6 → 4
  });
  afterEach(() => randomSpy.mockRestore());

  it('長休時長休骰項目改為擲骰增加次數（1 + 4 = 5），不會補滿到最大值', async () => {
    mockHybrid.getCombatItems.mockResolvedValue([dbItem()] as never);
    await loaded();
    performLongRest();

    await waitFor(() =>
      expect(mockHybrid.updateCombatItem).toHaveBeenCalledWith('db-1', { current_uses: 5 })
    );
    expect(mockHybrid.updateCombatItem).not.toHaveBeenCalledWith('db-1', { current_uses: 8 });
  });

  it('長休後顯示擲骰結果彈窗', async () => {
    mockHybrid.getCombatItems.mockResolvedValue([dbItem()] as never);
    await loaded();
    performLongRest();

    expect(await screen.findByText('法術反制(護甲)：擲 1d6 = 4，1 → 5')).toBeInTheDocument();
  });

  it('擲骰結果超過最大值時以最大值為上限', async () => {
    mockHybrid.getCombatItems.mockResolvedValue([dbItem({ current_uses: 6, max_uses: 8 })] as never);
    await loaded();
    performLongRest();

    await waitFor(() =>
      expect(mockHybrid.updateCombatItem).toHaveBeenCalledWith('db-1', { current_uses: 8 })
    );
  });

  it('一般長休項目（沒有骰子）仍然補滿，且沒有長休骰項目時不顯示擲骰結果彈窗', async () => {
    mockHybrid.getCombatItems.mockResolvedValue([dbItem({ recovery_dice: null })] as never);
    await loaded();
    performLongRest();

    await waitFor(() =>
      expect(mockHybrid.updateCombatItem).toHaveBeenCalledWith('db-1', { current_uses: 8 })
    );
    expect(screen.queryByText(/擲 1d6/)).not.toBeInTheDocument();
  });

  it('新增長休骰項目時，createCombatItem 帶 recovery_type=long_rest 與 recovery_dice', async () => {
    mockHybrid.getCombatItems.mockResolvedValue([]);
    mockHybrid.createCombatItem.mockResolvedValue({ id: 'new-1' } as never);
    await loaded();

    fireEvent.click(screen.getByText('⚙️'));
    const resourceSection = screen.getByText('職業資源').closest('div');
    fireEvent.click(resourceSection!.querySelector('button')!);
    fireEvent.change(screen.getByPlaceholderText('名稱'), { target: { value: '靈光' } });
    fireEvent.click(screen.getByRole('button', { name: '長休骰' }));
    fireEvent.click(screen.getByRole('button', { name: '1d8' }));
    fireEvent.click(screen.getByText('儲存'));

    await waitFor(() => expect(mockHybrid.createCombatItem).toHaveBeenCalled());
    expect(mockHybrid.createCombatItem.mock.calls[0][0]).toMatchObject({
      recovery_type: 'long_rest',
      recovery_dice: '1d8',
    });
  });

  it('新增一般項目時，recovery_dice 為 null', async () => {
    mockHybrid.getCombatItems.mockResolvedValue([]);
    mockHybrid.createCombatItem.mockResolvedValue({ id: 'new-2' } as never);
    await loaded();

    fireEvent.click(screen.getByText('⚙️'));
    const resourceSection = screen.getByText('職業資源').closest('div');
    fireEvent.click(resourceSection!.querySelector('button')!);
    fireEvent.change(screen.getByPlaceholderText('名稱'), { target: { value: '一般資源' } });
    fireEvent.click(screen.getByText('儲存'));

    await waitFor(() => expect(mockHybrid.createCombatItem).toHaveBeenCalled());
    expect(mockHybrid.createCombatItem.mock.calls[0][0]).toMatchObject({ recovery_dice: null });
  });
});
