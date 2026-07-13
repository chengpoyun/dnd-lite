import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import { supabase } from '../../lib/supabase';
import {
  getDisplayValues,
  socketDecoration,
  removeSocketedDecoration,
  updateSocketedDecoration,
  type CharacterItem,
} from '../../services/itemService';

/**
 * 通用 chainable stub：不管中間呼叫哪些方法（select/update/delete/eq/in），
 * 最終 `.single()` 或直接 await（thenable）都會 resolve 成同一個 finalResult。
 * 每個 supabase.from() 呼叫應各自 mockReturnValueOnce 一個獨立 stub，
 * 順序需對應被測函式內部實際的 .from() 呼叫順序。
 */
function chainStub(finalResult: { data?: any; error?: any }) {
  const b: any = {};
  b.select = vi.fn(() => b);
  b.update = vi.fn((payload: any) => {
    b.updatePayload = payload;
    return b;
  });
  b.delete = vi.fn(() => b);
  b.eq = vi.fn((col: string, val: any) => {
    b.eqCol = col;
    b.eqVal = val;
    return b;
  });
  b.in = vi.fn((col: string, vals: any[]) => {
    b.inCol = col;
    b.inVals = vals;
    return b;
  });
  b.single = vi.fn(() => Promise.resolve(finalResult));
  b.then = (resolve: any, reject: any) => Promise.resolve(finalResult).then(resolve, reject);
  return b;
}

describe('getDisplayValues - 鑲嵌插槽相關欄位', () => {
  const base = { id: 'ci1', character_id: 'c1', quantity: 1, is_magic: false, created_at: '', updated_at: '' };

  it('character_items 有 override 時優先於 global_items', () => {
    const result = getDisplayValues({
      ...base,
      item_id: 'g1',
      decoration_slots: 2,
      weapon_decoration: true,
      armor_decoration: false,
      item: {
        id: 'g1', name: 'X', description: '', category: '裝備', is_magic: false, created_at: '', updated_at: '',
        decoration_slots: 0, weapon_decoration: false, armor_decoration: true,
      },
    } as CharacterItem);

    expect(result.displayDecorationSlots).toBe(2);
    expect(result.displayWeaponDecoration).toBe(true);
    expect(result.displayArmorDecoration).toBe(false);
  });

  it('無 override 時退回 global_items 的值', () => {
    const result = getDisplayValues({
      ...base,
      item_id: 'g1',
      item: {
        id: 'g1', name: 'X', description: '', category: 'MH素材', is_magic: false, created_at: '', updated_at: '',
        decoration_slots: 3, weapon_decoration: true, armor_decoration: true,
      },
    } as CharacterItem);

    expect(result.displayDecorationSlots).toBe(3);
    expect(result.displayWeaponDecoration).toBe(true);
    expect(result.displayArmorDecoration).toBe(true);
  });

  it('兩者皆無時，插槽數退回 0、武器／護甲鑲嵌旗標退回 false', () => {
    const result = getDisplayValues({ ...base, item_id: null } as CharacterItem);

    expect(result.displayDecorationSlots).toBe(0);
    expect(result.displayWeaponDecoration).toBe(false);
    expect(result.displayArmorDecoration).toBe(false);
  });
});

describe('socketDecoration', () => {
  const mockedSupabase = supabase as unknown as { from: Mock };
  beforeEach(() => vi.clearAllMocks());

  it('缺少 targetItemId 或 materialItemId 時直接失敗，不呼叫 DB', async () => {
    expect(await socketDecoration('', 0, 'm1', '效果')).toEqual({ success: false, error: '裝備或素材 ID 無效' });
    expect(await socketDecoration('t1', 0, '', '效果')).toEqual({ success: false, error: '裝備或素材 ID 無效' });
    expect(mockedSupabase.from).not.toHaveBeenCalled();
  });

  it('slotIndex 為負數時失敗，不呼叫 DB', async () => {
    const result = await socketDecoration('t1', -1, 'm1', '效果');
    expect(result).toEqual({ success: false, error: '插槽索引無效' });
    expect(mockedSupabase.from).not.toHaveBeenCalled();
  });

  it('效果說明為空白字元時失敗，不呼叫 DB', async () => {
    const result = await socketDecoration('t1', 0, 'm1', '   ');
    expect(result).toEqual({ success: false, error: '效果說明為必填' });
    expect(mockedSupabase.from).not.toHaveBeenCalled();
  });

  it('找不到素材時回傳錯誤訊息', async () => {
    mockedSupabase.from
      .mockReturnValueOnce(chainStub({ data: null, error: { message: '素材不存在' } }))
      .mockReturnValueOnce(chainStub({ data: { id: 't1', character_id: 'c1', sockets: [] }, error: null }));

    const result = await socketDecoration('t1', 0, 'm1', '效果');
    expect(result).toEqual({ success: false, error: '素材不存在' });
  });

  it('找不到目標裝備時回傳錯誤訊息', async () => {
    mockedSupabase.from
      .mockReturnValueOnce(chainStub({ data: { id: 'm1', character_id: 'c1', quantity: 1, name_override: '素材A', item: null }, error: null }))
      .mockReturnValueOnce(chainStub({ data: null, error: { message: '裝備不存在' } }));

    const result = await socketDecoration('t1', 0, 'm1', '效果');
    expect(result).toEqual({ success: false, error: '裝備不存在' });
  });

  it('成功鑲嵌（無數值加成）：寫回素材 stat_bonuses 為 {}／affects_stats 為 false，插槽快照正確，素材數量遞減', async () => {
    const materialRow = { id: 'm1', character_id: 'c1', quantity: 2, name_override: '素材A', item: null };
    const targetRow = { id: 't1', character_id: 'c1', sockets: [] };
    const writebackStub = chainStub({ data: null, error: null });
    const socketUpdateStub = chainStub({ data: null, error: null });
    const qtyUpdateStub = chainStub({ data: null, error: null });

    mockedSupabase.from
      .mockReturnValueOnce(chainStub({ data: materialRow, error: null }))
      .mockReturnValueOnce(chainStub({ data: targetRow, error: null }))
      .mockReturnValueOnce(writebackStub)
      .mockReturnValueOnce(chainStub({ data: [], error: null })) // 同名素材同步查詢：無其他庫存
      .mockReturnValueOnce(socketUpdateStub)
      .mockReturnValueOnce(qtyUpdateStub);

    const result = await socketDecoration('t1', 1, 'm1', ' 效果說明 ');

    expect(result).toEqual({ success: true });
    expect(writebackStub.update).toHaveBeenCalledWith({
      description_override: '效果說明',
      stat_bonuses: {},
      affects_stats: false,
    });
    expect(socketUpdateStub.update).toHaveBeenCalledWith({
      sockets: [null, { decoration_name: '素材A', note: '效果說明', stat_bonuses: undefined }],
    });
    expect(qtyUpdateStub.update).toHaveBeenCalledWith({ quantity: 1 });
  });

  it('有數值加成時，寫回值與插槽快照都帶有該數值加成，affects_stats 為 true', async () => {
    const materialRow = { id: 'm1', character_id: 'c1', quantity: 3, name_override: '素材B', item: null };
    const targetRow = { id: 't1', character_id: 'c1', sockets: [null, null] };
    const writebackStub = chainStub({ data: null, error: null });
    const socketUpdateStub = chainStub({ data: null, error: null });
    const bonus = { abilityScores: { str: 2 } };

    mockedSupabase.from
      .mockReturnValueOnce(chainStub({ data: materialRow, error: null }))
      .mockReturnValueOnce(chainStub({ data: targetRow, error: null }))
      .mockReturnValueOnce(writebackStub)
      .mockReturnValueOnce(chainStub({ data: [], error: null }))
      .mockReturnValueOnce(socketUpdateStub)
      .mockReturnValueOnce(chainStub({ data: null, error: null }));

    const result = await socketDecoration('t1', 0, 'm1', '效果', bonus as any);

    expect(result).toEqual({ success: true });
    expect(writebackStub.update).toHaveBeenCalledWith({
      description_override: '效果',
      stat_bonuses: bonus,
      affects_stats: true,
    });
    expect(socketUpdateStub.update).toHaveBeenCalledWith({
      sockets: [{ decoration_name: '素材B', note: '效果', stat_bonuses: bonus }, null],
    });
  });

  it('素材消耗至 0 時改為刪除該筆，而非寫入 quantity', async () => {
    const materialRow = { id: 'm1', character_id: 'c1', quantity: 1, name_override: '素材A', item: null };
    const targetRow = { id: 't1', character_id: 'c1', sockets: [] };
    const deleteStub = chainStub({ data: null, error: null });

    mockedSupabase.from
      .mockReturnValueOnce(chainStub({ data: materialRow, error: null }))
      .mockReturnValueOnce(chainStub({ data: targetRow, error: null }))
      .mockReturnValueOnce(chainStub({ data: null, error: null }))
      .mockReturnValueOnce(chainStub({ data: [], error: null }))
      .mockReturnValueOnce(chainStub({ data: null, error: null }))
      .mockReturnValueOnce(deleteStub);

    const result = await socketDecoration('t1', 0, 'm1', '效果');

    expect(result).toEqual({ success: true });
    expect(deleteStub.delete).toHaveBeenCalled();
  });

  it('鑲嵌成功後，同步更新角色物品欄中其他同名 MH素材的效果，並排除正在消耗的那一筆', async () => {
    const materialRow = { id: 'm1', character_id: 'c1', quantity: 5, name_override: '素材C', item: null };
    const targetRow = { id: 't1', character_id: 'c1', sockets: [] };
    const siblingRows = [
      { id: 'm1', name_override: '素材C', category_override: 'MH素材', item: null }, // 自己：應排除
      { id: 'm2', name_override: '素材C', category_override: 'MH素材', item: null }, // 同名：應同步
      { id: 'm3', name_override: '素材D', category_override: 'MH素材', item: null }, // 名稱不同：不應同步
    ];
    const syncUpdateStub = chainStub({ data: null, error: null });

    mockedSupabase.from
      .mockReturnValueOnce(chainStub({ data: materialRow, error: null }))
      .mockReturnValueOnce(chainStub({ data: targetRow, error: null }))
      .mockReturnValueOnce(chainStub({ data: null, error: null }))
      .mockReturnValueOnce(chainStub({ data: siblingRows, error: null }))
      .mockReturnValueOnce(syncUpdateStub)
      .mockReturnValueOnce(chainStub({ data: null, error: null }))
      .mockReturnValueOnce(chainStub({ data: null, error: null }));

    await socketDecoration('t1', 0, 'm1', '同步測試');

    expect(syncUpdateStub.in).toHaveBeenCalledWith('id', ['m2']);
    expect(syncUpdateStub.update).toHaveBeenCalledWith({
      description_override: '同步測試',
      stat_bonuses: {},
      affects_stats: false,
    });
  });
});

describe('updateSocketedDecoration', () => {
  const mockedSupabase = supabase as unknown as { from: Mock };
  beforeEach(() => vi.clearAllMocks());

  it('targetItemId 缺少時直接失敗，不呼叫 DB', async () => {
    expect(await updateSocketedDecoration('', 0, '說明')).toEqual({ success: false, error: '裝備 ID 無效' });
    expect(mockedSupabase.from).not.toHaveBeenCalled();
  });

  it('效果說明空白時失敗，不呼叫 DB', async () => {
    expect(await updateSocketedDecoration('t1', 0, '   ')).toEqual({ success: false, error: '效果說明為必填' });
    expect(mockedSupabase.from).not.toHaveBeenCalled();
  });

  it('找不到裝備時回傳錯誤訊息', async () => {
    mockedSupabase.from.mockReturnValueOnce(chainStub({ data: null, error: { message: '找不到' } }));
    const result = await updateSocketedDecoration('t1', 0, '說明');
    expect(result).toEqual({ success: false, error: '找不到' });
  });

  it('該插槽尚未鑲嵌時回傳錯誤，不寫入 DB', async () => {
    mockedSupabase.from.mockReturnValueOnce(chainStub({ data: { character_id: 'c1', sockets: [null] }, error: null }));
    const result = await updateSocketedDecoration('t1', 0, '說明');
    expect(result).toEqual({ success: false, error: '此插槽尚未鑲嵌' });
  });

  it('成功編輯：更新該插槽的 note/stat_bonuses（保留 decoration_name），並同步同名素材庫存', async () => {
    const targetRow = {
      character_id: 'c1',
      sockets: [{ decoration_name: '素材E', note: '舊說明', stat_bonuses: { abilityScores: { str: 1 } } }],
    };
    const socketUpdateStub = chainStub({ data: null, error: null });
    const syncUpdateStub = chainStub({ data: null, error: null });

    mockedSupabase.from
      .mockReturnValueOnce(chainStub({ data: targetRow, error: null }))
      .mockReturnValueOnce(socketUpdateStub)
      .mockReturnValueOnce(chainStub({ data: [{ id: 'm9', name_override: '素材E', category_override: 'MH素材', item: null }], error: null }))
      .mockReturnValueOnce(syncUpdateStub);

    const result = await updateSocketedDecoration('t1', 0, ' 新說明 ', undefined);

    expect(result).toEqual({ success: true });
    expect(socketUpdateStub.update).toHaveBeenCalledWith({
      sockets: [{ decoration_name: '素材E', note: '新說明', stat_bonuses: undefined }],
    });
    expect(syncUpdateStub.in).toHaveBeenCalledWith('id', ['m9']);
  });
});

describe('removeSocketedDecoration', () => {
  const mockedSupabase = supabase as unknown as { from: Mock };
  beforeEach(() => vi.clearAllMocks());

  it('targetItemId 缺少時直接失敗', async () => {
    expect(await removeSocketedDecoration('', 0)).toEqual({ success: false, error: '裝備 ID 無效' });
    expect(mockedSupabase.from).not.toHaveBeenCalled();
  });

  it('插槽索引超出範圍時回傳錯誤，不寫入 DB', async () => {
    mockedSupabase.from.mockReturnValueOnce(
      chainStub({ data: { sockets: [{ decoration_name: 'X', note: '' }] }, error: null })
    );
    const result = await removeSocketedDecoration('t1', 5);
    expect(result).toEqual({ success: false, error: '插槽索引無效' });
  });

  it('成功移除：該插槽設為 null，其餘插槽維持不變', async () => {
    const updateStub = chainStub({ data: null, error: null });
    mockedSupabase.from
      .mockReturnValueOnce(
        chainStub({
          data: { sockets: [{ decoration_name: 'A', note: '' }, { decoration_name: 'B', note: '' }] },
          error: null,
        })
      )
      .mockReturnValueOnce(updateStub);

    const result = await removeSocketedDecoration('t1', 0);

    expect(result).toEqual({ success: true });
    expect(updateStub.update).toHaveBeenCalledWith({
      sockets: [null, { decoration_name: 'B', note: '' }],
    });
  });
});
