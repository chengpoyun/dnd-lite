import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../../lib/supabase';
import * as ItemService from '../../services/itemService';

// 型別輔助：簡單的 Supabase 查詢 builder mock
type SupabaseBuilder = {
  select?: (...args: any[]) => SupabaseBuilder | Promise<any>;
  order?: (...args: any[]) => SupabaseBuilder | Promise<any>;
  insert?: (...args: any[]) => SupabaseBuilder | Promise<any>;
  update?: (...args: any[]) => SupabaseBuilder | Promise<any>;
  eq?: (...args: any[]) => SupabaseBuilder | Promise<any>;
  ilike?: (...args: any[]) => SupabaseBuilder | Promise<any>;
  single?: () => Promise<any>;
};

describe('ItemService - 個人物品與上傳邏輯', () => {
  const mockedSupabase = supabase as unknown as {
    from: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('當上傳到資料庫時，若已有相同 name_en（不分大小寫），應該只更新角色物品的 item_id', async () => {
    // 準備
    const characterItemId = 'char-item-1';
    const existingGlobalItemId = 'global-123';

    // 建立兩種 from 行為：查詢 global_items 與更新 character_items
    const globalBuilder: SupabaseBuilder = {
      select: vi.fn().mockReturnValue({
        ilike: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              id: existingGlobalItemId,
              name: '已存在物品',
              name_en: 'Fireball',
              description: 'desc',
              category: '裝備',
              is_magic: false,
            },
            error: null,
          }),
        }),
      }),
    };

    const updateBuilder: SupabaseBuilder = {
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    };

    mockedSupabase.from.mockImplementation((table: string) => {
      if (table === 'global_items') return globalBuilder as any;
      if (table === 'character_items') return updateBuilder as any;
      throw new Error(`Unexpected table: ${table}`);
    });

    const data: ItemService.CreateGlobalItemDataForUpload = {
      name: '火球術',
      name_en: 'fireball', // 與 Fireball 僅大小寫不同
      description: 'test desc',
      category: '裝備',
      is_magic: false,
    };

    const result = await ItemService.uploadCharacterItemToGlobal(characterItemId, data);

    expect(result.success).toBe(true);
    // 應該有更新 character_items.item_id
    expect((updateBuilder.update as vi.Mock)).toHaveBeenCalledWith({
      item_id: existingGlobalItemId,
    });
  });

  it('當上傳到資料庫時，若沒有相同 name_en，應該建立新的 global_item 並更新角色物品的 item_id', async () => {
    const characterItemId = 'char-item-2';
    const newGlobalId = 'global-new-1';

    // 1) 查詢 global_items，沒有找到資料；2) 插入新的 global_items
    const globalBuilder: SupabaseBuilder = {
      select: vi.fn().mockReturnValue({
        ilike: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' }, // not found
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: newGlobalId,
              name: '新物品',
              name_en: 'NewItem',
              description: 'desc',
              category: '裝備',
              is_magic: false,
            },
            error: null,
          }),
        }),
      }),
    };

    // 3) 更新 character_items.item_id
    const updateBuilder: SupabaseBuilder = {
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    };

    mockedSupabase.from.mockImplementation((table: string) => {
      if (table === 'global_items') {
        return globalBuilder as any;
      }
      if (table === 'character_items') return updateBuilder as any;
      throw new Error(`Unexpected table: ${table}`);
    });

    const data: ItemService.CreateGlobalItemDataForUpload = {
      name: '新物品',
      name_en: 'NewItem',
      description: 'test desc',
      category: '裝備',
      is_magic: false,
    };

    const result = await ItemService.uploadCharacterItemToGlobal(characterItemId, data);

    expect(result.success).toBe(true);
    // 確認有插入新的 global_items
    expect((globalBuilder.insert as vi.Mock)).toHaveBeenCalledWith({
      name: data.name,
      name_en: data.name_en,
      description: data.description,
      category: data.category,
      is_magic: data.is_magic,
    });
    // 並且角色物品被更新為指向新 global item
    expect((updateBuilder.update as vi.Mock)).toHaveBeenCalledWith({
      item_id: newGlobalId,
    });
  });
});

