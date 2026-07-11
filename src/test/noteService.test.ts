import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Mock } from 'vitest';
import { supabase } from '../../lib/supabase';
import { getDefaultNoteTitle, getNotes, createNote, updateNote, deleteNote } from '../../services/noteService';

function createChainable(finalResult: { data?: any; error: any }) {
  const builder: any = {
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve(finalResult)),
    then: (resolve: any) => Promise.resolve(finalResult).then(resolve),
  };
  return builder;
}

describe('getDefaultNoteTitle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('格式為 YYYY/M/D（月、日不補零）', () => {
    vi.setSystemTime(new Date(2026, 0, 5)); // 2026/1/5
    expect(getDefaultNoteTitle()).toBe('2026/1/5');
  });

  it('雙位數月份/日期時不會多出前導 0', () => {
    vi.setSystemTime(new Date(2026, 10, 23)); // 2026/11/23
    expect(getDefaultNoteTitle()).toBe('2026/11/23');
  });
});

describe('getNotes', () => {
  const mockedSupabase = supabase as unknown as { from: Mock };
  beforeEach(() => vi.clearAllMocks());

  it('characterId 為空時直接回傳失敗，不查詢 DB', async () => {
    const result = await getNotes('');
    expect(result).toEqual({ success: false, error: '角色 ID 無效' });
    expect(mockedSupabase.from).not.toHaveBeenCalled();
  });

  it('查詢成功時回傳依 updated_at 排序的筆記列表', async () => {
    const notes = [{ id: '1', character_id: 'c1', title: 'a', content: '', created_at: '', updated_at: '' }];
    const builder = createChainable({ data: notes, error: null });
    mockedSupabase.from.mockReturnValue(builder);

    const result = await getNotes('c1');

    expect(result).toEqual({ success: true, notes });
    expect(builder.eq).toHaveBeenCalledWith('character_id', 'c1');
    expect(builder.order).toHaveBeenCalledWith('updated_at', { ascending: false });
  });

  it('查詢失敗時回傳錯誤訊息', async () => {
    mockedSupabase.from.mockReturnValue(createChainable({ data: null, error: { message: 'db fail' } }));

    const result = await getNotes('c1');

    expect(result).toEqual({ success: false, error: 'db fail' });
  });
});

describe('createNote', () => {
  const mockedSupabase = supabase as unknown as { from: Mock };
  beforeEach(() => vi.clearAllMocks());

  it('characterId 為空時直接回傳失敗', async () => {
    const result = await createNote('');
    expect(result).toEqual({ success: false, error: '角色 ID 無效' });
  });

  it('未傳入 title/content 時，使用預設日期標題與空字串內容', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 11)); // 2026/7/11
    const builder = createChainable({ data: { id: 'n1' }, error: null });
    mockedSupabase.from.mockReturnValue(builder);

    await createNote('c1');

    expect(builder.insert).toHaveBeenCalledWith({ character_id: 'c1', title: '2026/7/11', content: '' });
    vi.useRealTimers();
  });

  it('傳入的 title/content 會直接使用，不套用預設值', async () => {
    const builder = createChainable({ data: { id: 'n1' }, error: null });
    mockedSupabase.from.mockReturnValue(builder);

    await createNote('c1', { title: '我的標題', content: '內容' });

    expect(builder.insert).toHaveBeenCalledWith({ character_id: 'c1', title: '我的標題', content: '內容' });
  });

  it('新增失敗時回傳錯誤訊息', async () => {
    mockedSupabase.from.mockReturnValue(createChainable({ data: null, error: { message: 'insert fail' } }));

    const result = await createNote('c1');

    expect(result).toEqual({ success: false, error: 'insert fail' });
  });
});

describe('updateNote', () => {
  const mockedSupabase = supabase as unknown as { from: Mock };
  beforeEach(() => vi.clearAllMocks());

  it('noteId 為空時直接回傳失敗', async () => {
    const result = await updateNote('', { title: 'x' });
    expect(result).toEqual({ success: false, error: '筆記 ID 無效' });
  });

  it('只傳 title 時，payload 不應包含 content 欄位', async () => {
    const builder = createChainable({ data: null, error: null });
    mockedSupabase.from.mockReturnValue(builder);

    await updateNote('n1', { title: '新標題' });

    const payload = builder.update.mock.calls[0][0];
    expect(payload.title).toBe('新標題');
    expect('content' in payload).toBe(false);
  });

  it('只傳 content 時，payload 不應包含 title 欄位', async () => {
    const builder = createChainable({ data: null, error: null });
    mockedSupabase.from.mockReturnValue(builder);

    await updateNote('n1', { content: '新內容' });

    const payload = builder.update.mock.calls[0][0];
    expect(payload.content).toBe('新內容');
    expect('title' in payload).toBe(false);
  });

  it('更新失敗時回傳錯誤訊息', async () => {
    mockedSupabase.from.mockReturnValue(createChainable({ data: null, error: { message: 'update fail' } }));

    const result = await updateNote('n1', { title: 'x' });

    expect(result).toEqual({ success: false, error: 'update fail' });
  });
});

describe('deleteNote', () => {
  const mockedSupabase = supabase as unknown as { from: Mock };
  beforeEach(() => vi.clearAllMocks());

  it('noteId 為空時直接回傳失敗', async () => {
    const result = await deleteNote('');
    expect(result).toEqual({ success: false, error: '筆記 ID 無效' });
  });

  it('刪除成功時回傳 success: true', async () => {
    const builder = createChainable({ data: null, error: null });
    mockedSupabase.from.mockReturnValue(builder);

    const result = await deleteNote('n1');

    expect(result).toEqual({ success: true });
    expect(builder.eq).toHaveBeenCalledWith('id', 'n1');
  });

  it('刪除失敗時回傳錯誤訊息', async () => {
    mockedSupabase.from.mockReturnValue(createChainable({ data: null, error: { message: 'delete fail' } }));

    const result = await deleteNote('n1');

    expect(result).toEqual({ success: false, error: 'delete fail' });
  });
});
