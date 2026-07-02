import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import { supabase } from '../../lib/supabase';
import * as SpellService from '../../services/spellService';

type SupabaseBuilder = {
  select?: (...args: any[]) => SupabaseBuilder | Promise<any>;
  insert?: (...args: any[]) => SupabaseBuilder | Promise<any>;
  update?: (...args: any[]) => SupabaseBuilder | Promise<any>;
  eq?: (...args: any[]) => SupabaseBuilder | Promise<any>;
  ilike?: (...args: any[]) => SupabaseBuilder | Promise<any>;
  maybeSingle?: () => Promise<any>;
  single?: () => Promise<any>;
};

/** 建立可鏈式呼叫（delete/update/eq）且最終可被 await 的假 query（模擬 supabase 的 thenable builder） */
function createChainable(finalResult: { data?: any; error: any }) {
  const builder: any = {
    delete: vi.fn(() => builder),
    update: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    then: (resolve: (v: any) => void) => resolve(finalResult),
  };
  return builder;
}

describe('SpellService - 個人法術', () => {
  const mockedSupabase = supabase as unknown as {
    from: Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('by 組合鍵（未傳 characterSpellId 時，改用 characterId + spellId）', () => {
    it('forgetSpell：依 character_id + spell_id 刪除', async () => {
      const builder = createChainable({ error: null });
      mockedSupabase.from.mockImplementation((table: string) => {
        if (table === 'character_spells') return builder;
        throw new Error(`Unexpected table: ${table}`);
      });

      await SpellService.forgetSpell('char-1', 'spell-1');

      expect(builder.eq).toHaveBeenNthCalledWith(1, 'character_id', 'char-1');
      expect(builder.eq).toHaveBeenNthCalledWith(2, 'spell_id', 'spell-1');
    });

    it('togglePrepared：依 character_id + spell_id 更新準備狀態', async () => {
      const builder = createChainable({ error: null });
      mockedSupabase.from.mockImplementation((table: string) => {
        if (table === 'character_spells') return builder;
        throw new Error(`Unexpected table: ${table}`);
      });

      await SpellService.togglePrepared('char-1', 'spell-1', true);

      expect(builder.eq).toHaveBeenNthCalledWith(1, 'character_id', 'char-1');
      expect(builder.eq).toHaveBeenNthCalledWith(2, 'spell_id', 'spell-1');
    });
  });

  it('新增個人法術時，應寫入 character_spells 且 spell_id 為 null', async () => {
    const characterId = 'char-1';

    const insertBuilder: SupabaseBuilder = {
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'cs-1',
              character_id: characterId,
              spell_id: null,
              is_prepared: false
            },
            error: null
          })
        })
      })
    };

    mockedSupabase.from.mockImplementation((table: string) => {
      if (table === 'character_spells') return insertBuilder as any;
      throw new Error(`Unexpected table: ${table}`);
    });

    const data: SpellService.CreateCharacterSpellData = {
      name: '個人法術',
      name_en: 'Personal Spell',
      level: 1,
      casting_time: '動作',
      school: '塑能',
      concentration: false,
      ritual: false,
      duration: '即效',
      range: '60尺',
      source: 'PHB',
      verbal: true,
      somatic: true,
      material: '材料',
      description: 'desc'
    };

    const result = await SpellService.createCharacterSpell(characterId, data);

    expect(result.success).toBe(true);
    const insertArg = (insertBuilder.insert as Mock).mock.calls[0][0][0];
    expect(insertArg.spell_id).toBeNull();
  });
});

