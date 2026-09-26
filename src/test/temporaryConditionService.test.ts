import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import { supabase } from '../../lib/supabase';
import {
  getTemporaryConditions,
  createTemporaryCondition,
  updateTemporaryCondition,
  deleteTemporaryCondition,
} from '../../services/temporaryConditionService';

function createChainable(finalResult: { data?: any; error: any }) {
  const builder: any = {
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve(finalResult)),
    then: (resolve: any) => Promise.resolve(finalResult).then(resolve),
  };
  return builder;
}

describe('getTemporaryConditions', () => {
  const mockedSupabase = supabase as unknown as { from: Mock };
  beforeEach(() => vi.clearAllMocks());

  it('characterId 為空時直接回傳失敗，不查詢 DB', async () => {
    const result = await getTemporaryConditions('');
    expect(result).toEqual({ success: false, error: '角色 ID 無效' });
    expect(mockedSupabase.from).not.toHaveBeenCalled();
  });

  it('查詢成功時回傳依 created_at 排序的臨時狀態列表', async () => {
    const conditions = [
      { id: '1', character_id: 'c1', name: '中毒', duration: '1 分鐘', description: '', affects_stats: false, stat_bonuses: {}, created_at: '', updated_at: '' },
    ];
    const builder = createChainable({ data: conditions, error: null });
    mockedSupabase.from.mockReturnValue(builder);

    const result = await getTemporaryConditions('c1');

    expect(result).toEqual({ success: true, conditions });
    expect(builder.eq).toHaveBeenCalledWith('character_id', 'c1');
    expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: true });
  });

  it('查詢失敗時回傳錯誤訊息', async () => {
    mockedSupabase.from.mockReturnValue(createChainable({ data: null, error: { message: 'db fail' } }));

    const result = await getTemporaryConditions('c1');

    expect(result).toEqual({ success: false, error: 'db fail' });
  });
});

describe('createTemporaryCondition', () => {
  const mockedSupabase = supabase as unknown as { from: Mock };
  beforeEach(() => vi.clearAllMocks());

  it('characterId 為空時直接回傳失敗', async () => {
    const result = await createTemporaryCondition('', { name: '中毒' });
    expect(result).toEqual({ success: false, error: '角色 ID 無效' });
  });

  it('名稱為空時直接回傳失敗', async () => {
    const result = await createTemporaryCondition('c1', { name: '  ' });
    expect(result).toEqual({ success: false, error: '名稱無效' });
  });

  it('未傳入 affects_stats/stat_bonuses 時使用預設值', async () => {
    const builder = createChainable({ data: { id: 'tc1' }, error: null });
    mockedSupabase.from.mockReturnValue(builder);

    await createTemporaryCondition('c1', { name: '中毒', duration: '1 分鐘', description: '效果說明' });

    expect(builder.insert).toHaveBeenCalledWith({
      character_id: 'c1',
      name: '中毒',
      duration: '1 分鐘',
      description: '效果說明',
      affects_stats: false,
      stat_bonuses: {},
    });
  });

  it('傳入 affects_stats/stat_bonuses 時會原樣寫入', async () => {
    const builder = createChainable({ data: { id: 'tc1' }, error: null });
    mockedSupabase.from.mockReturnValue(builder);
    const statBonuses = { abilityModifiers: { str: -2 } };

    await createTemporaryCondition('c1', {
      name: '虛弱',
      affects_stats: true,
      stat_bonuses: statBonuses,
    });

    expect(builder.insert).toHaveBeenCalledWith({
      character_id: 'c1',
      name: '虛弱',
      duration: '',
      description: '',
      affects_stats: true,
      stat_bonuses: statBonuses,
    });
  });

  it('新增失敗時回傳錯誤訊息', async () => {
    mockedSupabase.from.mockReturnValue(createChainable({ data: null, error: { message: 'insert fail' } }));

    const result = await createTemporaryCondition('c1', { name: '中毒' });

    expect(result).toEqual({ success: false, error: 'insert fail' });
  });
});

describe('updateTemporaryCondition', () => {
  const mockedSupabase = supabase as unknown as { from: Mock };
  beforeEach(() => vi.clearAllMocks());

  it('conditionId 為空時直接回傳失敗', async () => {
    const result = await updateTemporaryCondition('', { name: '中毒' });
    expect(result).toEqual({ success: false, error: '臨時狀態 ID 無效' });
    expect(mockedSupabase.from).not.toHaveBeenCalled();
  });

  it('名稱為空字串時直接回傳失敗', async () => {
    const result = await updateTemporaryCondition('tc1', { name: '  ' });
    expect(result).toEqual({ success: false, error: '名稱無效' });
  });

  it('只傳部分欄位時，payload 只包含有傳入的欄位', async () => {
    const builder = createChainable({ data: null, error: null });
    mockedSupabase.from.mockReturnValue(builder);

    await updateTemporaryCondition('tc1', { name: '虛弱', duration: '2 分鐘' });

    const payload = builder.update.mock.calls[0][0];
    expect(payload.name).toBe('虛弱');
    expect(payload.duration).toBe('2 分鐘');
    expect('description' in payload).toBe(false);
    expect('affects_stats' in payload).toBe(false);
    expect('stat_bonuses' in payload).toBe(false);
    expect(typeof payload.updated_at).toBe('string');
    expect(builder.eq).toHaveBeenCalledWith('id', 'tc1');
  });

  it('affects_stats 改為 false 時仍會寫入（非 undefined 判斷）', async () => {
    const builder = createChainable({ data: null, error: null });
    mockedSupabase.from.mockReturnValue(builder);

    await updateTemporaryCondition('tc1', { affects_stats: false, stat_bonuses: {} });

    const payload = builder.update.mock.calls[0][0];
    expect(payload.affects_stats).toBe(false);
    expect(payload.stat_bonuses).toEqual({});
  });

  it('更新失敗時回傳錯誤訊息', async () => {
    mockedSupabase.from.mockReturnValue(createChainable({ data: null, error: { message: 'update fail' } }));

    const result = await updateTemporaryCondition('tc1', { name: '虛弱' });

    expect(result).toEqual({ success: false, error: 'update fail' });
  });

  it('更新成功時回傳 success: true', async () => {
    mockedSupabase.from.mockReturnValue(createChainable({ data: null, error: null }));

    const result = await updateTemporaryCondition('tc1', { name: '虛弱' });

    expect(result).toEqual({ success: true });
  });
});

describe('deleteTemporaryCondition', () => {
  const mockedSupabase = supabase as unknown as { from: Mock };
  beforeEach(() => vi.clearAllMocks());

  it('conditionId 為空時直接回傳失敗', async () => {
    const result = await deleteTemporaryCondition('');
    expect(result).toEqual({ success: false, error: '臨時狀態 ID 無效' });
  });

  it('刪除成功時回傳 success: true', async () => {
    const builder = createChainable({ data: null, error: null });
    mockedSupabase.from.mockReturnValue(builder);

    const result = await deleteTemporaryCondition('tc1');

    expect(result).toEqual({ success: true });
    expect(builder.eq).toHaveBeenCalledWith('id', 'tc1');
  });

  it('刪除失敗時回傳錯誤訊息', async () => {
    mockedSupabase.from.mockReturnValue(createChainable({ data: null, error: { message: 'delete fail' } }));

    const result = await deleteTemporaryCondition('tc1');

    expect(result).toEqual({ success: false, error: 'delete fail' });
  });
});
