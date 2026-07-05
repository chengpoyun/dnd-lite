/**
 * infoDocuments 服務測試：僅登入帳號可讀（RLS 控管），前端不加額外過濾條件
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getInfoDocuments } from '../../services/infoDocuments';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('infoDocuments - getInfoDocuments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('回傳查詢到的文件清單（依 created_at 升冪）', async () => {
    const { supabase } = await import('../../lib/supabase');
    const docs = [
      { id: 'doc-1', title: '文件A', content: '<html>A</html>', owner_user_id: 'u1' },
      { id: 'doc-2', title: '文件B', content: '<html>B</html>', owner_user_id: 'u1' },
    ];
    let orderArgs: unknown = null;

    vi.mocked(supabase.from).mockReturnValue({
      select: () => ({
        order: (col: string, opts: unknown) => {
          orderArgs = { col, opts };
          return Promise.resolve({ data: docs, error: null });
        },
      }),
    } as any);

    const result = await getInfoDocuments();

    expect(result.success).toBe(true);
    expect(result.documents).toEqual(docs);
    expect(orderArgs).toEqual({ col: 'created_at', opts: { ascending: true } });
  });

  it('無資料（例如未登入被 RLS 擋下）時回傳空陣列', async () => {
    const { supabase } = await import('../../lib/supabase');
    vi.mocked(supabase.from).mockReturnValue({
      select: () => ({
        order: () => Promise.resolve({ data: [], error: null }),
      }),
    } as any);

    const result = await getInfoDocuments();

    expect(result.success).toBe(true);
    expect(result.documents).toEqual([]);
  });

  it('錯誤情境：Supabase 回傳 error 時應回傳 success: false', async () => {
    const { supabase } = await import('../../lib/supabase');
    vi.mocked(supabase.from).mockReturnValue({
      select: () => ({
        order: () => Promise.resolve({ data: null, error: { message: 'DB error' } }),
      }),
    } as any);

    const result = await getInfoDocuments();

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
