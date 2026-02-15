/**
 * 整合測試：reload 後 extra_data 正確、來源變動後結果正確
 * Mock 能力／物品 stat_bonuses（含優劣勢陣列），執行 collectSourceBonusesForCharacter，斷言 saveAdvantageDisadvantage / skillAdvantageDisadvantage
 * 使用 vi.unmock 取得真實 DetailedCharacterService，僅 mock supabase。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.unmock('../../services/detailedCharacter');

const CHARACTER_ID = '00000000-0000-0000-0000-000000000001';

const mockCharacterAbilitiesWithStrAdvantage = [
  {
    id: 'ca-1',
    character_id: CHARACTER_ID,
    ability_id: 'ab-1',
    name_override: null,
    affects_stats: true,
    stat_bonuses: {
      savingThrowAdvantage: ['str'],
      skillAdvantage: ['察覺'],
    },
    ability: {
      id: 'ab-1',
      name: '警覺',
      name_en: 'Alert',
      affects_stats: true,
      stat_bonuses: { savingThrowAdvantage: ['str'], skillAdvantage: ['察覺'] },
    },
  },
];

const mockCharacterAbilitiesWithStrDisadvantage = [
  {
    id: 'ca-2',
    character_id: CHARACTER_ID,
    ability_id: 'ab-2',
    name_override: null,
    affects_stats: true,
    stat_bonuses: {
      savingThrowDisadvantage: ['str'],
      skillDisadvantage: ['隱匿'],
    },
    ability: {
      id: 'ab-2',
      name: '詛咒',
      name_en: 'Curse',
      affects_stats: true,
      stat_bonuses: { savingThrowDisadvantage: ['str'], skillDisadvantage: ['隱匿'] },
    },
  },
];

const mockCharacterAbilitiesBoth = [
  mockCharacterAbilitiesWithStrAdvantage[0],
  mockCharacterAbilitiesWithStrDisadvantage[0],
];

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('advantageDisadvantage integration', () => {
  beforeEach(async () => {
    vi.resetModules();
    const { supabase } = await import('../../lib/supabase');
    const fromFn = supabase.from as ReturnType<typeof vi.fn>;
    if (typeof fromFn.mockImplementation === 'function') {
      fromFn.mockImplementation((table: string) => ({
        select: () => ({
          eq: (_key: string, _val: string) => {
            if (table === 'character_abilities') {
              return Promise.resolve({
                data: (supabase as any).__mockCharacterAbilities ?? [],
                error: null,
              });
            }
            if (table === 'character_items') {
              return Promise.resolve({
                data: (supabase as any).__mockCharacterItems ?? [],
                error: null,
              });
            }
            return Promise.resolve({ data: [], error: null });
          },
        }),
      }));
    }
  });

  it('reload: one ability with str advantage and 察覺 advantage -> extra_data has str=advantage, 察覺=advantage', async () => {
    const { supabase } = await import('../../lib/supabase');
    (supabase as any).__mockCharacterAbilities = mockCharacterAbilitiesWithStrAdvantage;
    (supabase as any).__mockCharacterItems = [];

    const { DetailedCharacterService } = await import('../../services/detailedCharacter');
    const aggregated = await DetailedCharacterService.collectSourceBonusesForCharacter(CHARACTER_ID);

    expect(aggregated.saveAdvantageDisadvantage).toBeDefined();
    expect(aggregated.saveAdvantageDisadvantage!['str']).toBe('advantage');
    expect(aggregated.skillAdvantageDisadvantage).toBeDefined();
    expect(aggregated.skillAdvantageDisadvantage!['察覺']).toBe('advantage');
    expect(aggregated.skillAdvantageDisadvantage!['隱匿']).toBe('normal');
  });

  it('reload: one ability with str disadvantage -> extra_data has str=disadvantage', async () => {
    const { supabase } = await import('../../lib/supabase');
    (supabase as any).__mockCharacterAbilities = mockCharacterAbilitiesWithStrDisadvantage;
    (supabase as any).__mockCharacterItems = [];

    const { DetailedCharacterService } = await import('../../services/detailedCharacter');
    const aggregated = await DetailedCharacterService.collectSourceBonusesForCharacter(CHARACTER_ID);

    expect(aggregated.saveAdvantageDisadvantage!['str']).toBe('disadvantage');
    expect(aggregated.skillAdvantageDisadvantage!['隱匿']).toBe('disadvantage');
  });

  it('source change: A (str advantage) + B (str disadvantage) -> str=normal; remove B -> str=advantage', async () => {
    const { supabase } = await import('../../lib/supabase');
    const { DetailedCharacterService } = await import('../../services/detailedCharacter');

    (supabase as any).__mockCharacterAbilities = mockCharacterAbilitiesBoth;
    (supabase as any).__mockCharacterItems = [];
    const aggregatedBoth = await DetailedCharacterService.collectSourceBonusesForCharacter(CHARACTER_ID);
    expect(aggregatedBoth.saveAdvantageDisadvantage!['str']).toBe('normal');

    (supabase as any).__mockCharacterAbilities = mockCharacterAbilitiesWithStrAdvantage;
    const aggregatedAOnly = await DetailedCharacterService.collectSourceBonusesForCharacter(CHARACTER_ID);
    expect(aggregatedAOnly.saveAdvantageDisadvantage!['str']).toBe('advantage');
  });
});
