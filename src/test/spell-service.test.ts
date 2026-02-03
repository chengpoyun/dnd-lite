import { describe, it, expect, vi, beforeEach } from 'vitest';
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

describe('SpellService - 個人法術與上傳邏輯', () => {
  const mockedSupabase = supabase as unknown as {
    from: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('上傳到資料庫時，若已有相同 name_en（不分大小寫），應只更新角色法術的 spell_id', async () => {
    const characterSpellId = 'char-spell-1';
    const existingSpellId = 'spell-123';

    const globalBuilder: SupabaseBuilder = {
      select: vi.fn().mockReturnValue({
        ilike: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              id: existingSpellId,
              name: '已存在法術',
              name_en: 'Fireball',
              description: 'desc',
              level: 3,
              casting_time: '動作',
              school: '塑能',
              concentration: false,
              ritual: false,
              duration: '即效',
              range: '150尺',
              source: 'PHB',
              verbal: true,
              somatic: true,
              material: '材料'
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
      if (table === 'spells') return globalBuilder as any;
      if (table === 'character_spells') return updateBuilder as any;
      throw new Error(`Unexpected table: ${table}`);
    });

    const data: SpellService.CreateSpellDataForUpload = {
      name: '火球術',
      name_en: 'fireball',
      level: 3,
      casting_time: '動作',
      school: '塑能',
      concentration: false,
      ritual: false,
      duration: '即效',
      range: '150尺',
      source: 'PHB',
      verbal: true,
      somatic: true,
      material: '材料',
      description: 'test desc'
    };

    const result = await SpellService.uploadCharacterSpellToGlobal(characterSpellId, data);

    expect(result.success).toBe(true);
    expect((updateBuilder.update as vi.Mock)).toHaveBeenCalledWith({
      spell_id: existingSpellId
    });
  });

  it('上傳到資料庫時，若沒有相同 name_en，應建立新的 spell 並更新角色法術的 spell_id', async () => {
    const characterSpellId = 'char-spell-2';
    const newSpellId = 'spell-new-1';

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
              id: newSpellId,
              name: '新法術',
              name_en: 'NewSpell',
              description: 'desc',
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
              material: '材料'
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
      if (table === 'spells') return globalBuilder as any;
      if (table === 'character_spells') return updateBuilder as any;
      throw new Error(`Unexpected table: ${table}`);
    });

    const data: SpellService.CreateSpellDataForUpload = {
      name: '新法術',
      name_en: 'NewSpell',
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
      description: 'test desc'
    };

    const result = await SpellService.uploadCharacterSpellToGlobal(characterSpellId, data);

    expect(result.success).toBe(true);
    expect((globalBuilder.insert as vi.Mock)).toHaveBeenCalledWith([data]);
    expect((updateBuilder.update as vi.Mock)).toHaveBeenCalledWith({
      spell_id: newSpellId
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
    const insertArg = (insertBuilder.insert as vi.Mock).mock.calls[0][0][0];
    expect(insertArg.spell_id).toBeNull();
  });
});
