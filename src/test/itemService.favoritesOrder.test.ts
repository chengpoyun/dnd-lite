import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import { supabase } from '../../lib/supabase';
import {
  getDisplayValues,
  getCharacterItems,
  updateCharacterItemFavorite,
  updateCharacterItemsOrder,
  type CharacterItem,
} from '../../services/itemService';

function chainStub(finalResult: { data?: any; error?: any }) {
  const b: any = {};
  b.select = vi.fn(() => b);
  b.update = vi.fn((payload: any) => {
    b.updatePayload = payload;
    return b;
  });
  b.eq = vi.fn((col: string, val: any) => {
    (b.eqCalls ??= []).push([col, val]);
    return b;
  });
  b.order = vi.fn((col: string, opts: any) => {
    (b.orderCalls ??= []).push([col, opts]);
    return b;
  });
  b.single = vi.fn(() => Promise.resolve(finalResult));
  b.then = (resolve: any, reject: any) => Promise.resolve(finalResult).then(resolve, reject);
  return b;
}

describe('getDisplayValues - is_favorite', () => {
  const base = { id: 'ci1', character_id: 'c1', item_id: null, quantity: 1, is_magic: false, created_at: '', updated_at: '' };

  it('is_favorite 為 true 時應反映在 displayIsFavorite', () => {
    const result = getDisplayValues({ ...base, is_favorite: true } as CharacterItem);
    expect(result.displayIsFavorite).toBe(true);
  });

  it('未設定 is_favorite 時，displayIsFavorite 預設為 false', () => {
    const result = getDisplayValues({ ...base } as CharacterItem);
    expect(result.displayIsFavorite).toBe(false);
  });
});

describe('getCharacterItems - 排序', () => {
  const mockedSupabase = supabase as unknown as { from: Mock };
  beforeEach(() => vi.clearAllMocks());

  it('查詢時依 sort_order 升序（null 排最後）、其次依 created_at 降序排序', async () => {
    const builder = chainStub({ data: [], error: null });
    mockedSupabase.from.mockReturnValue(builder);

    await getCharacterItems('c1');

    expect(builder.orderCalls).toEqual([
      ['sort_order', { ascending: true, nullsFirst: false }],
      ['created_at', { ascending: false }],
    ]);
  });
});

describe('updateCharacterItemFavorite', () => {
  const mockedSupabase = supabase as unknown as { from: Mock };
  beforeEach(() => vi.clearAllMocks());

  it('characterItemId 缺少時直接失敗，不呼叫 DB', async () => {
    const result = await updateCharacterItemFavorite('', true);
    expect(result).toEqual({ success: false, error: '物品 ID 無效' });
    expect(mockedSupabase.from).not.toHaveBeenCalled();
  });

  it('成功時寫入 is_favorite 欄位', async () => {
    const builder = chainStub({ data: null, error: null });
    mockedSupabase.from.mockReturnValue(builder);

    const result = await updateCharacterItemFavorite('ci1', true);

    expect(result).toEqual({ success: true });
    expect(builder.update).toHaveBeenCalledWith({ is_favorite: true });
    expect(builder.eq).toHaveBeenCalledWith('id', 'ci1');
  });

  it('DB 錯誤時回傳錯誤訊息', async () => {
    mockedSupabase.from.mockReturnValue(chainStub({ data: null, error: { message: '寫入失敗' } }));

    const result = await updateCharacterItemFavorite('ci1', false);

    expect(result).toEqual({ success: false, error: '寫入失敗' });
  });
});

describe('updateCharacterItemsOrder', () => {
  const mockedSupabase = supabase as unknown as { from: Mock };
  beforeEach(() => vi.clearAllMocks());

  it('characterId 缺少或 updates 為空時直接失敗，不呼叫 DB', async () => {
    expect(await updateCharacterItemsOrder('', { a: 1 })).toEqual({ success: false, error: '角色 ID 或排序資料無效' });
    expect(await updateCharacterItemsOrder('c1', {})).toEqual({ success: false, error: '角色 ID 或排序資料無效' });
    expect(mockedSupabase.from).not.toHaveBeenCalled();
  });

  it('依 updates 對照表，逐筆寫入 sort_order 並限定 character_id', async () => {
    const builders: any[] = [];
    mockedSupabase.from.mockImplementation(() => {
      const b = chainStub({ data: null, error: null });
      builders.push(b);
      return b;
    });

    const result = await updateCharacterItemsOrder('c1', { i1: 500, i2: 1500 });

    expect(result).toEqual({ success: true });
    expect(builders).toHaveLength(2);
    expect(builders[0].update).toHaveBeenCalledWith({ sort_order: 500 });
    expect(builders[0].eqCalls).toEqual([['id', 'i1'], ['character_id', 'c1']]);
    expect(builders[1].update).toHaveBeenCalledWith({ sort_order: 1500 });
    expect(builders[1].eqCalls).toEqual([['id', 'i2'], ['character_id', 'c1']]);
  });

  it('任一筆寫入失敗時，回傳失敗與錯誤訊息', async () => {
    let call = 0;
    mockedSupabase.from.mockImplementation(() => {
      call += 1;
      return chainStub(call === 1 ? { data: null, error: { message: '寫入失敗' } } : { data: null, error: null });
    });

    const result = await updateCharacterItemsOrder('c1', { i1: 500, i2: 1500 });

    expect(result).toEqual({ success: false, error: '寫入失敗' });
  });
});
