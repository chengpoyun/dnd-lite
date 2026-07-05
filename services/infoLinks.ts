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

/** 帳號第一次使用、目前一筆連結都沒有時，自動補上的預設連結 */
const DEFAULT_INFO_LINK = {
  title: '異常狀態說明',
  url: 'https://5etools.vercel.app/conditionsdiseases.html',
};

async function insertDefaultInfoLink(
  userContext: InfoLinkUserContext
): Promise<{ success: boolean; link?: InfoLink; error?: string }> {
  const insertData = userContext.isAuthenticated && userContext.userId
    ? { user_id: userContext.userId, is_anonymous: false, ...DEFAULT_INFO_LINK }
    : { anonymous_id: userContext.anonymousId, is_anonymous: true, ...DEFAULT_INFO_LINK };

  const { data, error } = await supabase
    .from('info_links')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('建立預設資訊連結失敗:', error);
    return { success: false, error: error.message };
  }
  return { success: true, link: data };
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

    // 帳號目前沒有任何連結：自動補上預設值
    const seeded = await insertDefaultInfoLink(userContext);
    if (!seeded.success || !seeded.link) {
      return { success: true, links: [] };
    }
    return { success: true, links: [seeded.link] };
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
