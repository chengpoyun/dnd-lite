/**
 * temporaryConditionService - 角色臨時狀態 CRUD
 * 顯示在角色頁面名稱欄位下方、六維屬性上方；可選擇是否影響角色數值
 * （affects_stats + stat_bonuses，與能力/物品共用 StatBonusEditor 加成格式）
 */

import { supabase } from '../lib/supabase';
import type { StatBonusEditorValue } from '../components/StatBonusEditor';

export interface CharacterTemporaryCondition {
  id: string;
  character_id: string;
  name: string;
  duration: string;
  description: string;
  affects_stats: boolean;
  stat_bonuses: StatBonusEditorValue;
  created_at: string;
  updated_at: string;
}

export interface CreateTemporaryConditionData {
  name: string;
  duration?: string;
  description?: string;
  affects_stats?: boolean;
  stat_bonuses?: StatBonusEditorValue;
}

export async function getTemporaryConditions(characterId: string): Promise<{
  success: boolean;
  conditions?: CharacterTemporaryCondition[];
  error?: string;
}> {
  try {
    if (!characterId) return { success: false, error: '角色 ID 無效' };
    const { data, error } = await supabase
      .from('character_temporary_conditions')
      .select('*')
      .eq('character_id', characterId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('取得臨時狀態失敗:', error);
      return { success: false, error: error.message };
    }
    return { success: true, conditions: data ?? [] };
  } catch (e) {
    console.error('取得臨時狀態異常:', e);
    return { success: false, error: '取得臨時狀態時發生錯誤' };
  }
}

export async function createTemporaryCondition(
  characterId: string,
  data: CreateTemporaryConditionData
): Promise<{ success: boolean; condition?: CharacterTemporaryCondition; error?: string }> {
  try {
    if (!characterId) return { success: false, error: '角色 ID 無效' };
    const name = data.name?.trim();
    if (!name) return { success: false, error: '名稱無效' };

    const { data: row, error } = await supabase
      .from('character_temporary_conditions')
      .insert({
        character_id: characterId,
        name,
        duration: data.duration ?? '',
        description: data.description ?? '',
        affects_stats: data.affects_stats ?? false,
        stat_bonuses: data.stat_bonuses ?? {},
      })
      .select()
      .single();

    if (error) {
      console.error('新增臨時狀態失敗:', error);
      return { success: false, error: error.message };
    }
    return { success: true, condition: row };
  } catch (e) {
    console.error('新增臨時狀態異常:', e);
    return { success: false, error: '新增臨時狀態時發生錯誤' };
  }
}

export async function updateTemporaryCondition(
  conditionId: string,
  updates: Partial<CreateTemporaryConditionData>
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!conditionId) return { success: false, error: '臨時狀態 ID 無效' };
    if (updates.name !== undefined && !updates.name.trim()) return { success: false, error: '名稱無效' };

    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.name !== undefined) payload.name = updates.name.trim();
    if (updates.duration !== undefined) payload.duration = updates.duration;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.affects_stats !== undefined) payload.affects_stats = updates.affects_stats;
    if (updates.stat_bonuses !== undefined) payload.stat_bonuses = updates.stat_bonuses;

    const { error } = await supabase
      .from('character_temporary_conditions')
      .update(payload)
      .eq('id', conditionId);

    if (error) {
      console.error('更新臨時狀態失敗:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (e) {
    console.error('更新臨時狀態異常:', e);
    return { success: false, error: '更新臨時狀態時發生錯誤' };
  }
}

export async function deleteTemporaryCondition(conditionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!conditionId) return { success: false, error: '臨時狀態 ID 無效' };
    const { error } = await supabase.from('character_temporary_conditions').delete().eq('id', conditionId);
    if (error) {
      console.error('刪除臨時狀態失敗:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (e) {
    console.error('刪除臨時狀態異常:', e);
    return { success: false, error: '刪除臨時狀態時發生錯誤' };
  }
}
