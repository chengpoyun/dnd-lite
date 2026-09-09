/**
 * 整合測試：能力／物品的 stat_bonuses.savingThrowProficiency / skillProficiency
 * 應原樣流入 collectSourceBonusesForCharacter 回傳的 bySource（供 getFinalSavingThrow/getFinalSkillBonus 讀取）
 * 比照 advantageDisadvantage.integration.test.ts 的 mock 方式，僅 mock supabase。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.unmock('../../services/detailedCharacter');

const CHARACTER_ID = '00000000-0000-0000-0000-000000000001';

const mockCharacterAbilityWithSaveProficiency = [
  {
    id: 'ca-1',
    character_id: CHARACTER_ID,
    name_override: '適應力（體質）',
    affects_stats: true,
    stat_bonuses: {
      savingThrowProficiency: ['con'],
    },
  },
];

const mockCharacterAbilityWithSkillProficiency = [
  {
    id: 'ca-2',
    character_id: CHARACTER_ID,
    name_override: '運動高手',
    affects_stats: true,
    stat_bonuses: {
      skillProficiency: { '運動': 1 },
    },
  },
];

const mockCharacterItemWithSkillExpertise = [
  {
    id: 'ci-1',
    character_id: CHARACTER_ID,
    name_override: '大師的工具',
    category_override: '裝備',
    affects_stats: true,
    is_equipped: true,
    applies_unequipped: false,
    sockets: [],
    stat_bonuses: {
      skillProficiency: { '運動': 2 },
    },
  },
];

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('characterBonusAggregation - 熟練/專精賦予', () => {
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

  it('能力賦予豁免熟練時，bySource 對應筆有 savingThrowProficiency', async () => {
    const { supabase } = await import('../../lib/supabase');
    (supabase as any).__mockCharacterAbilities = mockCharacterAbilityWithSaveProficiency;
    (supabase as any).__mockCharacterItems = [];

    const { DetailedCharacterService } = await import('../../services/detailedCharacter');
    const aggregated = await DetailedCharacterService.collectSourceBonusesForCharacter(CHARACTER_ID);

    const source = aggregated.bySource.find((s) => s.id === 'ca-1');
    expect(source?.savingThrowProficiency).toEqual(['con']);
  });

  it('能力賦予技能熟練時，bySource 對應筆有 skillProficiency', async () => {
    const { supabase } = await import('../../lib/supabase');
    (supabase as any).__mockCharacterAbilities = mockCharacterAbilityWithSkillProficiency;
    (supabase as any).__mockCharacterItems = [];

    const { DetailedCharacterService } = await import('../../services/detailedCharacter');
    const aggregated = await DetailedCharacterService.collectSourceBonusesForCharacter(CHARACTER_ID);

    const source = aggregated.bySource.find((s) => s.id === 'ca-2');
    expect(source?.skillProficiency).toEqual({ '運動': 1 });
  });

  it('穿戴中的物品賦予技能專精時，bySource 對應筆有 skillProficiency', async () => {
    const { supabase } = await import('../../lib/supabase');
    (supabase as any).__mockCharacterAbilities = [];
    (supabase as any).__mockCharacterItems = mockCharacterItemWithSkillExpertise;

    const { DetailedCharacterService } = await import('../../services/detailedCharacter');
    const aggregated = await DetailedCharacterService.collectSourceBonusesForCharacter(CHARACTER_ID);

    const source = aggregated.bySource.find((s) => s.id === 'ci-1');
    expect(source?.skillProficiency).toEqual({ '運動': 2 });
  });

  it('非法的 skillProficiency 值（非 1 或 2）不應被寫入', async () => {
    const { supabase } = await import('../../lib/supabase');
    (supabase as any).__mockCharacterAbilities = [
      {
        id: 'ca-3',
        character_id: CHARACTER_ID,
        name_override: '無效資料',
        affects_stats: true,
        stat_bonuses: { skillProficiency: { '運動': 5 } },
      },
    ];
    (supabase as any).__mockCharacterItems = [];

    const { DetailedCharacterService } = await import('../../services/detailedCharacter');
    const aggregated = await DetailedCharacterService.collectSourceBonusesForCharacter(CHARACTER_ID);

    const source = aggregated.bySource.find((s) => s.id === 'ca-3');
    expect(source?.skillProficiency).toBeUndefined();
  });
});
