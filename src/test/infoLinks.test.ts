/**
 * infoLinks 服務測試：帳號層級的資訊連結 CRUD（含空清單自動補預設值）
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getInfoLinks,
  createInfoLink,
  updateInfoLink,
  deleteInfoLink,
} from '../../services/infoLinks';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('infoLinks - getInfoLinks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('已有連結時直接回傳，不會補預設值', async () => {
    const { supabase } = await import('../../lib/supabase');
    const existing = [{ id: 'link-1', title: '法術查詢', url: 'https://example.com' }];

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'info_links') {
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: existing, error: null }),
            }),
          }),
        } as any;
      }
      return {} as any;
    });

    const result = await getInfoLinks({ isAuthenticated: false, anonymousId: 'anon_1' });

    expect(result.success).toBe(true);
    expect(result.links).toEqual(existing);
  });

  it('匿名帳號清單為空時，自動補上預設的異常狀態說明連結', async () => {
    const { supabase } = await import('../../lib/supabase');
    let insertedRow: any = null;

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'info_links') {
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
          insert: (row: any) => {
            insertedRow = row;
            return {
              select: () => ({
                single: () => Promise.resolve({ data: { id: 'seeded-1', ...row }, error: null }),
              }),
            };
          },
        } as any;
      }
      return {} as any;
    });

    const result = await getInfoLinks({ isAuthenticated: false, anonymousId: 'anon_1' });

    expect(result.success).toBe(true);
    expect(result.links).toHaveLength(1);
    expect(result.links?.[0].title).toBe('異常狀態說明');
    expect(insertedRow).toMatchObject({
      anonymous_id: 'anon_1',
      is_anonymous: true,
      title: '異常狀態說明',
      url: 'https://5etools.vercel.app/conditionsdiseases.html',
    });
  });

  it('登入帳號用 user_id 查詢與補預設值，不使用 anonymous_id', async () => {
    const { supabase } = await import('../../lib/supabase');
    let eqCalledWith: [string, string] | null = null;
    let insertedRow: any = null;

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'info_links') {
        return {
          select: () => ({
            eq: (col: string, val: string) => {
              eqCalledWith = [col, val];
              return { order: () => Promise.resolve({ data: [], error: null }) };
            },
          }),
          insert: (row: any) => {
            insertedRow = row;
            return {
              select: () => ({
                single: () => Promise.resolve({ data: { id: 'seeded-2', ...row }, error: null }),
              }),
            };
          },
        } as any;
      }
      return {} as any;
    });

    await getInfoLinks({ isAuthenticated: true, userId: 'user-1' });

    expect(eqCalledWith).toEqual(['user_id', 'user-1']);
    expect(insertedRow).toMatchObject({ user_id: 'user-1', is_anonymous: false });
  });
});

describe('infoLinks - createInfoLink / updateInfoLink / deleteInfoLink', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createInfoLink 依匿名/登入身分寫入對應欄位', async () => {
    const { supabase } = await import('../../lib/supabase');
    let insertedRow: any = null;

    vi.mocked(supabase.from).mockReturnValue({
      insert: (row: any) => {
        insertedRow = row;
        return {
          select: () => ({
            single: () => Promise.resolve({ data: { id: 'new-1', ...row }, error: null }),
          }),
        };
      },
    } as any);

    const result = await createInfoLink(
      { isAuthenticated: false, anonymousId: 'anon_2' },
      { title: '法術查詢', url: 'https://example.com/spells' }
    );

    expect(result.success).toBe(true);
    expect(insertedRow).toMatchObject({
      anonymous_id: 'anon_2',
      is_anonymous: true,
      title: '法術查詢',
      url: 'https://example.com/spells',
    });
  });

  it('updateInfoLink 依 id 更新標題與網址', async () => {
    const { supabase } = await import('../../lib/supabase');
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    vi.mocked(supabase.from).mockReturnValue({ update: mockUpdate } as any);

    const result = await updateInfoLink('link-1', { title: '新標題', url: 'https://new.example.com' });

    expect(result.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ title: '新標題', url: 'https://new.example.com' })
    );
    expect(mockEq).toHaveBeenCalledWith('id', 'link-1');
  });

  it('deleteInfoLink 依 id 刪除', async () => {
    const { supabase } = await import('../../lib/supabase');
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(supabase.from).mockReturnValue({ delete: () => ({ eq: mockEq }) } as any);

    const result = await deleteInfoLink('link-1');

    expect(result.success).toBe(true);
    expect(mockEq).toHaveBeenCalledWith('id', 'link-1');
  });

  it('錯誤情境：Supabase 回傳 error 時應回傳 success: false', async () => {
    const { supabase } = await import('../../lib/supabase');
    vi.mocked(supabase.from).mockReturnValue({
      update: () => ({ eq: () => Promise.resolve({ error: { message: 'DB error' } }) }),
    } as any);

    const result = await updateInfoLink('link-1', { title: 'x', url: 'https://x.com' });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
