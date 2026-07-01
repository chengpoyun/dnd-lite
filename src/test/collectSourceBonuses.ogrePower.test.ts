/**
 * 整合測試：食人魔力量手套（裝備中）經由 collectSourceBonusesForCharacter
 * 應產生 abilityScores.str 的差額，使力量設為 19。
 * 仿 advantageDisadvantage.integration 的做法：vi.unmock 取真實服務、僅 mock supabase、動態 import。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.unmock('../../services/detailedCharacter');

const CHARACTER_ID = '00000000-0000-0000-0000-000000000099';

const gauntletRow = (isEquipped: boolean) => ({
  id: 'ci-gauntlet',
  character_id: CHARACTER_ID,
  item_id: 'gi-gauntlet',
  name_override: null,
  affects_stats: null,
  stat_bonuses: null,
  is_equipped: isEquipped,
  item: {
    id: 'gi-gauntlet',
    name: '食人魔力量手套',
    affects_stats: true,
    stat_bonuses: { specialEffectId: 'ogrePower' },
  },
});

// 另一件「直接 +N 力量值」的裝備（測試下限是套用在「最終屬性值」上）
const strBeltRow = (bonus: number) => ({
  id: 'ci-belt',
  character_id: CHARACTER_ID,
  item_id: 'gi-belt',
  name_override: null,
  affects_stats: null,
  stat_bonuses: null,
  is_equipped: true,
  item: {
    id: 'gi-belt',
    name: '力量腰帶',
    affects_stats: true,
    stat_bonuses: { abilityScores: { str: bonus } },
  },
});

vi.mock('../../lib/supabase', () => ({
  supabase: { from: vi.fn() },
}));

describe('collectSourceBonusesForCharacter - 食人魔力量手套', () => {
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

  it('裝備手套且基礎力量 10 時，abilityScores.str 應為 +9（→19），並列入加值來源', async () => {
    const { supabase } = await import('../../lib/supabase');
    (supabase as any).__mockAbilities = [];
    (supabase as any).__mockItems = [gauntletRow(true)];

    const { DetailedCharacterService } = await import('../../services/detailedCharacter');
    const result = await DetailedCharacterService.collectSourceBonusesForCharacter(CHARACTER_ID, {
      level: 5,
      abilityScores: { str: 10 },
    });

    expect(result.abilityScores.str).toBe(9);
    const src = result.bySource.find((s: any) => s.id === 'ci-gauntlet');
    expect(src?.type).toBe('item');
    expect(src?.abilityScores?.str).toBe(9);
  });

  it('基礎力量已 ≥19 時手套無效（無 str 加值）', async () => {
    const { supabase } = await import('../../lib/supabase');
    (supabase as any).__mockAbilities = [];
    (supabase as any).__mockItems = [gauntletRow(true)];

    const { DetailedCharacterService } = await import('../../services/detailedCharacter');
    const result = await DetailedCharacterService.collectSourceBonusesForCharacter(CHARACTER_ID, {
      level: 5,
      abilityScores: { str: 20 },
    });

    expect(result.abilityScores.str ?? 0).toBe(0);
  });

  it('下限套用在「最終屬性值」：基礎10 + 其他+4 → 手套只補 5（最終19）', async () => {
    const { supabase } = await import('../../lib/supabase');
    (supabase as any).__mockAbilities = [];
    (supabase as any).__mockItems = [gauntletRow(true), strBeltRow(4)];

    const { DetailedCharacterService } = await import('../../services/detailedCharacter');
    const result = await DetailedCharacterService.collectSourceBonusesForCharacter(CHARACTER_ID, {
      level: 5,
      abilityScores: { str: 10 },
    });

    // 腰帶 +4，手套補 5（10+4=14 → 19），合計 +9，最終力量 19
    expect(result.abilityScores.str).toBe(9);
    expect(result.bySource.find((s: any) => s.id === 'ci-belt')?.abilityScores?.str).toBe(4);
    expect(result.bySource.find((s: any) => s.id === 'ci-gauntlet')?.abilityScores?.str).toBe(5);
  });

  it('其他加值已讓最終 ≥19 時手套無效：基礎16 + 其他+4 → 手套補 0', async () => {
    const { supabase } = await import('../../lib/supabase');
    (supabase as any).__mockAbilities = [];
    (supabase as any).__mockItems = [gauntletRow(true), strBeltRow(4)];

    const { DetailedCharacterService } = await import('../../services/detailedCharacter');
    const result = await DetailedCharacterService.collectSourceBonusesForCharacter(CHARACTER_ID, {
      level: 5,
      abilityScores: { str: 16 },
    });

    // 16+4=20 ≥19，手套不再補；合計只有腰帶 +4
    expect(result.abilityScores.str).toBe(4);
    expect(result.bySource.find((s: any) => s.id === 'ci-gauntlet')).toBeUndefined();
  });

  it('未裝備時不生效', async () => {
    const { supabase } = await import('../../lib/supabase');
    (supabase as any).__mockAbilities = [];
    (supabase as any).__mockItems = [gauntletRow(false)];

    const { DetailedCharacterService } = await import('../../services/detailedCharacter');
    const result = await DetailedCharacterService.collectSourceBonusesForCharacter(CHARACTER_ID, {
      level: 5,
      abilityScores: { str: 10 },
    });

    expect(result.abilityScores.str ?? 0).toBe(0);
    expect(result.bySource).toHaveLength(0);
  });
});
