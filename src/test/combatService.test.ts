import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import { supabase } from '../../lib/supabase';
import CombatService from '../../services/combatService';

function createChainable(finalResult: { data?: any; error: any }) {
  const builder: any = {
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve(finalResult)),
    maybeSingle: vi.fn(() => Promise.resolve(finalResult)),
    then: (resolve: any) => Promise.resolve(finalResult).then(resolve),
  };
  return builder;
}

describe('generateSessionCode', () => {
  it('永遠回傳 3 位數字字串（100-999）', () => {
    for (let i = 0; i < 50; i++) {
      const code = CombatService.generateSessionCode();
      expect(code).toMatch(/^\d{3}$/);
      const n = Number(code);
      expect(n).toBeGreaterThanOrEqual(100);
      expect(n).toBeLessThanOrEqual(999);
    }
  });
});

describe('createSession', () => {
  const mockedSupabase = supabase as unknown as { from: Mock };
  beforeEach(() => vi.clearAllMocks());

  it('代碼第一次就沒有衝突時，直接建立會話（只查詢一次是否重複）', async () => {
    const checkBuilder = createChainable({ data: null, error: null });
    const insertBuilder = createChainable({ data: { session_code: '123' }, error: null });
    mockedSupabase.from
      .mockReturnValueOnce(checkBuilder)
      .mockReturnValueOnce(insertBuilder);

    const result = await CombatService.createSession({ isAuthenticated: false, anonymousId: 'anon-1' });

    expect(result.success).toBe(true);
    expect(mockedSupabase.from).toHaveBeenCalledTimes(2);
  });

  it('代碼衝突 10 次都沒有找到可用代碼時，回傳失敗且不寫入 DB', async () => {
    mockedSupabase.from.mockImplementation(() =>
      createChainable({ data: { session_code: 'taken' }, error: null })
    );

    const result = await CombatService.createSession({ isAuthenticated: false, anonymousId: 'anon-1' });

    expect(result).toEqual({ success: false, error: '無法生成唯一戰鬥代碼' });
    // 10 次查重 + 沒有 insert
    expect(mockedSupabase.from).toHaveBeenCalledTimes(10);
  });

  it('已登入時使用 userId，anonymous_id 為 null', async () => {
    const checkBuilder = createChainable({ data: null, error: null });
    const insertBuilder = createChainable({ data: { session_code: '123' }, error: null });
    mockedSupabase.from
      .mockReturnValueOnce(checkBuilder)
      .mockReturnValueOnce(insertBuilder);

    await CombatService.createSession({ isAuthenticated: true, userId: 'user-1', anonymousId: 'anon-1' });

    expect(insertBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-1', anonymous_id: null })
    );
  });

  it('匿名時使用 anonymousId，user_id 為 null', async () => {
    const checkBuilder = createChainable({ data: null, error: null });
    const insertBuilder = createChainable({ data: { session_code: '123' }, error: null });
    mockedSupabase.from
      .mockReturnValueOnce(checkBuilder)
      .mockReturnValueOnce(insertBuilder);

    await CombatService.createSession({ isAuthenticated: false, anonymousId: 'anon-1' });

    expect(insertBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: null, anonymous_id: 'anon-1' })
    );
  });
});

describe('checkVersionConflict', () => {
  const mockedSupabase = supabase as unknown as { from: Mock };
  beforeEach(() => vi.clearAllMocks());

  it('DB 時間戳晚於本地時間戳時，判定為有衝突', async () => {
    mockedSupabase.from.mockReturnValue(
      createChainable({ data: { last_updated: '2026-01-01T10:00:00Z', is_active: true }, error: null })
    );

    const result = await CombatService.checkVersionConflict('123', '2026-01-01T09:00:00Z');

    expect(result.hasConflict).toBe(true);
  });

  it('DB 時間戳等於本地時間戳時，判定為無衝突（邊界：不含等於）', async () => {
    mockedSupabase.from.mockReturnValue(
      createChainable({ data: { last_updated: '2026-01-01T10:00:00Z', is_active: true }, error: null })
    );

    const result = await CombatService.checkVersionConflict('123', '2026-01-01T10:00:00Z');

    expect(result.hasConflict).toBe(false);
  });

  it('DB 時間戳早於本地時間戳時，判定為無衝突', async () => {
    mockedSupabase.from.mockReturnValue(
      createChainable({ data: { last_updated: '2026-01-01T08:00:00Z', is_active: true }, error: null })
    );

    const result = await CombatService.checkVersionConflict('123', '2026-01-01T09:00:00Z');

    expect(result.hasConflict).toBe(false);
  });

  it('查無此戰鬥會話時，視為有衝突（讓呼叫端得知戰鬥已不存在）', async () => {
    mockedSupabase.from.mockReturnValue(createChainable({ data: null, error: null }));

    const result = await CombatService.checkVersionConflict('999', '2026-01-01T09:00:00Z');

    expect(result.hasConflict).toBe(true);
  });

  it('查詢失敗時，保守判定為有衝突', async () => {
    mockedSupabase.from.mockReturnValue(createChainable({ data: null, error: { message: 'fail' } }));

    const result = await CombatService.checkVersionConflict('123', '2026-01-01T09:00:00Z');

    expect(result.hasConflict).toBe(true);
  });

  it('會一併回傳戰鬥是否仍在進行中（isActive）', async () => {
    mockedSupabase.from.mockReturnValue(
      createChainable({ data: { last_updated: '2026-01-01T08:00:00Z', is_active: false }, error: null })
    );

    const result = await CombatService.checkVersionConflict('123', '2026-01-01T09:00:00Z');

    expect(result.isActive).toBe(false);
  });
});

describe('updateACRange', () => {
  const mockedSupabase = supabase as unknown as { from: Mock };
  beforeEach(() => vi.clearAllMocks());

  it('怪物不存在時回傳失敗', async () => {
    mockedSupabase.from.mockReturnValue(createChainable({ data: null, error: null }));

    const result = await CombatService.updateACRange('m1', 15, true);

    expect(result).toEqual({ success: false, error: '怪物不存在' });
  });

  it('命中時，AC 上限收斂為目前上限與攻擊骰的較小值', async () => {
    const fetchBuilder = createChainable({
      data: { ac_min: 10, ac_max: 20, name: '哥布林', session_code: '123' },
      error: null,
    });
    const updateBuilder = createChainable({ data: null, error: null });
    mockedSupabase.from
      .mockReturnValueOnce(fetchBuilder)
      .mockReturnValueOnce(updateBuilder);

    const result = await CombatService.updateACRange('m1', 15, true);

    expect(result).toEqual({ success: true, newRange: { min: 10, max: 15 } });
  });

  it('命中且原本上限未知（null）時，直接以攻擊骰作為新上限', async () => {
    const fetchBuilder = createChainable({
      data: { ac_min: 10, ac_max: null, name: '哥布林', session_code: '123' },
      error: null,
    });
    const updateBuilder = createChainable({ data: null, error: null });
    mockedSupabase.from
      .mockReturnValueOnce(fetchBuilder)
      .mockReturnValueOnce(updateBuilder);

    const result = await CombatService.updateACRange('m1', 15, true);

    expect(result).toEqual({ success: true, newRange: { min: 10, max: 15 } });
  });

  it('未命中時，AC 下限收斂為目前下限與攻擊骰的較大值', async () => {
    const fetchBuilder = createChainable({
      data: { ac_min: 5, ac_max: 20, name: '哥布林', session_code: '123' },
      error: null,
    });
    const updateBuilder = createChainable({ data: null, error: null });
    mockedSupabase.from
      .mockReturnValueOnce(fetchBuilder)
      .mockReturnValueOnce(updateBuilder);

    const result = await CombatService.updateACRange('m1', 15, false);

    expect(result).toEqual({ success: true, newRange: { min: 15, max: 20 } });
  });

  it('新範圍下限大於上限（矛盾範圍）時回傳錯誤，不寫入 DB', async () => {
    const fetchBuilder = createChainable({
      data: { ac_min: 5, ac_max: 10, name: '哥布林', session_code: '123' },
      error: null,
    });
    mockedSupabase.from.mockReturnValueOnce(fetchBuilder);

    const result = await CombatService.updateACRange('m1', 15, false);

    expect(result).toEqual({ success: false, error: 'AC 範圍衝突，請檢查輸入' });
    expect(mockedSupabase.from).toHaveBeenCalledTimes(1);
  });
});

describe('setACRange', () => {
  const mockedSupabase = supabase as unknown as { from: Mock };
  beforeEach(() => vi.clearAllMocks());

  it('AC 值超出 0-99 範圍時回傳錯誤，不查詢 DB', async () => {
    expect(await CombatService.setACRange('m1', -1, 20)).toEqual({
      success: false,
      error: 'AC 下限與上限須在 0–99 之間',
    });
    expect(await CombatService.setACRange('m1', 10, 100)).toEqual({
      success: false,
      error: 'AC 下限與上限須在 0–99 之間',
    });
    expect(mockedSupabase.from).not.toHaveBeenCalled();
  });

  it('下限大於等於上限時回傳錯誤（邊界：相等也不合法）', async () => {
    const result = await CombatService.setACRange('m1', 15, 15);
    expect(result).toEqual({ success: false, error: 'AC 下限須小於上限' });
  });

  it('合法範圍時成功更新同名怪物', async () => {
    const fetchBuilder = createChainable({ data: { name: '哥布林', session_code: '123' }, error: null });
    const updateBuilder = createChainable({ data: null, error: null });
    mockedSupabase.from
      .mockReturnValueOnce(fetchBuilder)
      .mockReturnValueOnce(updateBuilder);

    const result = await CombatService.setACRange('m1', 10, 20);

    expect(result).toEqual({ success: true });
    expect(updateBuilder.update).toHaveBeenCalledWith({ ac_min: 10, ac_max: 20 });
  });
});

describe('addMonsters', () => {
  const mockedSupabase = supabase as unknown as { from: Mock };
  beforeEach(() => vi.clearAllMocks());

  it('同名怪物已存在時，沿用其 AC/HP/抗性，而非使用傳入的新值', async () => {
    const sameNameBuilder = createChainable({
      data: { ac_min: 12, ac_max: 18, max_hp: 30, resistances: { fire: 'resistant' } },
      error: null,
    });
    const existingBuilder = createChainable({ data: [{ monster_number: 2 }], error: null });
    const insertBuilder = createChainable({ data: [{ id: 'm1' }], error: null });
    mockedSupabase.from
      .mockReturnValueOnce(sameNameBuilder)
      .mockReturnValueOnce(existingBuilder)
      .mockReturnValueOnce(insertBuilder);

    await CombatService.addMonsters('123', '哥布林', 1, 99, 999, { cold: 'vulnerable' });

    expect(insertBuilder.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        ac_min: 12,
        ac_max: 18,
        max_hp: 30,
        resistances: { fire: 'resistant' },
        monster_number: 3,
      }),
    ]);
  });

  it('沒有同名怪物時，使用傳入的 AC/HP/抗性，且怪物編號從 1 開始（尚無任何怪物）', async () => {
    const sameNameBuilder = createChainable({ data: null, error: null });
    const existingBuilder = createChainable({ data: [], error: null });
    const insertBuilder = createChainable({ data: [{ id: 'm1' }, { id: 'm2' }], error: null });
    mockedSupabase.from
      .mockReturnValueOnce(sameNameBuilder)
      .mockReturnValueOnce(existingBuilder)
      .mockReturnValueOnce(insertBuilder);

    await CombatService.addMonsters('123', '地精', 2, 14, 20, undefined);

    expect(insertBuilder.insert).toHaveBeenCalledWith([
      expect.objectContaining({ monster_number: 1, ac_min: 14, ac_max: 14, max_hp: 20 }),
      expect.objectContaining({ monster_number: 2, ac_min: 14, ac_max: 14, max_hp: 20 }),
    ]);
  });

  it('AC 未知（null）且無同名怪物時，AC 範圍退回全範圍 0-99', async () => {
    const sameNameBuilder = createChainable({ data: null, error: null });
    const existingBuilder = createChainable({ data: [], error: null });
    const insertBuilder = createChainable({ data: [{ id: 'm1' }], error: null });
    mockedSupabase.from
      .mockReturnValueOnce(sameNameBuilder)
      .mockReturnValueOnce(existingBuilder)
      .mockReturnValueOnce(insertBuilder);

    await CombatService.addMonsters('123', '未知怪', 1, null, null, undefined);

    expect(insertBuilder.insert).toHaveBeenCalledWith([
      expect.objectContaining({ ac_min: 0, ac_max: 99, max_hp: null }),
    ]);
  });
});

describe('addDamage / recalcMonsterTotalDamage', () => {
  const mockedSupabase = supabase as unknown as { from: Mock };
  beforeEach(() => vi.clearAllMocks());

  it('新增傷害時，累計傷害等於原本累計加上這次所有傷害總和', async () => {
    const monsterBuilder = createChainable({ data: { total_damage: 10 }, error: null });
    const insertLogsBuilder = createChainable({ data: null, error: null });
    const updateBuilder = createChainable({ data: null, error: null });
    mockedSupabase.from
      .mockReturnValueOnce(monsterBuilder)
      .mockReturnValueOnce(insertLogsBuilder)
      .mockReturnValueOnce(updateBuilder);

    await CombatService.addDamage('m1', [
      { value: 5, type: '砍擊', resistanceType: 'normal', originalValue: 5 },
      { value: 3, type: '火焰', resistanceType: 'resistant', originalValue: 6 },
    ]);

    expect(updateBuilder.update).toHaveBeenCalledWith({ total_damage: 18 });
  });

  it('怪物不存在時回傳失敗，不寫入傷害記錄', async () => {
    mockedSupabase.from.mockReturnValueOnce(createChainable({ data: null, error: null }));

    const result = await CombatService.addDamage('m1', [
      { value: 5, type: '砍擊', resistanceType: 'normal', originalValue: 5 },
    ]);

    expect(result).toEqual({ success: false, error: '怪物不存在' });
    expect(mockedSupabase.from).toHaveBeenCalledTimes(1);
  });

  it('recalcMonsterTotalDamage 會依現有全部傷害記錄重新加總（而非增量計算）', async () => {
    const logsBuilder = createChainable({ data: [{ damage_value: 4 }, { damage_value: 6 }, { damage_value: null }], error: null });
    const updateBuilder = createChainable({ data: null, error: null });
    mockedSupabase.from
      .mockReturnValueOnce(logsBuilder)
      .mockReturnValueOnce(updateBuilder);

    await CombatService.recalcMonsterTotalDamage('m1');

    expect(updateBuilder.update).toHaveBeenCalledWith({ total_damage: 10 });
  });
});

describe('updateMonsterName', () => {
  const mockedSupabase = supabase as unknown as { from: Mock };
  beforeEach(() => vi.clearAllMocks());

  it('名稱為純空白字元時回傳失敗，不查詢 DB', async () => {
    const result = await CombatService.updateMonsterName('m1', '   ');
    expect(result).toEqual({ success: false, error: '名稱不可為空' });
    expect(mockedSupabase.from).not.toHaveBeenCalled();
  });

  it('新名稱 trim 後與現有名稱相同時，視為無需更動，直接回傳成功（不送出 update）', async () => {
    const fetchBuilder = createChainable({ data: { name: '哥布林', session_code: '123' }, error: null });
    mockedSupabase.from.mockReturnValueOnce(fetchBuilder);

    const result = await CombatService.updateMonsterName('m1', '  哥布林  ');

    expect(result).toEqual({ success: true });
    expect(mockedSupabase.from).toHaveBeenCalledTimes(1);
  });

  it('名稱真的變更時，更新同名的所有怪物', async () => {
    const fetchBuilder = createChainable({ data: { name: '哥布林', session_code: '123' }, error: null });
    const updateBuilder = createChainable({ data: null, error: null });
    mockedSupabase.from
      .mockReturnValueOnce(fetchBuilder)
      .mockReturnValueOnce(updateBuilder);

    const result = await CombatService.updateMonsterName('m1', '  大哥布林  ');

    expect(result).toEqual({ success: true });
    expect(updateBuilder.update).toHaveBeenCalledWith({ name: '大哥布林' });
  });
});

describe('deleteDamageLogBatch', () => {
  const mockedSupabase = supabase as unknown as { from: Mock };
  beforeEach(() => vi.clearAllMocks());

  it('空陣列時直接重算 total_damage，不呼叫刪除', async () => {
    const logsBuilder = createChainable({ data: [], error: null });
    const updateBuilder = createChainable({ data: null, error: null });
    mockedSupabase.from
      .mockReturnValueOnce(logsBuilder)
      .mockReturnValueOnce(updateBuilder);

    const result = await CombatService.deleteDamageLogBatch([], 'm1');

    expect(result).toEqual({ success: true });
    // 只有 recalcMonsterTotalDamage 內部的 select + update，沒有 delete 呼叫
    expect(mockedSupabase.from).toHaveBeenCalledTimes(2);
  });

  it('有 logIds 時會先刪除，再重算 total_damage', async () => {
    const deleteBuilder = createChainable({ data: null, error: null });
    const logsBuilder = createChainable({ data: [{ damage_value: 5 }], error: null });
    const updateBuilder = createChainable({ data: null, error: null });
    mockedSupabase.from
      .mockReturnValueOnce(deleteBuilder)
      .mockReturnValueOnce(logsBuilder)
      .mockReturnValueOnce(updateBuilder);

    const result = await CombatService.deleteDamageLogBatch(['log1', 'log2'], 'm1');

    expect(result).toEqual({ success: true });
    expect(deleteBuilder.in).toHaveBeenCalledWith('id', ['log1', 'log2']);
  });
});
