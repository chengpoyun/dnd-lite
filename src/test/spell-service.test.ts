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

describe('SpellService - 個人法術', () => {
  const mockedSupabase = supabase as unknown as {
    from: Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
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

