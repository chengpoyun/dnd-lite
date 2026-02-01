/**
 * ItemService - 道具管理服務
 * 
 * 功能：
 * - 取得用戶道具列表
 * - 依類別篩選道具
 * - 新增/更新/刪除道具
 * 
 * 資料隔離：
 * - 使用 RLS 政策確保用戶只能操作自己的道具
 * - 支援認證用戶和匿名用戶
 */

import { supabase } from '../lib/supabase';
import type { UserContext } from './auth';

export type ItemCategory = '裝備' | '魔法物品' | '藥水' | '素材' | '雜項';

export interface Item {
  id: string;
  user_id?: string;
  anonymous_id?: string;
  name: string;
  description: string;
  quantity: number;
  category: ItemCategory;
  created_at: string;
  updated_at: string;
}

export interface CreateItemData {
  name: string;
  description?: string;
  quantity?: number;
  category: ItemCategory;
}

export interface UpdateItemData {
  name?: string;
  description?: string;
  quantity?: number;
  category?: ItemCategory;
}

/**
 * 取得用戶所有道具
 */
export async function getUserItems(userContext: UserContext): Promise<{
  success: boolean;
  items?: Item[];
  error?: string;
}> {
  try {
    let query = supabase
      .from('items')
      .select('id, user_id, anonymous_id, name, description, quantity, category, created_at, updated_at')
      .order('created_at', { ascending: false });

    // 根據用戶類型篩選
    if (userContext.isAuthenticated && userContext.userId) {
      query = query.eq('user_id', userContext.userId);
    } else if (userContext.anonymousId) {
      query = query.eq('anonymous_id', userContext.anonymousId);
    } else {
      return { success: false, error: '無效的用戶身份' };
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ 取得道具失敗:', error);
      return { success: false, error: error.message };
    }

    return { success: true, items: data || [] };
  } catch (error) {
    console.error('❌ 取得道具異常:', error);
    return { success: false, error: '取得道具時發生錯誤' };
  }
}

/**
 * 依類別篩選道具
 */
export async function getItemsByCategory(
  userContext: UserContext,
  category: ItemCategory
): Promise<{
  success: boolean;
  items?: Item[];
  error?: string;
}> {
  try {
    let query = supabase
      .from('items')
      .select('id, user_id, anonymous_id, name, description, quantity, category, created_at, updated_at')
      .eq('category', category)
      .order('created_at', { ascending: false });

    // 根據用戶類型篩選
    if (userContext.isAuthenticated && userContext.userId) {
      query = query.eq('user_id', userContext.userId);
    } else if (userContext.anonymousId) {
      query = query.eq('anonymous_id', userContext.anonymousId);
    } else {
      return { success: false, error: '無效的用戶身份' };
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ 取得道具失敗:', error);
      return { success: false, error: error.message };
    }

    return { success: true, items: data || [] };
  } catch (error) {
    console.error('❌ 取得道具異常:', error);
    return { success: false, error: '取得道具時發生錯誤' };
  }
}

/**
 * 新增道具
 */
export async function createItem(
  itemData: CreateItemData,
  userContext: UserContext
): Promise<{
  success: boolean;
  item?: Item;
  error?: string;
}> {
  try {
    // 驗證必填欄位
    if (!itemData.name || !itemData.category) {
      return { success: false, error: '名稱和類別為必填欄位' };
    }

    // 準備資料
    const newItem: any = {
      name: itemData.name,
      description: itemData.description || '',
      quantity: itemData.quantity || 1,
      category: itemData.category
    };

    // 設定擁有者
    if (userContext.isAuthenticated && userContext.userId) {
      newItem.user_id = userContext.userId;
    } else if (userContext.anonymousId) {
      newItem.anonymous_id = userContext.anonymousId;
    } else {
      return { success: false, error: '無效的用戶身份' };
    }

    const { data, error } = await supabase
      .from('items')
      .insert(newItem)
      .select()
      .single();

    if (error) {
      console.error('❌ 新增道具失敗:', error);
      return { success: false, error: error.message };
    }

    return { success: true, item: data };
  } catch (error) {
    console.error('❌ 新增道具異常:', error);
    return { success: false, error: '新增道具時發生錯誤' };
  }
}

/**
 * 更新道具
 */
export async function updateItem(
  itemId: string,
  updates: UpdateItemData
): Promise<{
  success: boolean;
  item?: Item;
  error?: string;
}> {
  try {
    // 驗證 itemId
    if (!itemId) {
      return { success: false, error: '道具 ID 無效' };
    }

    // 過濾空值更新
    const cleanUpdates: any = {};
    if (updates.name !== undefined) cleanUpdates.name = updates.name;
    if (updates.description !== undefined) cleanUpdates.description = updates.description;
    if (updates.quantity !== undefined) cleanUpdates.quantity = updates.quantity;
    if (updates.category !== undefined) cleanUpdates.category = updates.category;

    if (Object.keys(cleanUpdates).length === 0) {
      return { success: false, error: '沒有要更新的資料' };
    }

    const { data, error } = await supabase
      .from('items')
      .update(cleanUpdates)
      .eq('id', itemId)
      .select()
      .single();

    if (error) {
      console.error('❌ 更新道具失敗:', error);
      return { success: false, error: error.message };
    }

    return { success: true, item: data };
  } catch (error) {
    console.error('❌ 更新道具異常:', error);
    return { success: false, error: '更新道具時發生錯誤' };
  }
}

/**
 * 刪除道具
 */
export async function deleteItem(itemId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // 驗證 itemId
    if (!itemId) {
      return { success: false, error: '道具 ID 無效' };
    }

    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', itemId);

    if (error) {
      console.error('❌ 刪除道具失敗:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('❌ 刪除道具異常:', error);
    return { success: false, error: '刪除道具時發生錯誤' };
  }
}

/**
 * 取得單一道具詳情
 */
export async function getItemById(itemId: string): Promise<{
  success: boolean;
  item?: Item;
  error?: string;
}> {
  try {
    if (!itemId) {
      return { success: false, error: '道具 ID 無效' };
    }

    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('id', itemId)
      .single();

    if (error) {
      console.error('❌ 取得道具詳情失敗:', error);
      return { success: false, error: error.message };
    }

    return { success: true, item: data };
  } catch (error) {
    console.error('❌ 取得道具詳情異常:', error);
    return { success: false, error: '取得道具詳情時發生錯誤' };
  }
}
