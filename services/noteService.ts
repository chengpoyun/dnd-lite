/**
 * noteService - 角色筆記 CRUD
 * 筆記以篇為單位，標題預設為當天日期，內容純文字（可擴充 Markdown）
 */

import { supabase } from '../lib/supabase';

export interface CharacterNote {
  id: string;
  character_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface CreateNoteData {
  title?: string;
  content?: string;
}

/** 預設標題：當天日期 YYYY/M/D */
export function getDefaultNoteTitle(): string {
  const now = new Date();
  return `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`;
}

export async function getNotes(characterId: string): Promise<{
  success: boolean;
  notes?: CharacterNote[];
  error?: string;
}> {
  try {
    if (!characterId) return { success: false, error: '角色 ID 無效' };
    const { data, error } = await supabase
      .from('character_notes')
      .select('*')
      .eq('character_id', characterId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('取得筆記失敗:', error);
      return { success: false, error: error.message };
    }
    return { success: true, notes: data ?? [] };
  } catch (e) {
    console.error('取得筆記異常:', e);
    return { success: false, error: '取得筆記時發生錯誤' };
  }
}

export async function createNote(
  characterId: string,
  data: CreateNoteData = {}
): Promise<{ success: boolean; note?: CharacterNote; error?: string }> {
  try {
    if (!characterId) return { success: false, error: '角色 ID 無效' };
    const title = data.title ?? getDefaultNoteTitle();
    const content = data.content ?? '';
    const { data: row, error } = await supabase
      .from('character_notes')
      .insert({ character_id: characterId, title, content })
      .select()
      .single();

    if (error) {
      console.error('新增筆記失敗:', error);
      return { success: false, error: error.message };
    }
    return { success: true, note: row };
  } catch (e) {
    console.error('新增筆記異常:', e);
    return { success: false, error: '新增筆記時發生錯誤' };
  }
}

export async function updateNote(
  noteId: string,
  updates: { title?: string; content?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!noteId) return { success: false, error: '筆記 ID 無效' };
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.content !== undefined) payload.content = updates.content;

    const { error } = await supabase
      .from('character_notes')
      .update(payload)
      .eq('id', noteId);

    if (error) {
      console.error('更新筆記失敗:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (e) {
    console.error('更新筆記異常:', e);
    return { success: false, error: '更新筆記時發生錯誤' };
  }
}

export async function deleteNote(noteId: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!noteId) return { success: false, error: '筆記 ID 無效' };
    const { error } = await supabase.from('character_notes').delete().eq('id', noteId);
    if (error) {
      console.error('刪除筆記失敗:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (e) {
    console.error('刪除筆記異常:', e);
    return { success: false, error: '刪除筆記時發生錯誤' };
  }
}
