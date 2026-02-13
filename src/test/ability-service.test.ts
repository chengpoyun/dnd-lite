import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import { supabase } from '../../lib/supabase';
import * as AbilityService from '../../services/abilityService';

type SupabaseBuilder = {
  select?: (...args: any[]) => SupabaseBuilder | Promise<any>;
  insert?: (...args: any[]) => SupabaseBuilder | Promise<any>;
  update?: (...args: any[]) => SupabaseBuilder | Promise<any>;
  eq?: (...args: any[]) => SupabaseBuilder | Promise<any>;
  ilike?: (...args: any[]) => SupabaseBuilder | Promise<any>;
  maybeSingle?: () => Promise<any>;
  single?: () => Promise<any>;
};

describe('AbilityService - 個人能力與上傳邏輯', () => {
  const mockedSupabase = supabase as unknown as {
    from: Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('上傳到資料庫時，若已有相同 name_en（不分大小寫），應只更新角色能力的 ability_id', async () => {
    const characterAbilityId = 'char-ability-1';
    const existingAbilityId = 'ability-123';

    const globalBuilder: SupabaseBuilder = {
      select: vi.fn().mockReturnValue({
        ilike: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              id: existingAbilityId,
              name: '已存在能力',
              name_en: 'Sneak Attack',
              description: 'desc',
              source: '職業',
              recovery_type: '常駐'
            },
            error: null
          })
        })
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      })
    };

    const updateBuilder: SupabaseBuilder = {
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      })
    };

    mockedSupabase.from.mockImplementation((table: string) => {
      if (table === 'abilities') return globalBuilder as any;
      if (table === 'character_abilities') return updateBuilder as any;
      throw new Error(`Unexpected table: ${table}`);
    });

    const data: AbilityService.CreateAbilityDataForUpload = {
      name: '偷襲',
      name_en: 'sneak attack',
      description: 'test desc',
      source: '職業',
      recovery_type: '常駐'
    };

    const result = await AbilityService.uploadCharacterAbilityToGlobal(characterAbilityId, data);

    expect(result.success).toBe(true);
    expect((updateBuilder.update as Mock)).toHaveBeenCalledWith({
      ability_id: existingAbilityId
    });
  });

  it('上傳到資料庫時，若沒有相同 name_en，應建立新的 ability 並更新角色能力的 ability_id', async () => {
    const characterAbilityId = 'char-ability-2';
    const newAbilityId = 'ability-new-1';

    const globalBuilder: SupabaseBuilder = {
      select: vi.fn().mockReturnValue({
        ilike: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' }
          })
        })
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: newAbilityId,
              name: '新能力',
              name_en: 'NewAbility',
              description: 'desc',
              source: '專長',
              recovery_type: '短休'
            },
            error: null
          })
        })
      })
    };

    const updateBuilder: SupabaseBuilder = {
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      })
    };

    mockedSupabase.from.mockImplementation((table: string) => {
      if (table === 'abilities') return globalBuilder as any;
      if (table === 'character_abilities') return updateBuilder as any;
      throw new Error(`Unexpected table: ${table}`);
    });

    const data: AbilityService.CreateAbilityDataForUpload = {
      name: '新能力',
      name_en: 'NewAbility',
      description: 'test desc',
      source: '專長',
      recovery_type: '短休'
    };

    const result = await AbilityService.uploadCharacterAbilityToGlobal(characterAbilityId, data);

    expect(result.success).toBe(true);
    expect((globalBuilder.insert as Mock)).toHaveBeenCalledWith([{
      name: data.name,
      name_en: data.name_en,
      description: data.description,
      source: data.source,
      recovery_type: data.recovery_type
    }]);
    expect((updateBuilder.update as Mock)).toHaveBeenCalledWith({
      ability_id: newAbilityId
    });
  });

  it('新增個人能力時，應寫入 character_abilities 且 ability_id 為 null', async () => {
    const characterId = 'char-1';

    const insertBuilder: SupabaseBuilder = {
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'ca-1',
              character_id: characterId,
              ability_id: null,
              current_uses: 1,
              max_uses: 1
            },
            error: null
          })
        })
      })
    };

    mockedSupabase.from.mockImplementation((table: string) => {
      if (table === 'character_abilities') return insertBuilder as any;
      throw new Error(`Unexpected table: ${table}`);
    });

    const data: AbilityService.CreateCharacterAbilityData = {
      name: '個人能力',
      source: '其他',
      recovery_type: '短休'
    };

    const result = await AbilityService.createCharacterAbility(characterId, data);

    expect(result.success).toBe(true);
    expect((insertBuilder.insert as Mock)).toHaveBeenCalled();
    const insertArg = (insertBuilder.insert as Mock).mock.calls[0][0][0];
    expect(insertArg.ability_id).toBeNull();
  });

  describe('updateCharacterAbilityOrder', () => {
    it('應依陣列順序對每個 character_ability 寫入 sort_order', async () => {
      const characterId = 'char-1';
      const orderedIds = ['ca-a', 'ca-b', 'ca-c'];

      const updateBuilder: SupabaseBuilder = {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null })
          })
        })
      };

      mockedSupabase.from.mockImplementation((table: string) => {
        if (table === 'character_abilities') return updateBuilder as any;
        throw new Error(`Unexpected table: ${table}`);
      });

      await AbilityService.updateCharacterAbilityOrder(characterId, orderedIds);

      expect((updateBuilder.update as Mock)).toHaveBeenCalledTimes(3);
      expect((updateBuilder.update as Mock)).toHaveBeenNthCalledWith(1, { sort_order: 0 });
      expect((updateBuilder.update as Mock)).toHaveBeenNthCalledWith(2, { sort_order: 1 });
      expect((updateBuilder.update as Mock)).toHaveBeenNthCalledWith(3, { sort_order: 2 });
    });

    it('orderedIds 為空時應不發送請求', async () => {
      mockedSupabase.from.mockReset();
      await AbilityService.updateCharacterAbilityOrder('char-1', []);
      expect(mockedSupabase.from).not.toHaveBeenCalled();
    });

    it('當後端回傳錯誤時應 throw', async () => {
      const updateBuilder: SupabaseBuilder = {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: new Error('DB error') })
          })
        })
      };
      mockedSupabase.from.mockImplementation((table: string) => {
        if (table === 'character_abilities') return updateBuilder as any;
        throw new Error(`Unexpected table: ${table}`);
      });

      await expect(
        AbilityService.updateCharacterAbilityOrder('char-1', ['ca-1'])
      ).rejects.toThrow();
    });
  });
});

