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

export type ItemCategory = '裝備' | '藥水' | 'MH素材' | '雜項';

// 全域物品（global_items 表）
export interface GlobalItem {
  id: string;
  name: string;
  name_en?: string;
  description: string;
  category: ItemCategory;
  is_magic: boolean;
  /** 是否影響角色數值 */
  affects_stats?: boolean;
  /** 此物品提供的數值加成定義（存入 global_items.stat_bonuses） */
  stat_bonuses?: {
    abilityModifiers?: Record<string, number>;
    savingThrows?: Record<string, number>;
    skills?: Record<string, number>;
    savingThrowAdvantage?: string[];
    savingThrowDisadvantage?: string[];
    skillAdvantage?: string[];
    skillDisadvantage?: string[];
    combatStats?: {
      ac?: number;
      initiative?: number;
      maxHp?: number;
      speed?: number;
      attackHit?: number;
      attackDamage?: number;
      spellHit?: number;
      spellDc?: number;
    };
  };
  /** 裝備類型（僅裝備類有值）：face, head, neck, shoulders, body, torso, arms, hands, waist, feet, ring, melee_weapon, ranged_weapon, shield */
  equipment_kind?: string | null;
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
  /** 覆寫：此角色版物品是否影響角色數值 */
  affects_stats?: boolean;
  /** 覆寫：此角色版物品的數值加成（存入 character_items.stat_bonuses） */
  stat_bonuses?: GlobalItem['stat_bonuses'];
  /** 裝備類型覆寫（優先於 global_items.equipment_kind） */
  equipment_kind_override?: string | null;
  /** 穿戴的具體槽位，裝備類必填 */
  equipment_slot?: string | null;
  /** 是否穿戴中，僅 true 時計入角色數值 */
  is_equipped?: boolean;
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

export interface UpdateCharacterItemData {
  quantity?: number;
  name_override?: string | null;
  description_override?: string | null;
  category_override?: ItemCategory | null;
  is_magic?: boolean;
  is_magic_override?: boolean | null;
  /** 覆寫：此角色版物品是否影響角色數值 */
  affects_stats?: boolean;
  /** 覆寫：此角色版物品的數值加成（與 StatBonusEditorValue 結構一致） */
  stat_bonuses?: any;
  equipment_kind_override?: string | null;
  equipment_slot?: string | null;
  is_equipped?: boolean;
}

/** 新增個人物品（直接寫入 character_items，不經 global_items） */
export interface CreateCharacterItemData {
  name: string;
  category: ItemCategory;
  description?: string;
  quantity?: number;
  is_magic: boolean;
  /** 是否影響角色數值（個人物品直接帶入 character_items） */
  affects_stats?: boolean;
  /** 此個人物品的數值加成（與 StatBonusEditorValue 結構一致） */
  stat_bonuses?: any;
  /** 裝備類可選：裝備類型（由裝備頁決定實際槽位與穿戴狀態） */
  equipment_kind_override?: string | null;
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

/** 獲得物品時可一併設定的裝備欄位（裝備類時由呼叫端傳入） */
export interface LearnItemEquipmentOptions {
  equipment_slot?: string | null;
  is_equipped?: boolean;
}

/**
 * 獲得物品（從全域庫添加到角色）
 * 若為裝備類，可傳入 equipmentOptions 設定槽位與是否穿戴
 */
export async function learnItem(
  characterId: string,
  itemId: string,
  equipmentOptions?: LearnItemEquipmentOptions
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    if (!characterId || !itemId) {
      return { success: false, error: '角色 ID 或物品 ID 無效' };
    }

    const payload: Record<string, unknown> = {
      character_id: characterId,
      item_id: itemId,
      quantity: 1,
    };
    if (equipmentOptions) {
      if (equipmentOptions.equipment_slot !== undefined) payload.equipment_slot = equipmentOptions.equipment_slot;
      if (equipmentOptions.is_equipped !== undefined) payload.is_equipped = equipmentOptions.is_equipped;
    }

    const { error } = await supabase
      .from('character_items')
      .insert(payload);

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

    const payload: Record<string, unknown> = {
      character_id: characterId,
      item_id: null,
      quantity: data.quantity ?? 1,
      is_magic: data.is_magic ?? false,
      name_override: data.name.trim(),
      description_override: data.description?.trim() ?? '',
      category_override: data.category,
    };
    if (data.affects_stats !== undefined) payload.affects_stats = data.affects_stats;
    if (data.stat_bonuses !== undefined) payload.stat_bonuses = data.stat_bonuses;
    if (data.equipment_kind_override !== undefined) payload.equipment_kind_override = data.equipment_kind_override;

    const { data: row, error } = await supabase
      .from('character_items')
      .insert(payload)
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

/** 取得角色物品的顯示用裝備類型（override 優先於 global_items.equipment_kind） */
export function getDisplayEquipmentKind(characterItem: CharacterItem): string | null {
  if (characterItem.equipment_kind_override != null && characterItem.equipment_kind_override !== '') {
    return characterItem.equipment_kind_override;
  }
  return characterItem.item?.equipment_kind ?? null;
}
