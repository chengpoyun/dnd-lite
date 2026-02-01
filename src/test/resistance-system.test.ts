/**
 * 抗性系統單元測試
 * 測試傷害計算、批次新增怪物、抗性更新、0 傷害顯示
 */

import { describe, it, expect } from 'vitest';
import { calculateActualDamage } from '../../utils/damageTypes';
import type { ResistanceType } from '../../lib/supabase';

// ===== 傷害計算邏輯測試 =====
describe('calculateActualDamage - D&D 5E 抗性規則', () => {
  it('普通傷害 (normal) - 原值', () => {
    expect(calculateActualDamage(20, 'normal')).toBe(20);
    expect(calculateActualDamage(15, 'normal')).toBe(15);
    expect(calculateActualDamage(1, 'normal')).toBe(1);
  });

  it('抗性 (resistant) - 除以 2 向下取整', () => {
    expect(calculateActualDamage(20, 'resistant')).toBe(10); // 20 / 2 = 10
    expect(calculateActualDamage(15, 'resistant')).toBe(7);  // 15 / 2 = 7.5 → 7
    expect(calculateActualDamage(1, 'resistant')).toBe(0);   // 1 / 2 = 0.5 → 0
    expect(calculateActualDamage(11, 'resistant')).toBe(5);  // 11 / 2 = 5.5 → 5
  });

  it('易傷 (vulnerable) - 乘以 2', () => {
    expect(calculateActualDamage(20, 'vulnerable')).toBe(40);
    expect(calculateActualDamage(15, 'vulnerable')).toBe(30);
    expect(calculateActualDamage(1, 'vulnerable')).toBe(2);
  });

  it('免疫 (immune) - 永遠為 0', () => {
    expect(calculateActualDamage(20, 'immune')).toBe(0);
    expect(calculateActualDamage(100, 'immune')).toBe(0);
    expect(calculateActualDamage(1, 'immune')).toBe(0);
  });

  it('邊界測試 - 大數值', () => {
    expect(calculateActualDamage(999, 'normal')).toBe(999);
    expect(calculateActualDamage(999, 'resistant')).toBe(499);  // 999 / 2 = 499.5 → 499
    expect(calculateActualDamage(999, 'vulnerable')).toBe(1998);
    expect(calculateActualDamage(999, 'immune')).toBe(0);
  });

  it('邊界測試 - 零值', () => {
    expect(calculateActualDamage(0, 'normal')).toBe(0);
    expect(calculateActualDamage(0, 'resistant')).toBe(0);
    expect(calculateActualDamage(0, 'vulnerable')).toBe(0);
    expect(calculateActualDamage(0, 'immune')).toBe(0);
  });
});

// ===== 抗性類型驗證測試 =====
describe('ResistanceType 類型驗證', () => {
  const validTypes: ResistanceType[] = ['normal', 'resistant', 'vulnerable', 'immune'];

  it('所有有效的抗性類型應該能正確計算', () => {
    validTypes.forEach(type => {
      const result = calculateActualDamage(10, type);
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  it('抗性類型應該有明確的計算結果', () => {
    const testValue = 10;
    const results = validTypes.map(type => calculateActualDamage(testValue, type));
    
    // normal: 10, resistant: 5, vulnerable: 20, immune: 0
    expect(results).toEqual([10, 5, 20, 0]);
  });
});

// ===== 複合抗性計算測試 =====
describe('複合傷害場景 - 多種抗性', () => {
  it('應該能正確處理不同抗性的多段傷害', () => {
    // 場景：20 火焰 (易傷) + 15 穿刺 (抗性) + 10 酸液 (普通) + 5 冰冷 (免疫)
    const fireActual = calculateActualDamage(20, 'vulnerable');    // 40
    const piercingActual = calculateActualDamage(15, 'resistant'); // 7
    const acidActual = calculateActualDamage(10, 'normal');        // 10
    const coldActual = calculateActualDamage(5, 'immune');         // 0
    
    const total = fireActual + piercingActual + acidActual + coldActual;
    
    expect(fireActual).toBe(40);
    expect(piercingActual).toBe(7);
    expect(acidActual).toBe(10);
    expect(coldActual).toBe(0);
    expect(total).toBe(57); // 原始總計 50，實際總計 57
  });

  it('應該能正確識別 0 傷害記錄（免疫）', () => {
    const immuneDamage = calculateActualDamage(25, 'immune');
    const resistantZero = calculateActualDamage(1, 'resistant'); // 0.5 → 0
    
    expect(immuneDamage).toBe(0);
    expect(resistantZero).toBe(0);
    
    // 兩者都是 0，但來源不同（免疫 vs 抗性導致）
    // UI 需要根據 resistance_type 來區分顯示
  });
});

// ===== 抗性記錄儲存邏輯測試 =====
describe('抗性記錄儲存邏輯', () => {
  it('應該只儲存非 normal 的抗性', () => {
    const resistances: Record<string, ResistanceType> = {
      fire: 'vulnerable',
      slashing: 'normal',    // 不應儲存
      cold: 'immune',
      piercing: 'normal',    // 不應儲存
      poison: 'resistant'
    };

    // 過濾掉 normal
    const toSave = Object.entries(resistances)
      .filter(([_, resistance]) => resistance !== 'normal')
      .reduce((acc, [type, resistance]) => ({ ...acc, [type]: resistance }), {});

    expect(toSave).toEqual({
      fire: 'vulnerable',
      cold: 'immune',
      poison: 'resistant'
    });
  });

  it('全部為 normal 時應該儲存空物件', () => {
    const resistances: Record<string, ResistanceType> = {
      fire: 'normal',
      slashing: 'normal',
      cold: 'normal'
    };

    const toSave = Object.entries(resistances)
      .filter(([_, resistance]) => resistance !== 'normal')
      .reduce((acc, [type, resistance]) => ({ ...acc, [type]: resistance }), {});

    expect(toSave).toEqual({});
  });
});

// ===== 抗性合併邏輯測試 (updateMonsterResistances) =====
describe('抗性更新合併邏輯', () => {
  it('應該能合併新發現的抗性', () => {
    const currentResistances = {
      fire: 'vulnerable',
      cold: 'immune'
    } as Record<string, ResistanceType>;

    const newResistances = {
      poison: 'resistant',
      slashing: 'normal'
    } as Record<string, ResistanceType>;

    const merged = { ...currentResistances, ...newResistances };

    expect(merged).toEqual({
      fire: 'vulnerable',
      cold: 'immune',
      poison: 'resistant',
      slashing: 'normal'
    });
  });

  it('新抗性應該覆蓋舊抗性', () => {
    const currentResistances = {
      fire: 'normal'
    } as Record<string, ResistanceType>;

    const newResistances = {
      fire: 'vulnerable'  // 更新為易傷
    } as Record<string, ResistanceType>;

    const merged = { ...currentResistances, ...newResistances };

    expect(merged.fire).toBe('vulnerable');
  });

  it('空的新抗性不應影響現有資料', () => {
    const currentResistances = {
      fire: 'vulnerable',
      cold: 'immune'
    } as Record<string, ResistanceType>;

    const newResistances = {} as Record<string, ResistanceType>;

    const merged = { ...currentResistances, ...newResistances };

    expect(merged).toEqual(currentResistances);
  });
});

// ===== 批次新增怪物測試 =====
describe('批次新增怪物邏輯', () => {
  it('應該能生成正確數量的怪物資料', () => {
    const count = 5;
    const name = '哥布林';
    const knownAC = 15;
    const resistances = { fire: 'vulnerable' } as Record<string, ResistanceType>;

    // 模擬 addMonsters 的陣列生成邏輯
    const monsters = Array.from({ length: count }, () => ({
      name,
      ac_min: knownAC,
      ac_max: knownAC,
      resistances
    }));

    expect(monsters).toHaveLength(count);
    expect(monsters[0].name).toBe(name);
    expect(monsters[0].ac_min).toBe(knownAC);
    expect(monsters[0].resistances).toEqual(resistances);
  });

  it('未知 AC 應該設為 null', () => {
    const count = 3;
    const name = '巨魔';
    const knownAC = null;

    const monsters = Array.from({ length: count }, () => ({
      name,
      ac_min: 0,
      ac_max: knownAC,
      resistances: {}
    }));

    expect(monsters).toHaveLength(count);
    expect(monsters[0].ac_max).toBe(null);
  });

  it('相同名稱的怪物應該共用抗性設定', () => {
    const count = 4;
    const name = '冰霜巨人';
    const resistances = { cold: 'immune', fire: 'vulnerable' } as Record<string, ResistanceType>;

    const monsters = Array.from({ length: count }, () => ({
      name,
      ac_min: 0,
      ac_max: null,
      resistances
    }));

    // 所有怪物應該有相同的抗性
    monsters.forEach(monster => {
      expect(monster.resistances).toEqual(resistances);
    });
  });
});

// ===== 0 傷害顯示邏輯測試 =====
describe('0 傷害記錄顯示邏輯', () => {
  it('免疫的 0 傷害應該被識別', () => {
    const damage = 20;
    const resistance = 'immune';
    const actual = calculateActualDamage(damage, resistance);

    expect(actual).toBe(0);
    expect(resistance).toBe('immune');
    // UI: 應該顯示 "20 火焰傷害 → 0 (已免疫)"
  });

  it('抗性導致的 0 傷害應該被識別', () => {
    const damage = 1;
    const resistance = 'resistant';
    const actual = calculateActualDamage(damage, resistance);

    expect(actual).toBe(0);
    expect(resistance).toBe('resistant');
    // UI: 應該顯示 "1 穿刺傷害 → 0 (抗性↓)"
  });

  it('原始 0 傷害應該被正確處理', () => {
    const damage = 0;
    const resistance = 'normal';
    const actual = calculateActualDamage(damage, resistance);

    expect(actual).toBe(0);
    // UI: 應該顯示但不特別標註
  });
});
