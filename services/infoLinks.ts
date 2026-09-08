/**
 * infoLinks - 「資訊」分頁的參考連結 CRUD
 * 帳號層級（同一登入/匿名身分下所有角色共用），比照 characters 表的雙軌設計。
 */

import { supabase } from '../lib/supabase';
import type { InfoLink } from '../lib/supabase';

export interface InfoLinkUserContext {
  isAuthenticated: boolean;
  userId?: string;
  anonymousId?: string;
}

/**
 * 全站共用的預設連結：帳號第一次使用、一筆連結都沒有時整組補上。
 * 只在「完全沒有連結」時補，所以使用者刪掉之後不會又被塞回來。
 * 既有帳號則以一次性 SQL 補資料（見 CHANGELOG 1.17.1），不在這裡做自動補齊。
 */
const DEFAULT_INFO_LINKS = [
  { title: '異常狀態說明', url: 'https://5etools.vercel.app/conditionsdiseases.html' },
  { title: 'TRPG 跑團工具入口網', url: 'https://woofname.github.io/Magelan/' },
];

async function insertDefaultInfoLinks(
  userContext: InfoLinkUserContext
): Promise<{ success: boolean; links?: InfoLink[]; error?: string }> {
  const scope = userContext.isAuthenticated && userContext.userId
    ? { user_id: userContext.userId, is_anonymous: false }
    : { anonymous_id: userContext.anonymousId, is_anonymous: true };

  const { data, error } = await supabase
    .from('info_links')
    .insert(DEFAULT_INFO_LINKS.map((link) => ({ ...scope, ...link })))
    .select();

  if (error) {
    console.error('建立預設資訊連結失敗:', error);
    return { success: false, error: error.message };
  }
  return { success: true, links: data ?? [] };
}

export async function getInfoLinks(
  userContext: InfoLinkUserContext
): Promise<{ success: boolean; links?: InfoLink[]; error?: string }> {
  try {
    const query = supabase.from('info_links').select('*');
    const scopedQuery = userContext.isAuthenticated && userContext.userId
      ? query.eq('user_id', userContext.userId)
      : query.eq('anonymous_id', userContext.anonymousId ?? '');
    const { data, error } = await scopedQuery.order('created_at', { ascending: true });

    if (error) {
      console.error('取得資訊連結失敗:', error);
      return { success: false, error: error.message };
    }

    if (data && data.length > 0) {
      return { success: true, links: data };
    }

    // 帳號目前沒有任何連結：整組補上預設連結
    const seeded = await insertDefaultInfoLinks(userContext);
    if (!seeded.success || !seeded.links) {
      return { success: true, links: [] };
    }
    return { success: true, links: seeded.links };
  } catch (e) {
    console.error('取得資訊連結異常:', e);
    return { success: false, error: '取得資訊連結時發生錯誤' };
  }
}

export async function createInfoLink(
  userContext: InfoLinkUserContext,
  data: { title: string; url: string }
): Promise<{ success: boolean; link?: InfoLink; error?: string }> {
  try {
    const insertData = userContext.isAuthenticated && userContext.userId
      ? { user_id: userContext.userId, is_anonymous: false, ...data }
      : { anonymous_id: userContext.anonymousId, is_anonymous: true, ...data };

    const { data: row, error } = await supabase
      .from('info_links')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('新增資訊連結失敗:', error);
      return { success: false, error: error.message };
    }
    return { success: true, link: row };
  } catch (e) {
    console.error('新增資訊連結異常:', e);
    return { success: false, error: '新增資訊連結時發生錯誤' };
  }
}

export async function updateInfoLink(
  linkId: string,
  updates: { title: string; url: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('info_links')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', linkId);

    if (error) {
      console.error('更新資訊連結失敗:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (e) {
    console.error('更新資訊連結異常:', e);
    return { success: false, error: '更新資訊連結時發生錯誤' };
  }
}

export async function deleteInfoLink(linkId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('info_links').delete().eq('id', linkId);
    if (error) {
      console.error('刪除資訊連結失敗:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (e) {
    console.error('刪除資訊連結異常:', e);
    return { success: false, error: '刪除資訊連結時發生錯誤' };
  }
}
