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

  it('displayDecorationEffects：override 優先於 global_items，兩者皆無時退回空物件', () => {
    const withOverride = getDisplayValues({
      ...base,
      item_id: 'g1',
      decoration_effects: { weapon: { note: '燒灼', stat_bonuses: { combatStats: { attackDamage: 1 } } } },
      item: {
        id: 'g1', name: 'X', description: '', category: 'MH素材', is_magic: false, created_at: '', updated_at: '',
        decoration_effects: { armor: { note: '應被覆蓋', stat_bonuses: {} } },
      },
    } as CharacterItem);
    expect(withOverride.displayDecorationEffects).toEqual({
      weapon: { note: '燒灼', stat_bonuses: { combatStats: { attackDamage: 1 } } },
    });

    const withNeither = getDisplayValues({ ...base, item_id: null } as CharacterItem);
    expect(withNeither.displayDecorationEffects).toEqual({});
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

  it('效果說明留空也允許鑲嵌（純敘述或完全無效果的素材）', async () => {
    const materialRow = { id: 'm1', character_id: 'c1', quantity: 1, name_override: '素材A', decoration_effects: {}, item: null };
    const targetRow = { id: 't1', character_id: 'c1', sockets: [], equipment_kind_override: 'melee_weapon', item: null };

    mockedSupabase.from
      .mockReturnValueOnce(chainStub({ data: materialRow, error: null }))
      .mockReturnValueOnce(chainStub({ data: targetRow, error: null }))
      .mockReturnValueOnce(chainStub({ data: null, error: null }))
      .mockReturnValueOnce(chainStub({ data: [], error: null }))
      .mockReturnValueOnce(chainStub({ data: null, error: null }))
      .mockReturnValueOnce(chainStub({ data: null, error: null }));

    const result = await socketDecoration('t1', 0, 'm1', '   ');
    expect(result).toEqual({ success: true });
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

  it('鑲入武器時，只寫回素材的 decoration_effects.weapon，不動 armor 那份', async () => {
    const materialRow = {
      id: 'm1', character_id: 'c1', quantity: 2, name_override: '素材A',
      decoration_effects: { armor: { note: '護甲舊效果', stat_bonuses: { combatStats: { ac: 1 } } } },
      item: null,
    };
    const targetRow = { id: 't1', character_id: 'c1', sockets: [], equipment_kind_override: 'melee_weapon', item: null };
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

    const bonus = { combatStats: { attackDamage: 2 } };
    const result = await socketDecoration('t1', 1, 'm1', ' 燒灼效果 ', bonus as any);

    expect(result).toEqual({ success: true });
    expect(writebackStub.update).toHaveBeenCalledWith({
      decoration_effects: {
        armor: { note: '護甲舊效果', stat_bonuses: { combatStats: { ac: 1 } } },
        weapon: { note: '燒灼效果', stat_bonuses: bonus },
      },
    });
    expect(socketUpdateStub.update).toHaveBeenCalledWith({
      sockets: [null, { decoration_name: '素材A', note: '燒灼效果', stat_bonuses: bonus }],
    });
    expect(qtyUpdateStub.update).toHaveBeenCalledWith({ quantity: 1 });
  });

  it('鑲入護甲時（依 global_items 的 equipment_kind 判斷），只寫回 decoration_effects.armor，不動 weapon 那份', async () => {
    const materialRow = {
      id: 'm1', character_id: 'c1', quantity: 1, name_override: '素材B',
      decoration_effects: { weapon: { note: '武器舊效果', stat_bonuses: { combatStats: { attackDamage: 3 } } } },
      item: null,
    };
    // equipment_kind_override 未設定，改由 join 的 global_items.equipment_kind 判斷（'body' 非武器 → 視為護甲）
    const targetRow = { id: 't1', character_id: 'c1', sockets: [null], equipment_kind_override: null, item: { equipment_kind: 'body' } };
    const writebackStub = chainStub({ data: null, error: null });
    const socketUpdateStub = chainStub({ data: null, error: null });
    const deleteStub = chainStub({ data: null, error: null });

    mockedSupabase.from
      .mockReturnValueOnce(chainStub({ data: materialRow, error: null }))
      .mockReturnValueOnce(chainStub({ data: targetRow, error: null }))
      .mockReturnValueOnce(writebackStub)
      .mockReturnValueOnce(chainStub({ data: [], error: null }))
      .mockReturnValueOnce(socketUpdateStub)
      .mockReturnValueOnce(deleteStub);

    const bonus = { combatStats: { ac: 1 } };
    const result = await socketDecoration('t1', 0, 'm1', '防禦效果', bonus as any);

    expect(result).toEqual({ success: true });
    expect(writebackStub.update).toHaveBeenCalledWith({
      decoration_effects: {
        weapon: { note: '武器舊效果', stat_bonuses: { combatStats: { attackDamage: 3 } } },
        armor: { note: '防禦效果', stat_bonuses: bonus },
      },
    });
    expect(socketUpdateStub.update).toHaveBeenCalledWith({
      sockets: [{ decoration_name: '素材B', note: '防禦效果', stat_bonuses: bonus }],
    });
    expect(deleteStub.delete).toHaveBeenCalled();
  });

  it('素材消耗至 0 時改為刪除該筆，而非寫入 quantity', async () => {
    const materialRow = { id: 'm1', character_id: 'c1', quantity: 1, name_override: '素材A', decoration_effects: {}, item: null };
    const targetRow = { id: 't1', character_id: 'c1', sockets: [], equipment_kind_override: 'melee_weapon', item: null };
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

  it('鑲嵌成功後，同步更新同名 MH素材庫存的對應 kind 效果，並保留每筆原本另一個 kind 的效果不被覆蓋', async () => {
    const materialRow = { id: 'm1', character_id: 'c1', quantity: 5, name_override: '素材C', decoration_effects: {}, item: null };
    const targetRow = { id: 't1', character_id: 'c1', sockets: [], equipment_kind_override: 'melee_weapon', item: null };
    const siblingRows = [
      { id: 'm1', name_override: '素材C', category_override: 'MH素材', decoration_effects: {}, item: null }, // 自己：應排除
      {
        id: 'm2', name_override: '素材C', category_override: 'MH素材',
        decoration_effects: { armor: { note: '護甲既有效果', stat_bonuses: {} } }, // 同名：應同步 weapon，armor 應保留
        item: null,
      },
      { id: 'm3', name_override: '素材D', category_override: 'MH素材', decoration_effects: {}, item: null }, // 名稱不同：不應同步
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

    expect(syncUpdateStub.eqCol).toBe('id');
    expect(syncUpdateStub.eqVal).toBe('m2');
    expect(syncUpdateStub.update).toHaveBeenCalledWith({
      decoration_effects: {
        armor: { note: '護甲既有效果', stat_bonuses: {} },
        weapon: { note: '同步測試', stat_bonuses: undefined },
      },
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

  it('找不到裝備時回傳錯誤訊息', async () => {
    mockedSupabase.from.mockReturnValueOnce(chainStub({ data: null, error: { message: '找不到' } }));
    const result = await updateSocketedDecoration('t1', 0, '說明');
    expect(result).toEqual({ success: false, error: '找不到' });
  });

  it('該插槽尚未鑲嵌時回傳錯誤，不寫入 DB', async () => {
    mockedSupabase.from.mockReturnValueOnce(
      chainStub({ data: { character_id: 'c1', sockets: [null], equipment_kind_override: 'melee_weapon', item: null }, error: null })
    );
    const result = await updateSocketedDecoration('t1', 0, '說明');
    expect(result).toEqual({ success: false, error: '此插槽尚未鑲嵌' });
  });

  it('效果說明留空也允許儲存（改成純敘述或完全無效果）', async () => {
    const targetRow = {
      character_id: 'c1',
      sockets: [{ decoration_name: '素材E', note: '舊說明', stat_bonuses: { abilityScores: { str: 1 } } }],
      equipment_kind_override: 'melee_weapon',
      item: null,
    };
    mockedSupabase.from
      .mockReturnValueOnce(chainStub({ data: targetRow, error: null }))
      .mockReturnValueOnce(chainStub({ data: null, error: null }))
      .mockReturnValueOnce(chainStub({ data: [], error: null }));

    const result = await updateSocketedDecoration('t1', 0, '   ', undefined);
    expect(result).toEqual({ success: true });
  });

  it('成功編輯：更新該插槽的 note/stat_bonuses（保留 decoration_name），並依裝備類型同步同名素材對應 kind 的效果', async () => {
    const targetRow = {
      character_id: 'c1',
      sockets: [{ decoration_name: '素材E', note: '舊說明', stat_bonuses: { abilityScores: { str: 1 } } }],
      equipment_kind_override: null,
      item: { equipment_kind: 'body' },
    };
    const socketUpdateStub = chainStub({ data: null, error: null });
    const syncUpdateStub = chainStub({ data: null, error: null });

    mockedSupabase.from
      .mockReturnValueOnce(chainStub({ data: targetRow, error: null }))
      .mockReturnValueOnce(socketUpdateStub)
      .mockReturnValueOnce(chainStub({
        data: [{ id: 'm9', name_override: '素材E', category_override: 'MH素材', decoration_effects: {}, item: null }],
        error: null,
      }))
      .mockReturnValueOnce(syncUpdateStub);

    const result = await updateSocketedDecoration('t1', 0, ' 新說明 ', undefined);

    expect(result).toEqual({ success: true });
    expect(socketUpdateStub.update).toHaveBeenCalledWith({
      sockets: [{ decoration_name: '素材E', note: '新說明', stat_bonuses: undefined }],
    });
    expect(syncUpdateStub.update).toHaveBeenCalledWith({
      decoration_effects: { armor: { note: '新說明', stat_bonuses: undefined } },
    });
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

describe('getDisplayValues - 效果摘要顯示在描述頂端', () => {
  const base = { id: 'ci1', character_id: 'c1', quantity: 1, is_magic: false, created_at: '', updated_at: '' };

  it('MH素材：武器插槽有文字說明，護甲插槽只有數值加成，摘要各自顯示在描述最前面', () => {
    const result = getDisplayValues({
      ...base,
      item_id: null,
      description_override: '原本的描述',
      category_override: 'MH素材',
      weapon_decoration: true,
      armor_decoration: true,
      decoration_effects: {
        weapon: { note: '雷電附加傷害 +1d6' },
        armor: { note: '', stat_bonuses: { combatStats: { ac: 1 } } },
      },
    } as CharacterItem);

    expect(result.displayDescription).toBe(
      '武器插槽效果：雷電附加傷害 +1d6\n護甲插槽效果：（含數值加成，無文字說明）\n\n原本的描述'
    );
  });

  it('MH素材：只勾選武器插槽且未設定任何效果時，不顯示任何摘要行，描述維持原樣', () => {
    const result = getDisplayValues({
      ...base,
      item_id: null,
      description_override: '原本的描述',
      category_override: 'MH素材',
      weapon_decoration: true,
      armor_decoration: false,
      decoration_effects: {},
    } as CharacterItem);

    expect(result.displayDescription).toBe('原本的描述');
  });

  it('MH素材：未勾選武器/護甲插槽時，即使 decoration_effects 有殘留資料也不顯示摘要', () => {
    const result = getDisplayValues({
      ...base,
      item_id: null,
      description_override: '原本的描述',
      category_override: 'MH素材',
      weapon_decoration: false,
      armor_decoration: false,
      decoration_effects: { weapon: { note: '不該出現' } },
    } as CharacterItem);

    expect(result.displayDescription).toBe('原本的描述');
  });

  it('裝備：已鑲嵌兩個材料，一個有文字說明、一個只有數值加成，摘要列出兩者', () => {
    const result = getDisplayValues({
      ...base,
      item_id: null,
      description_override: '大劍的描述',
      category_override: '裝備',
      sockets: [
        { decoration_name: '金獅子的毛', note: '攻擊傷害增加1d8' },
        { decoration_name: '雷狼結晶', note: '', stat_bonuses: { combatStats: { attackDamage: 2 } } },
      ],
    } as CharacterItem);

    expect(result.displayDescription).toBe(
      '已鑲嵌效果：\n- 金獅子的毛：攻擊傷害增加1d8\n- 雷狼結晶：（含數值加成，無文字說明）\n\n大劍的描述'
    );
  });

  it('裝備：插槽皆為空（null）時，不顯示已鑲嵌效果區塊', () => {
    const result = getDisplayValues({
      ...base,
      item_id: null,
      description_override: '大劍的描述',
      category_override: '裝備',
      sockets: [null, null],
    } as CharacterItem);

    expect(result.displayDescription).toBe('大劍的描述');
  });

  it('裝備：已鑲嵌材料完全沒有效果（無文字也無數值加成）時，該筆從摘要省略', () => {
    const result = getDisplayValues({
      ...base,
      item_id: null,
      description_override: '大劍的描述',
      category_override: '裝備',
      sockets: [
        { decoration_name: '純裝飾材料', note: '' },
        { decoration_name: '金獅子的毛', note: '攻擊傷害增加1d8' },
      ],
    } as CharacterItem);

    expect(result.displayDescription).toBe(
      '已鑲嵌效果：\n- 金獅子的毛：攻擊傷害增加1d8\n\n大劍的描述'
    );
  });

  it('原本沒有描述文字時，摘要單獨顯示、不會多出空行或殘留分隔符', () => {
    const result = getDisplayValues({
      ...base,
      item_id: null,
      description_override: '',
      category_override: '裝備',
      sockets: [{ decoration_name: '金獅子的毛', note: '攻擊傷害增加1d8' }],
    } as CharacterItem);

    expect(result.displayDescription).toBe('已鑲嵌效果：\n- 金獅子的毛：攻擊傷害增加1d8');
  });
});
