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

export type ItemCategory = '裝備' | '魔法物品' | '藥水' | '素材' | '雜項';

// 全域物品（global_items 表）
export interface GlobalItem {
  id: string;
  name: string;
  name_en?: string;
  description: string;
  category: ItemCategory;
  created_at: string;
  updated_at: string;
}

// 角色物品（character_items 表）
export interface CharacterItem {
  id: string;
  character_id: string;
  item_id: string;
  quantity: number;
  
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
}

export interface CreateGlobalItemData {
  name: string;
  name_en?: string;
  description?: string;
  category: ItemCategory;
}

export interface UpdateCharacterItemData {
  quantity?: number;
  name_override?: string | null;
  description_override?: string | null;
  category_override?: ItemCategory | null;
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
      .order('name', { ascending: true });

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
        category: data.category
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
  return {
    ...characterItem,
    displayName: characterItem.name_override ?? characterItem.item?.name ?? '',
    displayDescription: characterItem.description_override ?? characterItem.item?.description ?? '',
    displayCategory: (characterItem.category_override ?? characterItem.item?.category ?? '雜項') as ItemCategory
  };
}
