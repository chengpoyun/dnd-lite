/**
 * 整合測試：collectSourceBonusesForCharacter 的「需裝備才生效」規則
 * - 裝備分類物品：預設仍要 is_equipped 才套用加值（含插槽鑲嵌效果），
 *   但若 applies_unequipped 為 true，即使未裝備也套用
 * - 非裝備分類物品（藥水、雜項）：本來就沒有裝備概念，持有即套用，不檢查 is_equipped
 * 仿 collectSourceBonuses.ogrePower.test.ts 的做法：vi.unmock 取真實服務、僅 mock supabase。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.unmock('../../services/detailedCharacter');

const CHARACTER_ID = '00000000-0000-0000-0000-000000000066';

const itemRow = (overrides: Record<string, any> = {}) => ({
  id: 'ci-1',
  character_id: CHARACTER_ID,
  item_id: 'gi-1',
  name_override: '測試物品',
  affects_stats: null,
  stat_bonuses: null,
  applies_unequipped: false,
  is_equipped: false,
  sockets: [],
  item: {
    id: 'gi-1',
    name: '測試物品',
    category: '裝備',
    affects_stats: true,
    stat_bonuses: { combatStats: { ac: 2 } },
    applies_unequipped: false,
  },
  ...overrides,
});

vi.mock('../../lib/supabase', () => ({
  supabase: { from: vi.fn() },
}));

describe('collectSourceBonusesForCharacter - applies_unequipped（無須裝備也生效）', () => {
  beforeEach(async () => {
    vi.resetModules();
    const { supabase } = await import('../../lib/supabase');
    const fromFn = supabase.from as ReturnType<typeof vi.fn>;
    fromFn.mockImplementation((table: string) => ({
      select: () => ({
        eq: () => {
          if (table === 'character_abilities') {
            return Promise.resolve({ data: (supabase as any).__mockAbilities ?? [], error: null });
          }
          if (table === 'character_items') {
            return Promise.resolve({ data: (supabase as any).__mockItems ?? [], error: null });
          }
          return Promise.resolve({ data: [], error: null });
        },
      }),
    }));
  });

  it('裝備分類、未裝備、applies_unequipped 預設 false 時，維持現有行為：不套用加值', async () => {
    const { supabase } = await import('../../lib/supabase');
    (supabase as any).__mockAbilities = [];
    (supabase as any).__mockItems = [itemRow({ is_equipped: false, applies_unequipped: false })];

    const { DetailedCharacterService } = await import('../../services/detailedCharacter');
    const result = await DetailedCharacterService.collectSourceBonusesForCharacter(CHARACTER_ID, { level: 5 });

    expect(result.combatStats.ac ?? 0).toBe(0);
    expect(result.bySource).toHaveLength(0);
  });

  it('裝備分類、未裝備、applies_unequipped 為 true 時，即使未裝備也套用加值', async () => {
    const { supabase } = await import('../../lib/supabase');
    (supabase as any).__mockAbilities = [];
    (supabase as any).__mockItems = [itemRow({ is_equipped: false, applies_unequipped: true })];

    const { DetailedCharacterService } = await import('../../services/detailedCharacter');
    const result = await DetailedCharacterService.collectSourceBonusesForCharacter(CHARACTER_ID, { level: 5 });

    expect(result.combatStats.ac).toBe(2);
    expect(result.bySource).toHaveLength(1);
  });

  it('裝備分類、已裝備時，不論 applies_unequipped 為何都套用加值（維持現有行為）', async () => {
    const { supabase } = await import('../../lib/supabase');
    (supabase as any).__mockAbilities = [];
    (supabase as any).__mockItems = [itemRow({ is_equipped: true, applies_unequipped: false })];

    const { DetailedCharacterService } = await import('../../services/detailedCharacter');
    const result = await DetailedCharacterService.collectSourceBonusesForCharacter(CHARACTER_ID, { level: 5 });

    expect(result.combatStats.ac).toBe(2);
  });

  it('applies_unequipped 只在 character_items 有明確值時使用，否則退回 global_items 的值', async () => {
    const { supabase } = await import('../../lib/supabase');
    (supabase as any).__mockAbilities = [];
    (supabase as any).__mockItems = [
      itemRow({
        is_equipped: false,
        applies_unequipped: undefined,
        item: {
          id: 'gi-1', name: '測試物品', category: '裝備',
          affects_stats: true, stat_bonuses: { combatStats: { ac: 2 } },
          applies_unequipped: true,
        },
      }),
    ];

    const { DetailedCharacterService } = await import('../../services/detailedCharacter');
    const result = await DetailedCharacterService.collectSourceBonusesForCharacter(CHARACTER_ID, { level: 5 });

    expect(result.combatStats.ac).toBe(2);
  });

  it('非裝備分類（雜項）物品，即使 is_equipped 為 false，也一律套用加值，不受此限制', async () => {
    const { supabase } = await import('../../lib/supabase');
    (supabase as any).__mockAbilities = [];
    (supabase as any).__mockItems = [
      itemRow({
        is_equipped: false,
        applies_unequipped: false,
        item: {
          id: 'gi-1', name: '幸運符', category: '雜項',
          affects_stats: true, stat_bonuses: { combatStats: { ac: 1 } },
          applies_unequipped: false,
        },
      }),
    ];

    const { DetailedCharacterService } = await import('../../services/detailedCharacter');
    const result = await DetailedCharacterService.collectSourceBonusesForCharacter(CHARACTER_ID, { level: 5 });

    expect(result.combatStats.ac).toBe(1);
    expect(result.bySource).toHaveLength(1);
  });

  it('非裝備分類（藥水）的 category_override 判斷也一律套用加值', async () => {
    const { supabase } = await import('../../lib/supabase');
    (supabase as any).__mockAbilities = [];
    (supabase as any).__mockItems = [
      itemRow({
        is_equipped: false,
        category_override: '藥水',
        item: {
          id: 'gi-1', name: '力量藥水', category: '裝備',
          affects_stats: true, stat_bonuses: { combatStats: { ac: 1 } },
        },
      }),
    ];

    const { DetailedCharacterService } = await import('../../services/detailedCharacter');
    const result = await DetailedCharacterService.collectSourceBonusesForCharacter(CHARACTER_ID, { level: 5 });

    expect(result.combatStats.ac).toBe(1);
  });

  it('裝備分類的插槽鑲嵌效果，未裝備時不套用；applies_unequipped=true 時連同插槽效果一起套用', async () => {
    const { supabase } = await import('../../lib/supabase');
    (supabase as any).__mockAbilities = [];
    (supabase as any).__mockItems = [
      itemRow({
        is_equipped: false,
        applies_unequipped: true,
        affects_stats: false,
        sockets: [{ decoration_name: '素材Y', note: '', stat_bonuses: { combatStats: { initiative: 3 } } }],
      }),
    ];

    const { DetailedCharacterService } = await import('../../services/detailedCharacter');
    const result = await DetailedCharacterService.collectSourceBonusesForCharacter(CHARACTER_ID, { level: 5 });

    expect(result.combatStats.initiative).toBe(3);
    const src = result.bySource.find((s: any) => s.id === 'ci-1-socket-0');
    expect(src?.combatStats?.initiative).toBe(3);
  });
});
