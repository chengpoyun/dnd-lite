/**
 * 整合測試：character_temporary_conditions 的 stat_bonuses 應與能力／物品一樣
 * 被 collectSourceBonusesForCharacter 聚合進 totals 與 bySource（type: 'temporaryCondition'）。
 * 比照 characterBonusAggregation.proficiency.test.ts 的 mock 方式，僅 mock supabase。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.unmock('../../services/detailedCharacter');

const CHARACTER_ID = '00000000-0000-0000-0000-000000000001';

const mockAffectingCondition = [
  {
    id: 'tc-1',
    character_id: CHARACTER_ID,
    name: '虛弱',
    affects_stats: true,
    stat_bonuses: {
      abilityModifiers: { str: -2 },
      combatStats: { ac: -1 },
    },
  },
];

const mockNonAffectingCondition = [
  {
    id: 'tc-2',
    character_id: CHARACTER_ID,
    name: '流血',
    affects_stats: false,
    stat_bonuses: {
      abilityModifiers: { str: -99 },
    },
  },
];

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('characterBonusAggregation - 臨時狀態', () => {
  beforeEach(async () => {
    vi.resetModules();
    const { supabase } = await import('../../lib/supabase');
    const fromFn = supabase.from as ReturnType<typeof vi.fn>;
    if (typeof fromFn.mockImplementation === 'function') {
      fromFn.mockImplementation((table: string) => ({
        select: () => ({
          eq: (_key: string, _val: string) => {
            if (table === 'character_abilities') {
              return Promise.resolve({ data: [], error: null });
            }
            if (table === 'character_items') {
              return Promise.resolve({ data: [], error: null });
            }
            if (table === 'character_temporary_conditions') {
              return Promise.resolve({
                data: (supabase as any).__mockTemporaryConditions ?? [],
                error: null,
              });
            }
            return Promise.resolve({ data: [], error: null });
          },
        }),
      }));
    }
  });

  it('affects_stats 為 true 的臨時狀態會聚合進 totals 與 bySource（type: temporaryCondition）', async () => {
    const { supabase } = await import('../../lib/supabase');
    (supabase as any).__mockTemporaryConditions = mockAffectingCondition;

    const { DetailedCharacterService } = await import('../../services/detailedCharacter');
    const aggregated = await DetailedCharacterService.collectSourceBonusesForCharacter(CHARACTER_ID);

    const source = aggregated.bySource.find((s) => s.id === 'tc-1');
    expect(source?.type).toBe('temporaryCondition');
    expect(source?.name).toBe('虛弱');
    expect(source?.abilityModifiers).toEqual({ str: -2 });
    expect(source?.combatStats).toEqual({ ac: -1 });
    expect(aggregated.abilityModifiers.str).toBe(-2);
    expect(aggregated.combatStats.ac).toBe(-1);
  });

  it('affects_stats 為 false 的臨時狀態不影響 totals／bySource', async () => {
    const { supabase } = await import('../../lib/supabase');
    (supabase as any).__mockTemporaryConditions = mockNonAffectingCondition;

    const { DetailedCharacterService } = await import('../../services/detailedCharacter');
    const aggregated = await DetailedCharacterService.collectSourceBonusesForCharacter(CHARACTER_ID);

    expect(aggregated.bySource.find((s) => s.id === 'tc-2')).toBeUndefined();
    expect(aggregated.abilityModifiers.str ?? 0).toBe(0);
  });
});
