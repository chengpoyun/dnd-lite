/**
 * ItemService - 道具管理服務（重構版）
 * 
 * 架構：
 * - global_items: 全域物品庫（類似 spells）
 * - character_items: 角色物品關聯表（類似 character_spells），包含 override 欄位
 * 
 * 功能：
 * - 取得全域物品庫
 * - 取得角色物品列表（含 display values）
 * - 獲得物品（從全域庫添加到角色）
 * - 新增/更新/刪除物品
 * - Override 欄位支援（角色專屬客製化）
 * 
 * 資料隔離：
 * - 使用 RLS 政策確保用戶只能操作自己的角色物品
 */

import { supabase } from '../lib/supabase';

export type ItemCategory = '裝備' | '藥水' | '素材' | 'MH素材' | '雜項';

// 全域物品（global_items 表）
export interface GlobalItem {
  id: string;
  name: string;
  name_en?: string;
  description: string;
  category: ItemCategory;
  is_magic: boolean;
  created_at: string;
  updated_at: string;
}

// 角色物品（character_items 表）
// item_id 可為 null：純個人物品（未上傳至 global_items）
export interface CharacterItem {
  id: string;
  character_id: string;
  item_id: string | null;
  quantity: number;
  is_magic: boolean;
  is_magic_override?: boolean | null;
  
  // Override 欄位
  name_override?: string | null;
  description_override?: string | null;
  category_override?: ItemCategory | null;
  
  created_at: string;
  updated_at: string;
  
  // JOIN 的物品資料
  item?: GlobalItem;
}

// 帶有 display helper 的 CharacterItem 類型
export interface CharacterItemWithDetails extends CharacterItem {
  displayName: string;
  displayDescription: string;
  displayCategory: ItemCategory;
  displayIsMagic: boolean;
}

export interface CreateGlobalItemData {
  name: string;
  name_en?: string;
  description?: string;
  category: ItemCategory;
  is_magic: boolean;
}

// 上傳角色物品到全域物品庫時使用的資料（所有欄位必填）
export interface CreateGlobalItemDataForUpload {
  name: string;
  name_en: string;
  description: string;
  category: ItemCategory;
  is_magic: boolean;
}

export interface UpdateCharacterItemData {
  quantity?: number;
  name_override?: string | null;
  description_override?: string | null;
  category_override?: ItemCategory | null;
  is_magic?: boolean;
  is_magic_override?: boolean | null;
}

/** 新增個人物品（直接寫入 character_items，不經 global_items） */
export interface CreateCharacterItemData {
  name: string;
  category: ItemCategory;
  description?: string;
  quantity?: number;
  is_magic: boolean;
}

/**
 * 取得全域物品庫（所有 global_items）
 * 用於 LearnItemModal 讓用戶選擇要獲得的物品
 */
export async function getGlobalItems(): Promise<{
  success: boolean;
  items?: GlobalItem[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('global_items')
      .select('*')
      .order('name', { ascending: true })
      .limit(5000);

    if (error) {
      console.error('❌ 取得全域物品失敗:', error);
      return { success: false, error: error.message };
    }

    return { success: true, items: data || [] };
  } catch (error) {
    console.error('❌ 取得全域物品異常:', error);
    return { success: false, error: '取得全域物品時發生錯誤' };
  }
}

/** Escape % and _ for literal match in ilike; use * as alias of % (PostgREST) to avoid URL encoding */
function escapeIlikePattern(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/**
 * 依關鍵字搜尋全域物品（name / name_en / description ilike）
 * 用於 LearnItemModal 輸入時由後端過濾，避免前端載入不全或編碼問題
 */
export async function searchGlobalItems(query: string): Promise<{
  success: boolean;
  items?: GlobalItem[];
  error?: string;
}> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { success: true, items: [] };
  }
  try {
    const escaped = escapeIlikePattern(trimmed);
    const pattern = `*${escaped}*`;
    const { data, error } = await supabase
      .from('global_items')
      .select('*')
      .or(`name.ilike.${pattern},name_en.ilike.${pattern},description.ilike.${pattern}`)
      .order('name', { ascending: true })
      .limit(500);

    if (error) {
      console.error('❌ 搜尋全域物品失敗:', error);
      return { success: false, error: error.message };
    }

    return { success: true, items: data || [] };
  } catch (error) {
    console.error('❌ 搜尋全域物品異常:', error);
    return { success: false, error: '搜尋物品時發生錯誤' };
  }
}

/**
 * 將角色物品上傳到全域物品庫：
 * - 以 name_en（不分大小寫）檢查 global_items 是否已存在
 * - 若已存在：只更新該角色物品的 item_id 指向既有 global_item
 * - 若不存在：建立新的 global_item，再更新角色物品的 item_id
 */
export async function uploadCharacterItemToGlobal(
  characterItemId: string,
  data: CreateGlobalItemDataForUpload
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    if (!characterItemId) {
      return { success: false, error: '角色物品 ID 無效' };
    }

    const { name, name_en, description, category } = data;

    if (!name.trim() || !name_en.trim() || !description.trim() || !category) {
      return { success: false, error: '所有欄位皆為必填' };
    }
    if (typeof data.is_magic !== 'boolean') {
      return { success: false, error: '魔法物品欄位無效' };
    }

    // 1. 先嘗試以 name_en（不分大小寫）尋找既有 global_item
    const { data: existing, error: findError } = await (supabase
      .from('global_items')
      .select('*')
      .ilike('name_en', name_en)
      .maybeSingle());

    let targetGlobalItemId: string | null = null;

    if (existing && !findError) {
      // 已有同名（不分大小寫）的 global_item
      targetGlobalItemId = existing.id;
    } else {
      // 若錯誤碼不是「查無資料」，則視為真正錯誤
      const findStatus = (findError as { status?: number }).status;
      if (findError && findError.code !== 'PGRST116' && findStatus !== 406) {
        console.error('❌ 查詢全域物品失敗:', findError);
        return { success: false, error: '查詢全域物品失敗' };
      }

      // 2. 不存在時，建立新的 global_item
      const { data: inserted, error: insertError } = await supabase
        .from('global_items')
        .insert({
          name,
          name_en,
          description,
          category,
          is_magic: data.is_magic,
        })
        .select()
        .single();

      if (insertError || !inserted) {
        console.error('❌ 創建全域物品失敗:', insertError);
        return { success: false, error: insertError?.message || '創建全域物品失敗' };
      }

      targetGlobalItemId = inserted.id;
    }

    if (!targetGlobalItemId) {
      return { success: false, error: '無法取得全域物品 ID' };
    }

    // 3. 將角色物品關聯到這個 global_item
    const { error: updateError } = await supabase
      .from('character_items')
      .update({ item_id: targetGlobalItemId })
      .eq('id', characterItemId);

    if (updateError) {
      console.error('❌ 更新角色物品關聯失敗:', updateError);
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (error) {
    console.error('❌ 上傳物品到全域庫異常:', error);
    return { success: false, error: '上傳物品到全域庫時發生錯誤' };
  }
}

/**
 * 取得角色所有物品（包含 override 欄位和全域物品資料）
 */
export async function getCharacterItems(characterId: string): Promise<{
  success: boolean;
  items?: CharacterItem[];
  error?: string;
}> {
  try {
    if (!characterId) {
      return { success: false, error: '角色 ID 無效' };
    }

    const { data, error } = await supabase
      .from('character_items')
      .select(`
        *,
        item:global_items(*)
      `)
      .eq('character_id', characterId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ 取得角色物品失敗:', error);
      return { success: false, error: error.message };
    }

    // 處理 JOIN 返回的數據結構
    const items = data?.map(row => ({
      ...row,
      item: Array.isArray(row.item) && row.item.length > 0 
        ? row.item[0] 
        : (typeof row.item === 'object' ? row.item : undefined)
    })) || [];

    return { success: true, items };
  } catch (error) {
    console.error('❌ 取得角色物品異常:', error);
    return { success: false, error: '取得角色物品時發生錯誤' };
  }
}

/**
 * 獲得物品（從全域庫添加到角色）
 */
export async function learnItem(characterId: string, itemId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    if (!characterId || !itemId) {
      return { success: false, error: '角色 ID 或物品 ID 無效' };
    }

    const { error } = await supabase
      .from('character_items')
      .insert({
        character_id: characterId,
        item_id: itemId,
        quantity: 1
      });

    if (error) {
      // 檢查是否是重複獲得
      if (error.code === '23505') {
        return { success: false, error: '已經擁有此物品' };
      }
      console.error('❌ 獲得物品失敗:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('❌ 獲得物品異常:', error);
    return { success: false, error: '獲得物品時發生錯誤' };
  }
}

/**
 * 新增個人物品（直接寫入 character_items，不建立 global_items）
 * 必填：name、category；選填：description、quantity（預設 1）
 */
export async function createCharacterItem(
  characterId: string,
  data: CreateCharacterItemData
): Promise<{
  success: boolean;
  item?: CharacterItem;
  error?: string;
}> {
  try {
    if (!characterId) {
      return { success: false, error: '角色 ID 無效' };
    }
    if (!data.name?.trim() || !data.category) {
      return { success: false, error: '名稱和類別為必填' };
    }

    const { data: row, error } = await supabase
      .from('character_items')
      .insert({
        character_id: characterId,
        item_id: null,
        quantity: data.quantity ?? 1,
        is_magic: data.is_magic ?? false,
        name_override: data.name.trim(),
        description_override: data.description?.trim() ?? '',
        category_override: data.category,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ 新增個人物品失敗:', error);
      return { success: false, error: error.message };
    }
    return { success: true, item: row };
  } catch (error) {
    console.error('❌ 新增個人物品異常:', error);
    return { success: false, error: '新增個人物品時發生錯誤' };
  }
}

/**
 * 創建全域物品（添加到 global_items）
 */
export async function createGlobalItem(data: CreateGlobalItemData): Promise<{
  success: boolean;
  item?: GlobalItem;
  error?: string;
}> {
  try {
    if (!data.name || !data.category) {
      return { success: false, error: '名稱和類別為必填欄位' };
    }

    const { data: item, error } = await supabase
      .from('global_items')
      .insert({
        name: data.name,
        name_en: data.name_en,
        description: data.description || '',
        category: data.category,
        is_magic: data.is_magic ?? false,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ 創建全域物品失敗:', error);
      return { success: false, error: error.message };
    }

    return { success: true, item };
  } catch (error) {
    console.error('❌ 創建全域物品異常:', error);
    return { success: false, error: '創建物品時發生錯誤' };
  }
}

/**
 * 更新角色物品（支援數量和 override 欄位）
 */
export async function updateCharacterItem(
  characterItemId: string,
  updates: UpdateCharacterItemData
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    if (!characterItemId) {
      return { success: false, error: '物品 ID 無效' };
    }

    const { error } = await supabase
      .from('character_items')
      .update(updates)
      .eq('id', characterItemId);

    if (error) {
      console.error('❌ 更新角色物品失敗:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('❌ 更新角色物品異常:', error);
    return { success: false, error: '更新物品時發生錯誤' };
  }
}

/**
 * 刪除角色物品
 */
export async function deleteCharacterItem(characterItemId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    if (!characterItemId) {
      return { success: false, error: '物品 ID 無效' };
    }

    const { error } = await supabase
      .from('character_items')
      .delete()
      .eq('id', characterItemId);

    if (error) {
      console.error('❌ 刪除角色物品失敗:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('❌ 刪除角色物品異常:', error);
    return { success: false, error: '刪除物品時發生錯誤' };
  }
}

/**
 * 獲取物品的顯示值（優先使用 override 值，否則使用原始值）
 */
export function getDisplayValues(characterItem: CharacterItem): CharacterItemWithDetails {
  const displayIsMagic = characterItem.item_id
    ? (characterItem.is_magic_override ?? characterItem.item?.is_magic ?? false)
    : !!characterItem.is_magic;

  return {
    ...characterItem,
    displayName: characterItem.name_override ?? characterItem.item?.name ?? '',
    displayDescription: characterItem.description_override ?? characterItem.item?.description ?? '',
    displayCategory: (characterItem.category_override ?? characterItem.item?.category ?? '雜項') as ItemCategory,
    displayIsMagic
  };
}
