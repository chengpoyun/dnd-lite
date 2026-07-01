/**
 * 法術位資源同步測試：CombatItemService.syncSpellSlotResources
 * 驗證依施法者等級查表建立/更新「N環法術位」職業資源，並保留使用者手動加值（bonus）。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CombatItemService } from '../../services/database';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

const template = (level: number) => ({
  id: `tmpl-${level}`,
  category: 'resource',
  name: `${level}環法術位`,
  icon: '🔮',
  max_uses: 0,
  recovery_type: 'long_rest',
  spell_level: level,
});

const allTemplates = Array.from({ length: 9 }, (_, i) => template(i + 1));

describe('CombatItemService.syncSpellSlotResources', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('無既有資料時，只為 basic>0 的環位建立新項目', async () => {
    const { supabase } = await import('../../lib/supabase');
    const inserted: unknown[] = [];

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'default_combat_actions') {
        return {
          select: () => ({
            not: () => Promise.resolve({ data: allTemplates, error: null }),
          }),
        } as any;
      }
      if (table === 'character_combat_actions') {
        return {
          select: () => ({
            eq: () => ({
              in: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
          insert: (rows: unknown[]) => {
            inserted.push(...rows);
            return Promise.resolve({ error: null });
          },
        } as any;
      }
      return {} as any;
    });

    // 5 級法師：basics = [4,3,2,0,0,0,0,0,0]
    await CombatItemService.syncSpellSlotResources('char-1', 5);

    expect(inserted).toHaveLength(3);
    expect(inserted.map((r: any) => r.default_item_id)).toEqual(['tmpl-1', 'tmpl-2', 'tmpl-3']);
    const level1 = inserted.find((r: any) => r.default_item_id === 'tmpl-1') as any;
    expect(level1.max_uses).toBe(4);
    expect(level1.max_uses_basic).toBe(4);
    expect(level1.max_uses_bonus).toBe(0);
    expect(level1.current_uses).toBe(4);
    expect(level1.recovery_type).toBe('long_rest');
    expect(level1.category).toBe('resource');
  });

  it('升級後 basic 增加時，應保留使用者手動加值並同步增加 current', async () => {
    const { supabase } = await import('../../lib/supabase');
    const updates: Array<{ id: string; payload: any }> = [];

    // 既有：3環法術位 basic=2（5級時的值），使用者手動改成 3（bonus=1），目前用剩 current=1
    const existingLevel3 = {
      id: 'row-3',
      character_id: 'char-1',
      category: 'resource',
      name: '3環法術位',
      icon: '🔮',
      max_uses: 3,
      current_uses: 1,
      max_uses_basic: 2,
      max_uses_bonus: 1,
      recovery_type: 'long_rest',
      is_default: false,
      is_custom: false,
      default_item_id: 'tmpl-3',
    };

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'default_combat_actions') {
        return {
          select: () => ({
            not: () => Promise.resolve({ data: allTemplates, error: null }),
          }),
        } as any;
      }
      if (table === 'character_combat_actions') {
        return {
          select: () => ({
            eq: () => ({
              in: () => Promise.resolve({ data: [existingLevel3], error: null }),
            }),
          }),
          insert: () => Promise.resolve({ error: null }),
          update: (payload: any) => ({
            eq: (_col: string, id: string) => {
              updates.push({ id, payload });
              return Promise.resolve({ error: null });
            },
          }),
        } as any;
      }
      return {} as any;
    });

    // 升到 6 級：basics[2] (3環) 從 2 變 3
    await CombatItemService.syncSpellSlotResources('char-1', 6);

    const level3Update = updates.find(u => u.id === 'row-3');
    expect(level3Update).toBeDefined();
    expect(level3Update?.payload.max_uses_basic).toBe(3);
    expect(level3Update?.payload.max_uses).toBe(4); // 新 basic 3 + 保留的 bonus 1
    expect(level3Update?.payload.current_uses).toBe(2); // 原本剩 1，隨 basic +1 一起 +1
  });

  it('basic 沒有變動時不應寫入資料庫', async () => {
    const { supabase } = await import('../../lib/supabase');
    const updates: unknown[] = [];

    const existingLevel1 = {
      id: 'row-1',
      character_id: 'char-1',
      category: 'resource',
      name: '1環法術位',
      icon: '🔮',
      max_uses: 4,
      current_uses: 4,
      max_uses_basic: 4,
      max_uses_bonus: 0,
      recovery_type: 'long_rest',
      is_default: false,
      is_custom: false,
      default_item_id: 'tmpl-1',
    };

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'default_combat_actions') {
        return {
          select: () => ({
            not: () => Promise.resolve({ data: allTemplates, error: null }),
          }),
        } as any;
      }
      if (table === 'character_combat_actions') {
        return {
          select: () => ({
            eq: () => ({
              in: () => Promise.resolve({ data: [existingLevel1], error: null }),
            }),
          }),
          insert: () => Promise.resolve({ error: null }),
          update: (payload: unknown) => ({
            eq: () => {
              updates.push(payload);
              return Promise.resolve({ error: null });
            },
          }),
        } as any;
      }
      return {} as any;
    });

    // 5 級法師，1環 basic 仍然是 4，不應觸發更新
    await CombatItemService.syncSpellSlotResources('char-1', 5);

    expect(updates).toHaveLength(0);
  });

  it('範本圖示更新過時，即使 basic 沒變也應修正既有列的圖示', async () => {
    const { supabase } = await import('../../lib/supabase');
    const updates: Array<{ id: string; payload: any }> = [];

    // 既有列的圖示是舊版 🔮，範本已改成 1️⃣
    const existingWithOldIcon = {
      id: 'row-1',
      character_id: 'char-1',
      category: 'resource',
      name: '1環法術位',
      icon: '🔮',
      max_uses: 4,
      current_uses: 4,
      max_uses_basic: 4,
      max_uses_bonus: 0,
      recovery_type: 'long_rest',
      is_default: false,
      is_custom: false,
      default_item_id: 'tmpl-1',
    };
    const templatesWithNewIcon = allTemplates.map(t =>
      t.id === 'tmpl-1' ? { ...t, icon: '1️⃣' } : t
    );

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'default_combat_actions') {
        return {
          select: () => ({
            not: () => Promise.resolve({ data: templatesWithNewIcon, error: null }),
          }),
        } as any;
      }
      if (table === 'character_combat_actions') {
        return {
          select: () => ({
            eq: () => ({
              in: () => Promise.resolve({ data: [existingWithOldIcon], error: null }),
            }),
          }),
          insert: () => Promise.resolve({ error: null }),
          update: (payload: any) => ({
            eq: (_col: string, id: string) => {
              updates.push({ id, payload });
              return Promise.resolve({ error: null });
            },
          }),
        } as any;
      }
      return {} as any;
    });

    await CombatItemService.syncSpellSlotResources('char-1', 5);

    const iconUpdate = updates.find(u => u.id === 'row-1');
    expect(iconUpdate).toBeDefined();
    expect(iconUpdate?.payload.icon).toBe('1️⃣');
    expect(iconUpdate?.payload.max_uses_basic).toBe(4); // basic 本身沒變
  });
});
