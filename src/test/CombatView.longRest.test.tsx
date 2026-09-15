/**
 * CombatView - 長休後暫時生命應歸零
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

describe('CombatView - 長休後暫時生命歸零', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    mockHybridDataManager.getCombatItems.mockResolvedValue([]);
  });

  function createStats(overrides: Partial<CharacterStats> = {}): CharacterStats {
    return {
      hp: { current: 10, max: 20, temp: 5 },
      ac: 15,
      initiative: 1,
      speed: 30,
      class: '戰士',
      level: 5,
      classes: [{ name: '戰士', level: 5, hitDie: 'd10', isPrimary: true }],
      abilityScores: { str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 8 },
      hitDice: { current: 2, total: 5, die: 'd10' },
      ...overrides,
    } as unknown as CharacterStats;
  }

  const performLongRest = async () => {
    fireEvent.click(screen.getByText('🏕️'));
    fireEvent.click(screen.getByText('長休 (Long Rest)'));
    fireEvent.click(screen.getByText('確認長休'));
  };

  it('長休後暫時生命歸零：setStats 寫入 hp.temp = 0', async () => {
    const setStats = vi.fn();
    const stats = createStats();

    render(
      <CombatView
        stats={stats}
        setStats={setStats}
        characterId="char-1"
        onSaveHP={vi.fn().mockResolvedValue(true)}
        onSaveAC={vi.fn().mockResolvedValue(true)}
        onSaveInitiative={vi.fn().mockResolvedValue(true)}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
    });

    await performLongRest();

    await waitFor(() => expect(setStats).toHaveBeenCalled());
    const updater = setStats.mock.calls[0][0];
    const nextStats = typeof updater === 'function' ? updater(stats) : updater;
    expect(nextStats.hp.temp).toBe(0);
  });

  it('長休後暫時生命歸零：onSaveHP 以 temp=0 寫回資料庫', async () => {
    const onSaveHP = vi.fn().mockResolvedValue(true);
    const stats = createStats();

    render(
      <CombatView
        stats={stats}
        setStats={vi.fn()}
        characterId="char-1"
        onSaveHP={onSaveHP}
        onSaveAC={vi.fn().mockResolvedValue(true)}
        onSaveInitiative={vi.fn().mockResolvedValue(true)}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
    });

    await performLongRest();

    await waitFor(() => {
      expect(onSaveHP).toHaveBeenCalledWith(expect.any(Number), 0);
    });
  });
});
