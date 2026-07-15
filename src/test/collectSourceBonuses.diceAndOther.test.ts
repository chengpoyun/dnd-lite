/**
 * 整合測試：collectSourceBonusesForCharacter 對「骰子記法戰鬥屬性加成」與「其他效果」文字的聚合
 * - combatStats 的骰子記法字串（如 "1d8"）應原樣保留在該來源的 bySource 條目，不被數字加總吃掉
 * - totals.combatStats 的數字加總應忽略骰子字串，只加總真正的數字
 * - stat_bonuses.other 的自由文字應原樣傳到 bySource，即使該來源沒有任何數值加成也要能被列出
 * 仿 collectSourceBonuses.ogrePower.test.ts 的做法：vi.unmock 取真實服務、僅 mock supabase。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.unmock('../../services/detailedCharacter');

const CHARACTER_ID = '00000000-0000-0000-0000-000000000077';

const itemRow = (id: string, name: string, statBonuses: any, overrides: Record<string, any> = {}) => ({
  id,
  character_id: CHARACTER_ID,
  item_id: `gi-${id}`,
  name_override: null,
  affects_stats: null,
  stat_bonuses: null,
  is_equipped: true,
  sockets: [],
  item: {
    id: `gi-${id}`,
    name,
    affects_stats: true,
    stat_bonuses: statBonuses,
  },
  ...overrides,
});

const abilityRow = (id: string, name: string, statBonuses: any) => ({
  id,
  character_id: CHARACTER_ID,
  name_override: name,
  affects_stats: true,
  stat_bonuses: statBonuses,
  ability: { name, affects_stats: true, stat_bonuses: null },
});

vi.mock('../../lib/supabase', () => ({
  supabase: { from: vi.fn() },
}));

describe('collectSourceBonusesForCharacter - 骰子記法加成與其他效果文字', () => {
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

  it('物品的骰子記法攻擊傷害加成，原樣保留在 bySource，不計入 totals 數字加總', async () => {
    const { supabase } = await import('../../lib/supabase');
    (supabase as any).__mockAbilities = [];
    (supabase as any).__mockItems = [
      itemRow('ci-dice', '雷狼結晶', { combatStats: { attackDamage: '1d8' } }),
    ];

    const { DetailedCharacterService } = await import('../../services/detailedCharacter');
    const result = await DetailedCharacterService.collectSourceBonusesForCharacter(CHARACTER_ID, {
      level: 5,
    });

    expect(result.combatStats.attackDamage ?? 0).toBe(0);
    const src = result.bySource.find((s: any) => s.id === 'ci-dice');
    expect(src?.combatStats?.attackDamage).toBe('1d8');
  });

  it('數字加成與骰子加成的物品並存時，totals 只加總數字那一筆，骰子那一筆各自保留在 bySource', async () => {
    const { supabase } = await import('../../lib/supabase');
    (supabase as any).__mockAbilities = [];
    (supabase as any).__mockItems = [
      itemRow('ci-dice', '雷狼結晶', { combatStats: { attackDamage: '1d8' } }),
      itemRow('ci-num', '力量護符', { combatStats: { attackDamage: 3 } }),
    ];

    const { DetailedCharacterService } = await import('../../services/detailedCharacter');
    const result = await DetailedCharacterService.collectSourceBonusesForCharacter(CHARACTER_ID, {
      level: 5,
    });

    expect(result.combatStats.attackDamage).toBe(3);
    expect(result.bySource.find((s: any) => s.id === 'ci-dice')?.combatStats?.attackDamage).toBe('1d8');
    expect(result.bySource.find((s: any) => s.id === 'ci-num')?.combatStats?.attackDamage).toBe(3);
  });

  it('能力的骰子記法加成同樣原樣保留（如 AC）', async () => {
    const { supabase } = await import('../../lib/supabase');
    (supabase as any).__mockAbilities = [abilityRow('ab-dice', '護體氣旋', { combatStats: { ac: '1d4' } })];
    (supabase as any).__mockItems = [];

    const { DetailedCharacterService } = await import('../../services/detailedCharacter');
    const result = await DetailedCharacterService.collectSourceBonusesForCharacter(CHARACTER_ID, {
      level: 5,
    });

    expect(result.combatStats.ac ?? 0).toBe(0);
    expect(result.bySource.find((s: any) => s.id === 'ab-dice')?.combatStats?.ac).toBe('1d4');
  });

  it('物品的「其他」自由文字，即使沒有任何數值加成，也應列入 bySource', async () => {
    const { supabase } = await import('../../lib/supabase');
    (supabase as any).__mockAbilities = [];
    (supabase as any).__mockItems = [
      itemRow('ci-other', '燃燒箭矢', { other: '命中後目標燃燒，每輪損失1d4生命，持續3輪' }),
    ];

    const { DetailedCharacterService } = await import('../../services/detailedCharacter');
    const result = await DetailedCharacterService.collectSourceBonusesForCharacter(CHARACTER_ID, {
      level: 5,
    });

    const src = result.bySource.find((s: any) => s.id === 'ci-other');
    expect(src?.other).toBe('命中後目標燃燒，每輪損失1d4生命，持續3輪');
  });

  it('能力的「其他」自由文字同樣會列入 bySource', async () => {
    const { supabase } = await import('../../lib/supabase');
    (supabase as any).__mockAbilities = [abilityRow('ab-other', '狂戰士之怒', { other: '進入狂暴狀態，無法施法' })];
    (supabase as any).__mockItems = [];

    const { DetailedCharacterService } = await import('../../services/detailedCharacter');
    const result = await DetailedCharacterService.collectSourceBonusesForCharacter(CHARACTER_ID, {
      level: 5,
    });

    expect(result.bySource.find((s: any) => s.id === 'ab-other')?.other).toBe('進入狂暴狀態，無法施法');
  });

  it('「其他」文字為空白字串時不列入 bySource（避免顯示空白項目）', async () => {
    const { supabase } = await import('../../lib/supabase');
    (supabase as any).__mockAbilities = [];
    (supabase as any).__mockItems = [
      itemRow('ci-blank', '普通物品', { other: '   ' }),
    ];

    const { DetailedCharacterService } = await import('../../services/detailedCharacter');
    const result = await DetailedCharacterService.collectSourceBonusesForCharacter(CHARACTER_ID, {
      level: 5,
    });

    expect(result.bySource.find((s: any) => s.id === 'ci-blank')).toBeUndefined();
  });
});
