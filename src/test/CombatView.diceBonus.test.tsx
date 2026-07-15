import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CombatView } from '../../components/CombatView';
import { HybridDataManager } from '../../services/hybridDataManager';
import type { CharacterStats } from '../../types';

// 骰子記法戰鬥屬性加成（如 "1d8"）應同步顯示在戰鬥頁的方塊摘要與詳細 modal 裡，
// 且不影響原本的數字加總邏輯。

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

describe('CombatView - 骰子記法戰鬥屬性加成顯示', () => {
  const baseStats: CharacterStats = {
    name: 'Test',
    class: '戰士',
    level: 5,
    exp: 0,
    hp: { current: 30, max: 30, temp: 0 },
    hitDice: { current: 5, total: 5, die: 'd10' },
    ac: { basic: 10, bonus: 0 } as any,
    initiative: 0,
    speed: 30,
    abilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    proficiencies: {},
    savingProficiencies: [],
    downtime: 0,
    renown: { used: 0, total: 0 },
    prestige: { org: '', level: 0, rankName: '' },
    attacks: [],
    currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    customRecords: [],
  };

  const defaultProps = {
    setStats: vi.fn(),
    characterId: 'test-character-123',
    onSaveAC: vi.fn().mockResolvedValue(true),
    onSaveWeaponDamageBonus: vi.fn().mockResolvedValue(true),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    localStorageMock.setItem('current_character_id', 'test-character-123');
  });

  it('AC 方塊摘要只有一個骰子項時，直接接在主數字後面、維持單行（不需要換行）', async () => {
    mockHybridDataManager.getCombatItems.mockResolvedValue([]);
    const stats: CharacterStats = {
      ...baseStats,
      extraData: {
        statBonusSources: [{ id: 'ring', type: 'item', name: '護盾之戒', combatStats: { ac: '1d4' } }],
      } as any,
    };
    render(<CombatView {...defaultProps} stats={stats} />);

    await waitFor(() => {
      expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
    });

    // AC = basic(10) + dex mod(0) = 10；只有一個骰子項時直接串接成同一段文字，不拆巢狀 span
    const acLabel = screen.getByText('AC');
    const acCard = acLabel.parentElement as HTMLElement;
    expect(acCard.textContent).toBe('AC10+1d4');
    expect(screen.getByText('10+1d4')).toBeInTheDocument();
  });

  it('AC 詳細 modal 顯示骰子來源文字，最終總計接骰子字尾', async () => {
    mockHybridDataManager.getCombatItems.mockResolvedValue([]);
    const stats: CharacterStats = {
      ...baseStats,
      extraData: {
        statBonusSources: [{ id: 'ring', type: 'item', name: '護盾之戒', combatStats: { ac: '1d4' } }],
      } as any,
    };
    render(<CombatView {...defaultProps} stats={stats} />);

    await waitFor(() => {
      expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
    });

    const acLabel = screen.getByText('AC');
    fireEvent.click(acLabel.parentElement as HTMLElement);

    await waitFor(() => {
      expect(screen.getByText('護盾之戒')).toBeInTheDocument();
      expect(screen.getByText('1d4')).toBeInTheDocument();
    });
    expect(screen.getByText('+10+1d4')).toBeInTheDocument();
  });

  it('攻擊傷害方塊摘要只有一個骰子項時，直接接在主數字後面、維持單行', async () => {
    mockHybridDataManager.getCombatItems.mockResolvedValue([]);
    const stats: CharacterStats = {
      ...baseStats,
      attackDamage: { basic: 0, bonus: 0 } as any,
      extraData: {
        statBonusSources: [{ id: 'crystal', type: 'item', name: '雷狼結晶', combatStats: { attackDamage: '1d8' } }],
      } as any,
    };
    render(<CombatView {...defaultProps} stats={stats} />);

    await waitFor(() => {
      expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
    });

    // attackDamage = basic(0) + str mod(0) = 0；只有一個骰子項時直接串接成同一段文字
    const dmgLabel = screen.getByText('攻擊傷害');
    const dmgCard = dmgLabel.parentElement as HTMLElement;
    expect(dmgCard.textContent).toBe('攻擊傷害+0+1d8');
    expect(screen.getByText('+0+1d8')).toBeInTheDocument();
  });

  it('攻擊傷害方塊摘要有兩個以上不同點數的骰子項時，拆成獨立一行並置中（避免撐爆方塊）', async () => {
    mockHybridDataManager.getCombatItems.mockResolvedValue([]);
    const stats: CharacterStats = {
      ...baseStats,
      attackDamage: { basic: 0, bonus: 0 } as any,
      extraData: {
        statBonusSources: [
          { id: 'crystal', type: 'item', name: '雷狼結晶', combatStats: { attackDamage: '1d12' } },
          { id: 'ability', type: 'ability', name: '測試骰子效果能力', combatStats: { attackDamage: '1d6' } },
        ],
      } as any,
    };
    render(<CombatView {...defaultProps} stats={stats} />);

    await waitFor(() => {
      expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
    });

    // attackDamage 主數字 +0 獨立顯示，骰子字尾 +1d12+1d6 在另一個置中的巢狀 <span> 裡
    const dmgLabel = screen.getByText('攻擊傷害');
    const dmgCard = dmgLabel.parentElement as HTMLElement;
    expect(dmgCard.textContent).toBe('攻擊傷害+0+1d12+1d6');
    const diceSpan = screen.getByText('+1d12+1d6');
    expect(diceSpan.tagName).toBe('SPAN');
    expect(diceSpan.className).toMatch(/text-center/);
    // 外層數值 span（包住 "+0" 主數字與骰子字尾巢狀 span 的容器）也要置中，
    // 否則巢狀 block span 會把外層拆成匿名 block box，導致主數字那一行預設靠左
    // （jsdom 不做實際版面計算，這裡只能斷言 class 存在，無法斷言真正置中；
    // 實際置中效果仍需在瀏覽器中肉眼確認）
    const outerValueSpan = diceSpan.parentElement as HTMLElement;
    expect(outerValueSpan.className).toMatch(/text-center/);
  });

  it('骰子項超過兩個時，每行最多兩項、第三個以上換到下一行（避免單行過長撐爆方塊）', async () => {
    mockHybridDataManager.getCombatItems.mockResolvedValue([]);
    const stats: CharacterStats = {
      ...baseStats,
      attackDamage: { basic: 0, bonus: 0 } as any,
      extraData: {
        statBonusSources: [
          { id: 'a', type: 'item', name: '來源A', combatStats: { attackDamage: '1d20' } },
          { id: 'b', type: 'item', name: '來源B', combatStats: { attackDamage: '1d12' } },
          { id: 'c', type: 'item', name: '來源C', combatStats: { attackDamage: '1d6' } },
          { id: 'd', type: 'item', name: '來源D', combatStats: { attackDamage: '1d4' } },
        ],
      } as any,
    };
    render(<CombatView {...defaultProps} stats={stats} />);

    await waitFor(() => {
      expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
    });

    // 4 個骰子項 -> 拆成兩行，每行兩項：+1d20+1d12、+1d6+1d4
    const dmgLabel = screen.getByText('攻擊傷害');
    const dmgCard = dmgLabel.parentElement as HTMLElement;
    expect(dmgCard.textContent).toBe('攻擊傷害+0+1d20+1d12+1d6+1d4');
    const line1 = screen.getByText('+1d20+1d12');
    const line2 = screen.getByText('+1d6+1d4');
    expect(line1.tagName).toBe('SPAN');
    expect(line2.tagName).toBe('SPAN');
    expect(line1.className).toMatch(/text-center/);
    expect(line2.className).toMatch(/text-center/);
  });

  it('骰子項為三個時，第一行兩項、第二行一項', async () => {
    mockHybridDataManager.getCombatItems.mockResolvedValue([]);
    const stats: CharacterStats = {
      ...baseStats,
      attackDamage: { basic: 0, bonus: 0 } as any,
      extraData: {
        statBonusSources: [
          { id: 'a', type: 'item', name: '來源A', combatStats: { attackDamage: '1d20' } },
          { id: 'b', type: 'item', name: '來源B', combatStats: { attackDamage: '1d12' } },
          { id: 'c', type: 'item', name: '來源C', combatStats: { attackDamage: '1d6' } },
        ],
      } as any,
    };
    render(<CombatView {...defaultProps} stats={stats} />);

    await waitFor(() => {
      expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
    });

    const dmgLabel = screen.getByText('攻擊傷害');
    const dmgCard = dmgLabel.parentElement as HTMLElement;
    expect(dmgCard.textContent).toBe('攻擊傷害+0+1d20+1d12+1d6');
    expect(screen.getByText('+1d20+1d12')).toBeInTheDocument();
    expect(screen.getByText('+1d6')).toBeInTheDocument();
  });

  it('攻擊傷害詳細 modal 顯示骰子來源文字，最終總計接骰子字尾', async () => {
    mockHybridDataManager.getCombatItems.mockResolvedValue([]);
    const stats: CharacterStats = {
      ...baseStats,
      attackDamage: { basic: 0, bonus: 0 } as any,
      extraData: {
        statBonusSources: [{ id: 'crystal', type: 'item', name: '雷狼結晶', combatStats: { attackDamage: '1d8' } }],
      } as any,
    };
    render(<CombatView {...defaultProps} stats={stats} />);

    await waitFor(() => {
      expect(screen.queryByText('正在載入戰鬥資料...')).not.toBeInTheDocument();
    });

    const dmgLabel = screen.getByText('攻擊傷害');
    fireEvent.click(dmgLabel.parentElement as HTMLElement);

    await waitFor(() => {
      expect(screen.getByText('雷狼結晶')).toBeInTheDocument();
      expect(screen.getByText('1d8')).toBeInTheDocument();
    });
    // 方塊摘要（單一骰子項時不拆行）與 modal 的最終總計都會顯示 "+0+1d8"，故至少會有 2 筆
    expect(screen.getAllByText('+0+1d8').length).toBeGreaterThanOrEqual(2);
  });
});
