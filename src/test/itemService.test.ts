import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import { supabase } from '../../lib/supabase';
import {
  getDisplayValues,
  getDisplayEquipmentKind,
  createCharacterItem,
  getCharacterItems,
  type CharacterItem,
} from '../../services/itemService';

function createChainable(finalResult: { data?: any; error: any }) {
  const builder: any = {
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    order: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve(finalResult)),
    then: (resolve: any) => Promise.resolve(finalResult).then(resolve),
  };
  return builder;
}

function makeCharacterItem(overrides: Partial<CharacterItem> = {}): CharacterItem {
  return {
    id: 'ci1',
    character_id: 'c1',
    quantity: 1,
    is_magic: false,
    name_override: '長劍',
    description_override: '一把普通的長劍',
    category_override: '裝備',
    created_at: '',
    updated_at: '',
    ...overrides,
  };
}

describe('getDisplayValues', () => {
  it('顯示值直接取自角色物品自己的欄位', () => {
    const result = getDisplayValues(makeCharacterItem());

    expect(result.displayName).toBe('長劍');
    expect(result.displayDescription).toBe('一把普通的長劍');
    expect(result.displayCategory).toBe('裝備');
    expect(result.displayIsMagic).toBe(false);
  });

  it('is_magic 直接取用 character_item 自己的值', () => {
    const result = getDisplayValues(makeCharacterItem({ is_magic: true, name_override: '手抄筆記' }));

    expect(result.displayIsMagic).toBe(true);
    expect(result.displayName).toBe('手抄筆記');
  });

  it('沒有任何名稱來源時，displayCategory 退回預設值「雜項」', () => {
    const result = getDisplayValues(makeCharacterItem({ category_override: undefined }));

    expect(result.displayCategory).toBe('雜項');
  });

  it('沒有 name_override 時，displayName 為空字串', () => {
    const result = getDisplayValues(makeCharacterItem({ name_override: undefined }));

    expect(result.displayName).toBe('');
  });
});

describe('getDisplayEquipmentKind', () => {
  it('有 equipment_kind_override 時回傳該值', () => {
    const item = makeCharacterItem({ equipment_kind_override: 'head' });
    expect(getDisplayEquipmentKind(item)).toBe('head');
  });

  it('equipment_kind_override 為空字串或未設定時回傳 null', () => {
    expect(getDisplayEquipmentKind(makeCharacterItem({ equipment_kind_override: '' }))).toBeNull();
    expect(getDisplayEquipmentKind(makeCharacterItem({ equipment_kind_override: undefined }))).toBeNull();
  });
});

describe('createCharacterItem', () => {
  const mockedSupabase = supabase as unknown as { from: Mock };
  beforeEach(() => vi.clearAllMocks());

  it('characterId 缺少時直接回傳失敗', async () => {
    const result = await createCharacterItem('', { name: '筆記', category: '雜項', is_magic: false });
    expect(result).toEqual({ success: false, error: '角色 ID 無效' });
  });

  it('名稱為空白字元時視為未填寫，回傳失敗', async () => {
    const result = await createCharacterItem('c1', { name: '   ', category: '雜項', is_magic: false });
    expect(result).toEqual({ success: false, error: '名稱和類別為必填' });
    expect(mockedSupabase.from).not.toHaveBeenCalled();
  });

  it('缺少 category 時回傳失敗', async () => {
    const result = await createCharacterItem('c1', { name: '筆記', category: undefined as any, is_magic: false });
    expect(result).toEqual({ success: false, error: '名稱和類別為必填' });
  });

  it('名稱與描述會被 trim 後才寫入，quantity 未傳入時預設為 1', async () => {
    const builder = createChainable({ data: { id: 'ci1' }, error: null });
    mockedSupabase.from.mockReturnValue(builder);

    await createCharacterItem('c1', { name: '  神秘卷軸  ', category: '雜項', description: '  一份卷軸  ', is_magic: true });

    expect(builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        name_override: '神秘卷軸',
        description_override: '一份卷軸',
        quantity: 1,
        is_magic: true,
      })
    );
    expect(builder.insert.mock.calls[0][0]).not.toHaveProperty('item_id');
  });
});

describe('getCharacterItems', () => {
  const mockedSupabase = supabase as unknown as { from: Mock };
  beforeEach(() => vi.clearAllMocks());

  it('characterId 缺少時直接回傳失敗', async () => {
    const result = await getCharacterItems('');
    expect(result).toEqual({ success: false, error: '角色 ID 無效' });
  });

  it('成功時原樣回傳查詢結果', async () => {
    const rows = [{ id: 'ci1', character_id: 'c1', name_override: '長劍' }];
    mockedSupabase.from.mockReturnValue(createChainable({ data: rows, error: null }));

    const result = await getCharacterItems('c1');

    expect(result).toEqual({ success: true, items: rows });
  });

  it('查詢失敗時回傳錯誤訊息', async () => {
    mockedSupabase.from.mockReturnValue(createChainable({ data: null, error: { message: 'fail' } }));

    const result = await getCharacterItems('c1');

    expect(result).toEqual({ success: false, error: 'fail' });
  });
});
