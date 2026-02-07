/**
 * 傷害記錄編輯／刪除測試
 * 測試 updateDamageLog、updateDamageLogBatch、deleteDamageLog、deleteDamageLogBatch
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CombatService } from '../../services/combatService';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('傷害記錄編輯 - updateDamageLog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('應呼叫 combat_damage_logs update 並重算 total_damage，成功時回傳 success: true', async () => {
    const { supabase } = await import('../../lib/supabase');
    const logId = 'log-1';
    const monsterId = 'monster-1';
    const payload = { value: 15, type: 'slashing', resistanceType: 'normal' as const, originalValue: 15 };

    const mockEqId = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockUpdateLog = vi.fn().mockReturnValue({ eq: mockEqId });

    const mockEqMonster = vi.fn().mockReturnValue({
      then: (fn: (r: { data: { damage_value: number }[] }) => unknown) =>
        Promise.resolve(fn({ data: [{ damage_value: 10 }, { damage_value: 15 }] })),
    });
    const mockSelectLogs = vi.fn().mockReturnValue({ eq: mockEqMonster });

    const mockEqMonsterUpdate = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockUpdateMonster = vi.fn().mockReturnValue({ eq: mockEqMonsterUpdate });

    let callCount = 0;
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      callCount++;
      if (table === 'combat_damage_logs') {
        if (callCount === 1) return { update: mockUpdateLog } as any;
        return { select: mockSelectLogs } as any;
      }
      if (table === 'combat_monsters') return { update: mockUpdateMonster } as any;
      return {} as any;
    });

    const result = await CombatService.updateDamageLog(logId, monsterId, payload);

    expect(result.success).toBe(true);
    expect(supabase.from).toHaveBeenCalledWith('combat_damage_logs');
    expect(mockUpdateLog).toHaveBeenCalledWith({
      damage_value: payload.value,
      damage_value_origin: payload.originalValue,
      damage_type: payload.type,
      resistance_type: payload.resistanceType,
    });
    expect(mockEqId).toHaveBeenCalledWith('id', logId);
  });

  it('Supabase 回傳 error 時應回傳 success: false 與 error', async () => {
    const { supabase } = await import('../../lib/supabase');
    const mockEq = vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } });
    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockReturnValue({ eq: mockEq }),
    } as any);

    const result = await CombatService.updateDamageLog('log-1', 'monster-1', {
      value: 10,
      type: 'fire',
      resistanceType: 'normal',
      originalValue: 10,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('傷害記錄編輯 - updateDamageLogBatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('應依序更新多筆 log 並重算 total_damage 一次，成功時回傳 success: true', async () => {
    const { supabase } = await import('../../lib/supabase');
    const monsterId = 'monster-1';
    const updates = [
      { logId: 'log-a', value: 5, type: 'slashing', resistanceType: 'normal' as const, originalValue: 5 },
      { logId: 'log-b', value: 10, type: 'fire', resistanceType: 'resistant' as const, originalValue: 20 },
    ];

    const mockEq = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

    const mockSelectEq = vi.fn().mockResolvedValue({
      data: [{ damage_value: 5 }, { damage_value: 10 }],
      error: null,
    });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockSelectEq });

    const mockMonsterEq = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockMonsterUpdate = vi.fn().mockReturnValue({ eq: mockMonsterEq });

    let fromCallCount = 0;
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      fromCallCount++;
      if (table === 'combat_damage_logs') {
        if (fromCallCount <= 2) return { update: mockUpdate } as any;
        return { select: mockSelect } as any;
      }
      if (table === 'combat_monsters') return { update: mockMonsterUpdate } as any;
      return {} as any;
    });

    const result = await CombatService.updateDamageLogBatch(monsterId, updates);

    expect(result.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledTimes(2);
  });
});

describe('傷害記錄刪除 - deleteDamageLog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('應刪除該 log 並重算 total_damage，成功時回傳 success: true', async () => {
    const { supabase } = await import('../../lib/supabase');
    const mockEq = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });

    const mockSelectEq = vi.fn().mockResolvedValue({ data: [{ damage_value: 20 }], error: null });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockSelectEq });

    const mockMonsterEq = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockMonsterUpdate = vi.fn().mockReturnValue({ eq: mockMonsterEq });

    let callCount = 0;
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      callCount++;
      if (table === 'combat_damage_logs') {
        if (callCount === 1) return { delete: mockDelete } as any;
        return { select: mockSelect } as any;
      }
      if (table === 'combat_monsters') return { update: mockMonsterUpdate } as any;
      return {} as any;
    });

    const result = await CombatService.deleteDamageLog('log-1', 'monster-1');

    expect(result.success).toBe(true);
    expect(supabase.from).toHaveBeenCalledWith('combat_damage_logs');
    expect(mockDelete).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith('id', 'log-1');
  });
});

describe('傷害記錄刪除 - deleteDamageLogBatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('應刪除多筆 log 並重算 total_damage 一次，成功時回傳 success: true', async () => {
    const { supabase } = await import('../../lib/supabase');
    const mockIn = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockDelete = vi.fn().mockReturnValue({ in: mockIn });

    const mockSelectEq = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockSelectEq });

    const mockMonsterEq = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockMonsterUpdate = vi.fn().mockReturnValue({ eq: mockMonsterEq });

    let callCount = 0;
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      callCount++;
      if (table === 'combat_damage_logs') {
        if (callCount === 1) return { delete: mockDelete } as any;
        return { select: mockSelect } as any;
      }
      if (table === 'combat_monsters') return { update: mockMonsterUpdate } as any;
      return {} as any;
    });

    const result = await CombatService.deleteDamageLogBatch(['log-a', 'log-b'], 'monster-1');

    expect(result.success).toBe(true);
    expect(mockDelete).toHaveBeenCalled();
    expect(mockIn).toHaveBeenCalledWith('id', ['log-a', 'log-b']);
  });
});
