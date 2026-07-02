/**
 * MulticlassService.replaceCharacterClasses
 * 修正架構健檢發現的 bug：CharacterSheet.tsx 儲存多職業時，原本是「先刪除全部
 * character_classes、再逐筆 insert 且不檢查錯誤」，中途失敗會讓角色卡在職業被
 * 刪光、只補回部分的半殘狀態。改為集中到這個方法：刪除/寫入都檢查錯誤，
 * 失敗時回傳 false，呼叫端據此不更新本地狀態。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MulticlassService } from '../../services/multiclassService';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('MulticlassService.replaceCharacterClasses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const classes = [
    { name: '戰士', level: 5, isPrimary: true, subclassName: '冠軍' },
    { name: '法師', level: 3, isPrimary: false },
  ];

  it('刪除與批次寫入皆成功時回傳 true，且 insert 只呼叫一次（批次寫入而非逐筆）', async () => {
    const { supabase } = await import('../../lib/supabase');
    const deleteEq = vi.fn().mockResolvedValue({ error: null });
    const insertCalls: unknown[] = [];

    vi.mocked(supabase.from).mockImplementation(() => ({
      delete: () => ({ eq: deleteEq }),
      insert: (rows: unknown) => {
        insertCalls.push(rows);
        return Promise.resolve({ error: null });
      },
    }) as any);

    const result = await MulticlassService.replaceCharacterClasses('char-1', classes);

    expect(result).toBe(true);
    expect(deleteEq).toHaveBeenCalledWith('character_id', 'char-1');
    expect(insertCalls).toHaveLength(1);
    const insertedRows = insertCalls[0] as any[];
    expect(insertedRows).toHaveLength(2);
    expect(insertedRows[0]).toMatchObject({
      character_id: 'char-1',
      class_name: '戰士',
      class_level: 5,
      is_primary: true,
      subclass_name: '冠軍',
    });
    expect(insertedRows[1]).toMatchObject({
      character_id: 'char-1',
      class_name: '法師',
      class_level: 3,
      is_primary: false,
      subclass_name: null,
    });
  });

  it('刪除失敗時回傳 false，且不會嘗試寫入新資料', async () => {
    const { supabase } = await import('../../lib/supabase');
    const insert = vi.fn();

    vi.mocked(supabase.from).mockImplementation(() => ({
      delete: () => ({ eq: vi.fn().mockResolvedValue({ error: { message: 'delete failed' } }) }),
      insert,
    }) as any);

    const result = await MulticlassService.replaceCharacterClasses('char-1', classes);

    expect(result).toBe(false);
    expect(insert).not.toHaveBeenCalled();
  });

  it('寫入失敗時回傳 false（此時角色的舊職業資料已被刪除，呼叫端不應更新本地狀態誤導使用者）', async () => {
    const { supabase } = await import('../../lib/supabase');

    vi.mocked(supabase.from).mockImplementation(() => ({
      delete: () => ({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      insert: () => Promise.resolve({ error: { message: 'insert failed' } }),
    }) as any);

    const result = await MulticlassService.replaceCharacterClasses('char-1', classes);

    expect(result).toBe(false);
  });
});
