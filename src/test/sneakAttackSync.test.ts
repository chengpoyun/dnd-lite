/**
 * 偷襲傷害資源同步測試：CombatItemService.syncSneakAttackResource
 * 驗證依遊蕩者等級查表，建立/更新「偷襲傷害 XdY」職業資源（每回合限一次，骰數寫入名稱）。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CombatItemService } from '../../services/database';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

const template = {
  id: 'tmpl-sneak',
  category: 'resource',
  name: '偷襲傷害',
  icon: '🔪',
  max_uses: 1,
  recovery_type: 'turn',
  spell_level: null,
};

describe('CombatItemService.syncSneakAttackResource', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('無既有資料且遊蕩者等級為0時，不建立項目', async () => {
    const { supabase } = await import('../../lib/supabase');
    const inserted: unknown[] = [];

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'default_combat_actions') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({ maybeSingle: () => Promise.resolve({ data: template, error: null }) }),
            }),
          }),
        } as any;
      }
      if (table === 'character_combat_actions') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
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

    await CombatItemService.syncSneakAttackResource('char-1', 0);

    expect(inserted).toHaveLength(0);
  });

  it('無既有資料且遊蕩者等級為5時，建立骰數3d6的新項目', async () => {
    const { supabase } = await import('../../lib/supabase');
    const inserted: unknown[] = [];

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'default_combat_actions') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({ maybeSingle: () => Promise.resolve({ data: template, error: null }) }),
            }),
          }),
        } as any;
      }
      if (table === 'character_combat_actions') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
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

    // 5級遊蕩者：偷襲傷害 3d6
    await CombatItemService.syncSneakAttackResource('char-1', 5);

    expect(inserted).toHaveLength(1);
    const row = inserted[0] as any;
    expect(row.name).toBe('偷襲傷害 3d6');
    expect(row.max_uses).toBe(1);
    expect(row.current_uses).toBe(1);
    expect(row.recovery_type).toBe('turn');
    expect(row.category).toBe('resource');
    expect(row.default_item_id).toBe('tmpl-sneak');
  });

  it('升級後骰數變動時，應更新既有項目名稱', async () => {
    const { supabase } = await import('../../lib/supabase');
    const updates: Array<{ id: string; payload: any }> = [];

    const existing = {
      id: 'row-sneak',
      character_id: 'char-1',
      category: 'resource',
      name: '偷襲傷害 1d6',
      icon: '🔪',
      max_uses: 1,
      current_uses: 1,
      recovery_type: 'turn',
      is_default: false,
      is_custom: false,
      default_item_id: 'tmpl-sneak',
    };

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'default_combat_actions') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({ maybeSingle: () => Promise.resolve({ data: template, error: null }) }),
            }),
          }),
        } as any;
      }
      if (table === 'character_combat_actions') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({ maybeSingle: () => Promise.resolve({ data: existing, error: null }) }),
            }),
          }),
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

    // 升到 3 級：1d6 -> 2d6
    await CombatItemService.syncSneakAttackResource('char-1', 3);

    expect(updates).toHaveLength(1);
    expect(updates[0].id).toBe('row-sneak');
    expect(updates[0].payload.name).toBe('偷襲傷害 2d6');
  });

  it('骰數沒有變動時不應寫入資料庫', async () => {
    const { supabase } = await import('../../lib/supabase');
    const updates: unknown[] = [];

    const existing = {
      id: 'row-sneak',
      character_id: 'char-1',
      category: 'resource',
      name: '偷襲傷害 2d6',
      icon: '🔪',
      max_uses: 1,
      current_uses: 0,
      recovery_type: 'turn',
      is_default: false,
      is_custom: false,
      default_item_id: 'tmpl-sneak',
    };

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'default_combat_actions') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({ maybeSingle: () => Promise.resolve({ data: template, error: null }) }),
            }),
          }),
        } as any;
      }
      if (table === 'character_combat_actions') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({ maybeSingle: () => Promise.resolve({ data: existing, error: null }) }),
            }),
          }),
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

    // 4級遊蕩者，骰數仍是2d6，不應觸發更新
    await CombatItemService.syncSneakAttackResource('char-1', 4);

    expect(updates).toHaveLength(0);
  });
});
