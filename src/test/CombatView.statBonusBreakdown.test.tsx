import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CombatView } from '../../components/CombatView';
import { HybridDataManager } from '../../services/hybridDataManager';
import type { CharacterStats } from '../../types';

// 架構健檢問題9：AC/先攻/速度/攻擊命中 等戰鬥屬性的「加值來源」明細，原本各自用內嵌 flatMap
// 重複計算，改為呼叫 utils/characterAttributes.ts 的 getBonusValue/getStatBonusSourcesBreakdown。
// 這裡驗證抽取後，畫面顯示的加值明細與最終總計仍然正確。

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

describe('CombatView - 戰鬥屬性加值來源明細（問題9重構）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    localStorageMock.setItem('current_character_id', 'test-character-123');
    mockHybridDataManager.getCombatItems.mockResolvedValue([]);
  });

  const baseStats: CharacterStats = {
    name: 'Test',
    class: '戰士',
    level: 5,
    exp: 0,
    hp: { current: 30, max: 30, temp: 0 },
    hitDice: { current: 5, total: 5, die: 'd10' },
    ac: { basic: 10, bonus: 1 } as any,
    initiative: 0,
    speed: 30,
    abilityScores: { str: 10, dex: 14, con: 10, int: 10, wis: 10, cha: 10 },
    proficiencies: {},
    savingProficiencies: [],
    downtime: 0,
    renown: { used: 0, total: 0 },
    prestige: { org: '', level: 0, rankName: '' },
    attacks: [],
    currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    customRecords: [],
    extraData: {
      statBonusSources: [
        { id: 'shield', type: 'item', name: '護盾', combatStats: { ac: 2 } },
      ],
    } as any,
  };

  const defaultProps = {
    setStats: vi.fn(),
    characterId: 'test-character-123',
    onSaveAC: vi.fn().mockResolvedValue(true),
  };

  it('AC 編輯彈窗：加值來源應包含敏捷調整值、statBonusSources 明細、其他加值，且最終總計正確', async () => {
    render(<CombatView {...defaultProps} stats={baseStats} />);

    await waitFor(() => {
      expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('AC'));

    await waitFor(() => {
      expect(screen.getByText('敏捷調整值')).toBeInTheDocument();
      expect(screen.getByText('護盾')).toBeInTheDocument();
      expect(screen.getByText('其他加值')).toBeInTheDocument();
    });

    // AC = basic(10) + 敏捷調整值(+2) + 護盾(+2) + 其他加值(+1) = 15
    expect(screen.getByText('最終總計')).toBeInTheDocument();
    expect(screen.getAllByText('15').length).toBeGreaterThanOrEqual(1);
  });

  it('攻擊命中彈窗：加值來源應包含 statBonusSources 明細（非零才顯示）', async () => {
    const stats: CharacterStats = {
      ...baseStats,
      attackHit: { basic: 0, bonus: 0 } as any,
      extraData: {
        statBonusSources: [
          { id: 'ring', type: 'item', name: '戰爭指環', combatStats: { attackHit: 1 } },
          { id: 'noop', type: 'item', name: '無關能力', combatStats: { attackHit: 0 } },
        ],
      } as any,
    };

    render(<CombatView {...defaultProps} stats={stats} />);

    await waitFor(() => {
      expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('攻擊命中'));

    await waitFor(() => {
      expect(screen.getByText('戰爭指環')).toBeInTheDocument();
      expect(screen.queryByText('無關能力')).not.toBeInTheDocument();
    });
  });
});
