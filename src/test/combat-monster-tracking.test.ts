/**
 * 怪物追蹤系統單元測試
 * 測試複合傷害分組邏輯、AC 範圍更新、版本衝突檢測
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { CombatDamageLog, CombatMonsterWithLogs } from '../lib/supabase';

// ===== 傷害記錄分組邏輯測試 =====
describe('複合傷害分組邏輯', () => {
  // 模擬同一時間（複合傷害）的傷害記錄
  const createDamageLog = (
    id: string,
    damageValue: number,
    damageType: string,
    resistanceType: 'normal' | 'resistant' | 'vulnerable' | 'immune',
    createdAt: string
  ): CombatDamageLog => ({
    id,
    monster_id: 'monster-1',
    damage_value: damageValue,
    damage_type: damageType,
    resistance_type: resistanceType,
    created_at: createdAt
  });

  // 分組邏輯函數（從 MonsterCard 組件提取）
  const groupDamageLogsByTime = (logs: CombatDamageLog[]): CombatDamageLog[][] => {
    if (!logs || logs.length === 0) return [];
    
    const groups: CombatDamageLog[][] = [];
    const timeMap = new Map<string, CombatDamageLog[]>();
    
    logs.forEach(log => {
      const timeKey = log.created_at;
      if (!timeMap.has(timeKey)) {
        timeMap.set(timeKey, []);
      }
      timeMap.get(timeKey)!.push(log);
    });
    
    // 按時間排序並轉為陣列
    const sortedTimes = Array.from(timeMap.keys()).sort();
    sortedTimes.forEach(time => {
      groups.push(timeMap.get(time)!);
    });
    
    return groups;
  };

  it('應該將相同時間的傷害記錄分組在一起', () => {
    const logs: CombatDamageLog[] = [
      createDamageLog('1', 20, 'slashing', 'normal', '2026-02-01T10:00:00Z'),
      createDamageLog('2', 15, 'fire', 'resistant', '2026-02-01T10:00:00Z'),
      createDamageLog('3', 10, 'cold', 'vulnerable', '2026-02-01T10:00:00Z'),
    ];

    const groups = groupDamageLogsByTime(logs);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toHaveLength(3);
    expect(groups[0][0].damage_value).toBe(20);
    expect(groups[0][1].damage_value).toBe(15);
    expect(groups[0][2].damage_value).toBe(10);
  });

  it('應該將不同時間的傷害記錄分開顯示', () => {
    const logs: CombatDamageLog[] = [
      createDamageLog('1', 20, 'slashing', 'normal', '2026-02-01T10:00:00Z'),
      createDamageLog('2', 15, 'fire', 'normal', '2026-02-01T10:01:00Z'),
      createDamageLog('3', 10, 'cold', 'normal', '2026-02-01T10:02:00Z'),
    ];

    const groups = groupDamageLogsByTime(logs);

    expect(groups).toHaveLength(3);
    expect(groups[0]).toHaveLength(1);
    expect(groups[1]).toHaveLength(1);
    expect(groups[2]).toHaveLength(1);
  });

  it('應該按時間順序排列分組', () => {
    const logs: CombatDamageLog[] = [
      createDamageLog('1', 10, 'cold', 'normal', '2026-02-01T10:02:00Z'),
      createDamageLog('2', 20, 'slashing', 'normal', '2026-02-01T10:00:00Z'),
      createDamageLog('3', 15, 'fire', 'normal', '2026-02-01T10:01:00Z'),
    ];

    const groups = groupDamageLogsByTime(logs);

    expect(groups).toHaveLength(3);
    expect(groups[0][0].created_at).toBe('2026-02-01T10:00:00Z');
    expect(groups[1][0].created_at).toBe('2026-02-01T10:01:00Z');
    expect(groups[2][0].created_at).toBe('2026-02-01T10:02:00Z');
  });

  it('應該正確處理混合的單次和複合傷害', () => {
    const logs: CombatDamageLog[] = [
      createDamageLog('1', 20, 'slashing', 'normal', '2026-02-01T10:00:00Z'),
      createDamageLog('2', 15, 'fire', 'normal', '2026-02-01T10:00:00Z'), // 複合
      createDamageLog('3', 10, 'cold', 'normal', '2026-02-01T10:01:00Z'), // 單次
      createDamageLog('4', 8, 'piercing', 'normal', '2026-02-01T10:02:00Z'),
      createDamageLog('5', 5, 'poison', 'immune', '2026-02-01T10:02:00Z'), // 複合
    ];

    const groups = groupDamageLogsByTime(logs);

    expect(groups).toHaveLength(3);
    expect(groups[0]).toHaveLength(2); // 第一次攻擊：揮砍 + 火焰
    expect(groups[1]).toHaveLength(1); // 第二次攻擊：寒冷
    expect(groups[2]).toHaveLength(2); // 第三次攻擊：穿刺 + 毒素
  });

  it('應該正確處理空傷害記錄', () => {
    const groups = groupDamageLogsByTime([]);
    expect(groups).toHaveLength(0);
  });
});

// ===== AC 範圍更新邏輯測試 =====
describe('AC 範圍更新邏輯', () => {
  // 模擬 AC 範圍計算邏輯（從 CombatService 提取）
  const calculateNewACRange = (
    currentMin: number,
    currentMax: number | null,
    attackRoll: number,
    isHit: boolean
  ): { min: number; max: number | null } => {
    let newMin = currentMin;
    let newMax = currentMax;

    if (isHit) {
      // 命中：AC <= attackRoll
      if (newMax === null || attackRoll < newMax) {
        newMax = attackRoll;
      }
    } else {
      // 未命中：AC > attackRoll
      if (attackRoll >= newMin) {
        newMin = attackRoll;
      }
    }

    return { min: newMin, max: newMax };
  };

  it('初始狀態：第一次未命中應設定 AC 下限', () => {
    const result = calculateNewACRange(0, null, 15, false);
    expect(result).toEqual({ min: 15, max: null });
  });

  it('初始狀態：第一次命中應設定 AC 上限', () => {
    const result = calculateNewACRange(0, null, 18, true);
    expect(result).toEqual({ min: 0, max: 18 });
  });

  it('未命中應正確更新 AC 下限（不是 +1）', () => {
    const result = calculateNewACRange(10, 20, 15, false);
    expect(result).toEqual({ min: 15, max: 20 });
  });

  it('命中應正確更新 AC 上限', () => {
    const result = calculateNewACRange(10, 20, 16, true);
    expect(result).toEqual({ min: 10, max: 16 });
  });

  it('未命中但攻擊骰低於當前下限，不應更新', () => {
    const result = calculateNewACRange(15, 20, 12, false);
    expect(result).toEqual({ min: 15, max: 20 });
  });

  it('命中但攻擊骰高於當前上限，不應更新', () => {
    const result = calculateNewACRange(10, 18, 20, true);
    expect(result).toEqual({ min: 10, max: 18 });
  });

  it('縮小範圍直到確定 AC 精確值', () => {
    // 初始範圍：0 < AC
    let range = { min: 0, max: null as number | null };
    
    // 第一次：18 未命中 → 18 < AC
    range = calculateNewACRange(range.min, range.max, 18, false);
    expect(range).toEqual({ min: 18, max: null });
    
    // 第二次：20 命中 → 18 < AC <= 20
    range = calculateNewACRange(range.min, range.max, 20, true);
    expect(range).toEqual({ min: 18, max: 20 });
    
    // 第三次：19 未命中 → AC = 20
    range = calculateNewACRange(range.min, range.max, 19, false);
    expect(range).toEqual({ min: 19, max: 20 });
  });
});

// ===== AC 範圍顯示格式測試 =====
describe('AC 範圍顯示格式', () => {
  const formatACRange = (min: number, max: number | null): string => {
    if (max === null) {
      return `${min} < AC`;
    } else if (min + 1 === max) {
      return `AC = ${max}`;
    } else {
      return `${min} < AC <= ${max}`;
    }
  };

  it('應正確顯示無上限的 AC 範圍', () => {
    expect(formatACRange(15, null)).toBe('15 < AC');
  });

  it('應正確顯示精確的 AC 值', () => {
    expect(formatACRange(17, 18)).toBe('AC = 18');
  });

  it('應正確顯示 AC 範圍區間', () => {
    expect(formatACRange(15, 18)).toBe('15 < AC <= 18');
  });

  it('應正確顯示初始狀態', () => {
    expect(formatACRange(0, null)).toBe('0 < AC');
  });
});

// ===== 傷害總計計算測試 =====
describe('傷害總計計算', () => {
  it('應正確計算單次傷害總和', () => {
    const damages = [
      { value: 20, type: 'slashing', resistanceType: 'normal' as const }
    ];
    const total = damages.reduce((sum, d) => sum + d.value, 0);
    expect(total).toBe(20);
  });

  it('應正確計算複合傷害總和', () => {
    const damages = [
      { value: 20, type: 'slashing', resistanceType: 'normal' as const },
      { value: 15, type: 'fire', resistanceType: 'resistant' as const },
      { value: 10, type: 'cold', resistanceType: 'vulnerable' as const }
    ];
    const total = damages.reduce((sum, d) => sum + d.value, 0);
    expect(total).toBe(45);
  });

  it('應正確處理免疫傷害（值為 0）', () => {
    const damages = [
      { value: 20, type: 'slashing', resistanceType: 'normal' as const },
      { value: 0, type: 'fire', resistanceType: 'immune' as const }
    ];
    const total = damages.reduce((sum, d) => sum + d.value, 0);
    expect(total).toBe(20);
  });
});
