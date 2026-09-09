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

  describe('依 characterAbilityId 單一路徑操作（不再有 characterId/abilityId 組合鍵）', () => {
    it('unlearnAbility：依 id 刪除', async () => {
      const builder = createChainable({ error: null });
      mockedSupabase.from.mockImplementation((table: string) => {
        if (table === 'character_abilities') return builder;
        throw new Error(`Unexpected table: ${table}`);
      });

      await AbilityService.unlearnAbility('ca-1');

      expect(builder.eq).toHaveBeenCalledWith('id', 'ca-1');
    });

    it('useAbility：依 id 查詢並扣除次數', async () => {
      const fetchBuilder = createChainable({ data: { current_uses: 2 }, error: null });
      const updateBuilder = createChainable({ data: { id: 'ca-1', current_uses: 1 }, error: null });
      mockedSupabase.from
        .mockImplementationOnce(() => fetchBuilder)
        .mockImplementationOnce(() => updateBuilder);

      const result = await AbilityService.useAbility('ca-1');

      expect(fetchBuilder.eq).toHaveBeenCalledWith('id', 'ca-1');
      expect(updateBuilder.eq).toHaveBeenCalledWith('id', 'ca-1');
      expect(result.current_uses).toBe(1);
    });

    it('updateAbilityMaxUses：依 id 更新最大次數', async () => {
      const builder = createChainable({ data: { id: 'ca-1', max_uses: 5 }, error: null });
      mockedSupabase.from.mockImplementation((table: string) => {
        if (table === 'character_abilities') return builder;
        throw new Error(`Unexpected table: ${table}`);
      });

      await AbilityService.updateAbilityMaxUses('ca-1', 5);

      expect(builder.eq).toHaveBeenCalledWith('id', 'ca-1');
    });

    it('updateCharacterAbility：依 id 更新', async () => {
      const builder = createChainable({ data: { id: 'ca-1' }, error: null });
      mockedSupabase.from.mockImplementation((table: string) => {
        if (table === 'character_abilities') return builder;
        throw new Error(`Unexpected table: ${table}`);
      });

      await AbilityService.updateCharacterAbility('ca-1', { max_uses: 3 });

      expect(builder.eq).toHaveBeenCalledWith('id', 'ca-1');
    });
  });

  it('新增個人能力時，應寫入 character_abilities，不含 ability_id 欄位（已無此外鍵）', async () => {
    const characterId = 'char-1';

    const insertBuilder: SupabaseBuilder = {
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'ca-1',
              character_id: characterId,
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
    expect(insertArg).not.toHaveProperty('ability_id');
    expect(insertArg.character_id).toBe(characterId);
  });

  describe('updateCharacterAbilityOrder（共用 utils/fractionalOrder 的排序對照表寫入）', () => {
    it('依 updates 對照表，逐筆寫入 sort_order 並限定 character_id', async () => {
      const characterId = 'char-1';
      const builders: SupabaseBuilder[] = [];

      mockedSupabase.from.mockImplementation((table: string) => {
        if (table !== 'character_abilities') throw new Error(`Unexpected table: ${table}`);
        const eqSpy2 = vi.fn().mockResolvedValue({ error: null });
        const eqSpy1 = vi.fn().mockReturnValue({ eq: eqSpy2 });
        const updateSpy = vi.fn().mockReturnValue({ eq: eqSpy1 });
        const builder: any = { update: updateSpy, eq: eqSpy1 };
        builders.push(builder);
        return builder;
      });

      await AbilityService.updateCharacterAbilityOrder(characterId, { 'ca-a': 500, 'ca-b': 1500 });

      expect(builders).toHaveLength(2);
      expect((builders[0].update as Mock)).toHaveBeenCalledWith({ sort_order: 500 });
      expect((builders[1].update as Mock)).toHaveBeenCalledWith({ sort_order: 1500 });
    });

    it('updates 為空物件時應不發送請求，直接失敗', async () => {
      mockedSupabase.from.mockReset();
      const result = await AbilityService.updateCharacterAbilityOrder('char-1', {});
      expect(result).toEqual({ success: false, error: '角色 ID 或排序資料無效' });
      expect(mockedSupabase.from).not.toHaveBeenCalled();
    });

    it('characterId 缺少時應不發送請求，直接失敗', async () => {
      mockedSupabase.from.mockReset();
      const result = await AbilityService.updateCharacterAbilityOrder('', { 'ca-a': 500 });
      expect(result).toEqual({ success: false, error: '角色 ID 或排序資料無效' });
      expect(mockedSupabase.from).not.toHaveBeenCalled();
    });

    it('當後端回傳錯誤時，回傳失敗與錯誤訊息', async () => {
      mockedSupabase.from.mockImplementation((table: string) => {
        if (table !== 'character_abilities') throw new Error(`Unexpected table: ${table}`);
        const eqSpy2 = vi.fn().mockResolvedValue({ error: { message: 'DB error' } });
        const eqSpy1 = vi.fn().mockReturnValue({ eq: eqSpy2 });
        const updateSpy = vi.fn().mockReturnValue({ eq: eqSpy1 });
        return { update: updateSpy };
      });

      const result = await AbilityService.updateCharacterAbilityOrder('char-1', { 'ca-1': 500 });

      expect(result).toEqual({ success: false, error: 'DB error' });
    });
  });

  describe('getDisplayValues', () => {
    it('當 description_override 為空字串時，顯示值為空字串', () => {
      const charAbility = {
        id: 'ca-1',
        character_id: 'c1',
        name_override: '偷襲',
        name_en_override: 'Sneak Attack',
        description_override: '',
        source_override: '職業',
        recovery_type_override: '常駐',
      } as any;
      const display = AbilityService.getDisplayValues(charAbility);
      expect(display.description).toBe('');
    });

    it('當 description_override 為 null 時，顯示值為空字串（不再有全域能力可回退）', () => {
      const charAbility = {
        id: 'ca-1',
        character_id: 'c1',
        description_override: null,
      } as any;
      const display = AbilityService.getDisplayValues(charAbility);
      expect(display.description).toBe('');
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

      await AbilityService.updateCharacterAbility('ca-1', { description: '' });

      expect((updateBuilder.update as Mock)).toHaveBeenCalledWith(
        expect.objectContaining({ description_override: '' })
      );
    });
  });
});

