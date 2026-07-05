/**
 * infoDocuments - 「資訊」分頁的本機文件（完整 HTML 內容存於 DB，僅登入帳號可讀）
 * 唯讀：新增/管理授權由維運者直接操作 DB，前端不提供上傳/編輯功能。
 */

import { supabase } from '../lib/supabase';
import type { InfoDocument } from '../lib/supabase';

export async function getInfoDocuments(): Promise<{
  success: boolean;
  documents?: InfoDocument[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('info_documents')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('取得本機文件失敗:', error);
      return { success: false, error: error.message };
    }
    return { success: true, documents: data ?? [] };
  } catch (e) {
    console.error('取得本機文件異常:', e);
    return { success: false, error: '取得本機文件時發生錯誤' };
  }
}
