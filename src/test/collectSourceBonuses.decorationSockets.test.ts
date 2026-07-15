/**
 * 整合測試：裝備插槽鑲嵌素材的效果彙總（collectSourceBonusesForCharacter）
 * 素材效果獨立於裝備本身的 affects_stats，只要裝備穿戴中、插槽有鑲嵌就套用；
 * 來源名稱格式為「裝備名稱［素材名稱］」。
 * 仿 collectSourceBonuses.ogrePower.test.ts 的做法：vi.unmock 取真實服務、僅 mock supabase。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.unmock('../../services/detailedCharacter');

const CHARACTER_ID = '00000000-0000-0000-0000-000000000088';

const weaponRow = (overrides: Record<string, any> = {}) => ({
  id: 'ci-sword',
  character_id: CHARACTER_ID,
  item_id: 'gi-sword',
  name_override: '大劍',
  affects_stats: false,
  stat_bonuses: null,
  is_equipped: true,
  sockets: [],
  item: {
    id: 'gi-sword',
    name: '大劍',
    category: '裝備',
    affects_stats: false,
    stat_bonuses: null,
  },
  ...overrides,
});

vi.mock('../../lib/supabase', () => ({
  supabase: { from: vi.fn() },
}));

describe('collectSourceBonusesForCharacter - 插槽鑲嵌素材效果', () => {
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

  it('裝備本身 affects_stats 為 false，但插槽鑲嵌的素材仍會獨立生效', async () => {
    const { supabase } = await import('../../lib/supabase');
    (supabase as any).__mockAbilities = [];
    (supabase as any).__mockItems = [
      weaponRow({
        sockets: [{ decoration_name: '火龍逆鱗', note: '', stat_bonuses: { combatStats: { attackDamage: 2 } } }],
      }),
    ];

    const { DetailedCharacterService } = await import('../../services/detailedCharacter');
    const result = await DetailedCharacterService.collectSourceBonusesForCharacter(CHARACTER_ID, {
      level: 5,
      abilityScores: {},
    });

    expect(result.combatStats.attackDamage).toBe(2);
    const src = result.bySource.find((s: any) => s.id === 'ci-sword-socket-0');
    expect(src?.name).toBe('大劍［火龍逆鱗］');
    expect(src?.combatStats?.attackDamage).toBe(2);
  });

  it('多個插槽各自獨立加總，來源名稱各自帶有對應的素材名', async () => {
    const { supabase } = await import('../../lib/supabase');
    (supabase as any).__mockAbilities = [];
    (supabase as any).__mockItems = [
      weaponRow({
        sockets: [
          { decoration_name: '素材A', note: '', stat_bonuses: { combatStats: { ac: 1 } } },
          { decoration_name: '素材B', note: '', stat_bonuses: { combatStats: { initiative: 2 } } },
        ],
      }),
    ];

    const { DetailedCharacterService } = await import('../../services/detailedCharacter');
    const result = await DetailedCharacterService.collectSourceBonusesForCharacter(CHARACTER_ID, {
      level: 5,
      abilityScores: {},
    });

    expect(result.combatStats.ac).toBe(1);
    expect(result.combatStats.initiative).toBe(2);
    const names = result.bySource.map((s: any) => s.name);
    expect(names).toContain('大劍［素材A］');
    expect(names).toContain('大劍［素材B］');
  });

  it('sockets 中的 null（空插槽）會被跳過，不產生加值來源', async () => {
    const { supabase } = await import('../../lib/supabase');
    (supabase as any).__mockAbilities = [];
    (supabase as any).__mockItems = [
      weaponRow({
        sockets: [null, { decoration_name: '素材C', note: '', stat_bonuses: { combatStats: { speed: 5 } } }],
      }),
    ];

    const { DetailedCharacterService } = await import('../../services/detailedCharacter');
    const result = await DetailedCharacterService.collectSourceBonusesForCharacter(CHARACTER_ID, {
      level: 5,
      abilityScores: {},
    });

    expect(result.combatStats.speed).toBe(5);
    expect(result.bySource).toHaveLength(1);
  });

  it('裝備未穿戴時，插槽鑲嵌的效果也不會生效', async () => {
    const { supabase } = await import('../../lib/supabase');
    (supabase as any).__mockAbilities = [];
    (supabase as any).__mockItems = [
      weaponRow({
        is_equipped: false,
        sockets: [{ decoration_name: '素材X', note: '', stat_bonuses: { combatStats: { ac: 3 } } }],
      }),
    ];

    const { DetailedCharacterService } = await import('../../services/detailedCharacter');
    const result = await DetailedCharacterService.collectSourceBonusesForCharacter(CHARACTER_ID, {
      level: 5,
      abilityScores: {},
    });

    expect(result.combatStats.ac ?? 0).toBe(0);
    expect(result.bySource).toHaveLength(0);
  });

  it('decoration_name 缺失或非字串時，來源名稱退回「素材」', async () => {
    const { supabase } = await import('../../lib/supabase');
    (supabase as any).__mockAbilities = [];
    (supabase as any).__mockItems = [
      weaponRow({
        sockets: [{ note: '', stat_bonuses: { combatStats: { ac: 1 } } }],
      }),
    ];

    const { DetailedCharacterService } = await import('../../services/detailedCharacter');
    const result = await DetailedCharacterService.collectSourceBonusesForCharacter(CHARACTER_ID, {
      level: 5,
      abilityScores: {},
    });

    expect(result.bySource[0].name).toBe('大劍［素材］');
  });

  it('插槽沒有 stat_bonuses（純敘述效果）時，不會產生加值來源', async () => {
    const { supabase } = await import('../../lib/supabase');
    (supabase as any).__mockAbilities = [];
    (supabase as any).__mockItems = [
      weaponRow({
        sockets: [{ decoration_name: '純敘述素材', note: '只是好看' }],
      }),
    ];

    const { DetailedCharacterService } = await import('../../services/detailedCharacter');
    const result = await DetailedCharacterService.collectSourceBonusesForCharacter(CHARACTER_ID, {
      level: 5,
      abilityScores: {},
    });

    expect(result.bySource).toHaveLength(0);
  });
});
