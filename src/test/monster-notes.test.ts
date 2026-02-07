/**
 * 怪物備註欄位測試
 * 測試 updateMonsterNotes（單筆更新、僅依 id）與 addMonsters 插入含 notes
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CombatService } from '../../services/combatService';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('怪物備註 - updateMonsterNotes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Happy path：傳入備註文字應呼叫 update(notes).eq(id) 且回傳 success: true', async () => {
    const { supabase } = await import('../../lib/supabase');
    const mockEq = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

    vi.mocked(supabase.from).mockReturnValue({
      update: mockUpdate,
    } as any);

    const monsterId = 'monster-uuid-1';
    const notes = '某備註';

    const result = await CombatService.updateMonsterNotes(monsterId, notes);

    expect(result.success).toBe(true);
    expect(supabase.from).toHaveBeenCalledWith('combat_monsters');
    expect(mockUpdate).toHaveBeenCalledWith({ notes });
    expect(mockEq).toHaveBeenCalledWith('id', monsterId);
  });

  it('清空備註：傳入 null 應 update(notes: null) 且回傳 success: true', async () => {
    const { supabase } = await import('../../lib/supabase');
    const mockEq = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

    vi.mocked(supabase.from).mockReturnValue({
      update: mockUpdate,
    } as any);

    const monsterId = 'monster-uuid-2';

    const result = await CombatService.updateMonsterNotes(monsterId, null);

    expect(result.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith({ notes: null });
    expect(mockEq).toHaveBeenCalledWith('id', monsterId);
  });

  it('錯誤情境：Supabase 回傳 error 時應回傳 success: false 與 error', async () => {
    const { supabase } = await import('../../lib/supabase');
    const mockEq = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'DB error' },
    });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

    vi.mocked(supabase.from).mockReturnValue({
      update: mockUpdate,
    } as any);

    const result = await CombatService.updateMonsterNotes('id-1', '備註');

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('怪物備註 - addMonsters 插入含 notes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('插入的每筆怪物應包含 notes: null', async () => {
    const { supabase } = await import('../../lib/supabase');

    let capturedInsert: unknown = null;
    let fromCallCount = 0;

    vi.mocked(supabase.from).mockImplementation(() => {
      fromCallCount++;
      if (fromCallCount === 1) {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                limit: () => ({
                  maybeSingle: () => Promise.resolve({ data: null, error: null }),
                }),
              }),
            }),
          }),
        } as any;
      }
      if (fromCallCount === 2) {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => Promise.resolve({ data: [], error: null }),
              }),
            }),
          }),
        } as any;
      }
      if (fromCallCount === 3) {
        return {
          insert: (rows: unknown) => {
            capturedInsert = rows;
            return { select: () => Promise.resolve({ data: [], error: null }) };
          },
        } as any;
      }
      return {} as any;
    });

    await CombatService.addMonsters('ABC', '地精', 2, null, null, {});

    const inserted = capturedInsert as Array<Record<string, unknown>>;
    expect(Array.isArray(inserted)).toBe(true);
    expect(inserted.length).toBe(2);
    inserted.forEach((row) => {
      expect(row).toHaveProperty('notes', null);
    });
  });
});
