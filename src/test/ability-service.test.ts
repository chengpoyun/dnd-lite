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

/** 建立可鏈式呼叫（delete/update/select/eq）且最終可被 await 的假 query（模擬 supabase 的 thenable builder） */
function createChainable(finalResult: { data?: any; error: any }) {
  const builder: any = {
    delete: vi.fn(() => builder),
    update: vi.fn(() => builder),
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve(finalResult)),
    then: (resolve: (v: any) => void) => resolve(finalResult),
  };
  return builder;
}

describe('AbilityService - 個人能力', () => {
  const mockedSupabase = supabase as unknown as {
    from: Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('by 組合鍵（未傳 characterAbilityId 時，改用 characterId + abilityId）', () => {
    it('unlearnAbility：依 character_id + ability_id 刪除', async () => {
      const builder = createChainable({ error: null });
      mockedSupabase.from.mockImplementation((table: string) => {
        if (table === 'character_abilities') return builder;
        throw new Error(`Unexpected table: ${table}`);
      });

      await AbilityService.unlearnAbility('char-1', 'ability-1');

      expect(builder.eq).toHaveBeenNthCalledWith(1, 'character_id', 'char-1');
      expect(builder.eq).toHaveBeenNthCalledWith(2, 'ability_id', 'ability-1');
    });

    it('useAbility：依 character_id + ability_id 查詢並扣除次數', async () => {
      const fetchBuilder = createChainable({ data: { current_uses: 2 }, error: null });
      const updateBuilder = createChainable({ data: { id: 'ca-1', current_uses: 1 }, error: null });
      mockedSupabase.from
        .mockImplementationOnce(() => fetchBuilder)
        .mockImplementationOnce(() => updateBuilder);

      const result = await AbilityService.useAbility('char-1', 'ability-1');

      expect(fetchBuilder.eq).toHaveBeenNthCalledWith(1, 'character_id', 'char-1');
      expect(fetchBuilder.eq).toHaveBeenNthCalledWith(2, 'ability_id', 'ability-1');
      expect(updateBuilder.eq).toHaveBeenNthCalledWith(1, 'character_id', 'char-1');
      expect(updateBuilder.eq).toHaveBeenNthCalledWith(2, 'ability_id', 'ability-1');
      expect(result.current_uses).toBe(1);
    });

    it('updateAbilityMaxUses：依 character_id + ability_id 更新最大次數', async () => {
      const builder = createChainable({ data: { id: 'ca-1', max_uses: 5 }, error: null });
      mockedSupabase.from.mockImplementation((table: string) => {
        if (table === 'character_abilities') return builder;
        throw new Error(`Unexpected table: ${table}`);
      });

      await AbilityService.updateAbilityMaxUses('char-1', 'ability-1', 5);

      expect(builder.eq).toHaveBeenNthCalledWith(1, 'character_id', 'char-1');
      expect(builder.eq).toHaveBeenNthCalledWith(2, 'ability_id', 'ability-1');
    });

    it('updateCharacterAbility：未傳 characterAbilityId 時依 character_id + ability_id 更新', async () => {
      const builder = createChainable({ data: { id: 'ca-1' }, error: null });
      mockedSupabase.from.mockImplementation((table: string) => {
        if (table === 'character_abilities') return builder;
        throw new Error(`Unexpected table: ${table}`);
      });

      await AbilityService.updateCharacterAbility('char-1', 'ability-1', { max_uses: 3 });

      expect(builder.eq).toHaveBeenNthCalledWith(1, 'character_id', 'char-1');
      expect(builder.eq).toHaveBeenNthCalledWith(2, 'ability_id', 'ability-1');
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
      name_en: '',
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

  describe('getDisplayValues', () => {
    it('當 description_override 為空字串時，顯示值應為空字串而非能力原始描述', () => {
      const charAbility = {
        id: 'ca-1',
        character_id: 'c1',
        ability_id: 'a1',
        name_override: null,
        name_en_override: null,
        description_override: '',
        source_override: null,
        recovery_type_override: null,
        ability: {
          id: 'a1',
          name: '偷襲',
          name_en: 'Sneak Attack',
          description: '造成額外傷害',
          source: '職業',
          recovery_type: '常駐',
        },
      } as any;
      const display = AbilityService.getDisplayValues(charAbility);
      expect(display.description).toBe('');
    });

    it('當 description_override 為 null 時，顯示能力原始描述', () => {
      const charAbility = {
        id: 'ca-1',
        character_id: 'c1',
        ability_id: 'a1',
        description_override: null,
        ability: { id: 'a1', name: '偷襲', description: '造成額外傷害', source: '職業', recovery_type: '常駐' },
      } as any;
      const display = AbilityService.getDisplayValues(charAbility);
      expect(display.description).toBe('造成額外傷害');
    });
  });

  describe('updateCharacterAbility', () => {
    it('當 updates.description 為空字串時，應寫入 description_override: ""', async () => {
      const updateBuilder: SupabaseBuilder = {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'ca-1', description_override: '' },
                error: null,
              }),
            }),
          }),
        }),
      };
      mockedSupabase.from.mockImplementation((table: string) => {
        if (table === 'character_abilities') return updateBuilder as any;
        throw new Error(`Unexpected table: ${table}`);
      });

      await AbilityService.updateCharacterAbility(
        'char-1',
        'ability-1',
        { description: '' },
        'ca-1'
      );

      expect((updateBuilder.update as Mock)).toHaveBeenCalledWith(
        expect.objectContaining({ description_override: '' })
      );
    });
  });
});

