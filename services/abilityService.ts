import { supabase } from '../lib/supabase';
import type { Ability, CharacterAbility, CharacterAbilityWithDetails } from '../lib/supabase';

export interface AbilityFilters {
  source?: '種族' | '職業' | '專長' | '背景' | '其他';
  recoveryType?: '常駐' | '短休' | '長休';
  searchText?: string;
}

export interface CreateAbilityData {
  name: string;
  name_en: string;  // 可以是空字串
  description: string;
  source: '種族' | '職業' | '專長' | '背景' | '其他';
  recovery_type: '常駐' | '短休' | '長休';
}

// 上傳角色能力到全域能力庫時使用的資料（所有欄位必填）
export interface CreateAbilityDataForUpload {
  name: string;
  name_en: string;
  description: string;
  source: '種族' | '職業' | '專長' | '背景' | '其他';
  recovery_type: '常駐' | '短休' | '長休';
}

/** 新增個人能力（直接寫入 character_abilities，不經 abilities） */
export interface CreateCharacterAbilityData {
  name: string;
  name_en: string;
  source: '種族' | '職業' | '專長' | '背景' | '其他';
  recovery_type: '常駐' | '短休' | '長休';
  description?: string;
  max_uses?: number;
}

/**
 * 取得所有特殊能力（可選篩選條件）
 */
export async function getAllAbilities(filters?: AbilityFilters): Promise<Ability[]> {
  let query = supabase
    .from('abilities')
    .select('*')
    .order('name', { ascending: true });

  if (filters?.source) {
    query = query.eq('source', filters.source);
  }

  if (filters?.recoveryType) {
    query = query.eq('recovery_type', filters.recoveryType);
  }

  if (filters?.searchText) {
    // 搜尋中英文名稱
    query = query.or(`name.ilike.%${filters.searchText}%,name_en.ilike.%${filters.searchText}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('取得特殊能力列表失敗:', error);
    throw error;
  }

  return data || [];
}

/**
 * 新增個人能力（直接寫入 character_abilities，不建立 abilities）
 * 必填：name、source、recovery_type；選填：description、max_uses（預設依 recovery_type）
 */
export async function createCharacterAbility(
  characterId: string,
  data: CreateCharacterAbilityData
): Promise<{
  success: boolean;
  item?: CharacterAbility;
  error?: string;
}> {
  try {
    if (!characterId) {
      return { success: false, error: '角色 ID 無效' };
    }
    if (!data.name?.trim() || !data.source || !data.recovery_type) {
      return { success: false, error: '名稱、來源、恢復類型為必填' };
    }

    const defaultMaxUses = data.recovery_type === '常駐' ? 0 : 1;
    const maxUses = data.max_uses ?? defaultMaxUses;

    const { data: row, error } = await supabase
      .from('character_abilities')
      .insert([{
        character_id: characterId,
        ability_id: null,
        current_uses: maxUses,
        max_uses: maxUses,
        name_override: data.name.trim(),
        description_override: data.description?.trim() ?? '',
        source_override: data.source,
        recovery_type_override: data.recovery_type
      }])
      .select()
      .single();

    if (error) {
      console.error('新增個人能力失敗:', error);
      return { success: false, error: error.message };
    }

    return { success: true, item: row };
  } catch (error) {
    console.error('新增個人能力異常:', error);
    return { success: false, error: '新增個人能力時發生錯誤' };
  }
}

/**
 * 新增特殊能力到資料庫
 */
export async function createAbility(abilityData: CreateAbilityData): Promise<Ability> {
  const { data, error } = await supabase
    .from('abilities')
    .insert([abilityData])
    .select()
    .single();

  if (error) {
    console.error('新增特殊能力失敗:', error);
    throw error;
  }

  return data;
}

/**
 * 將角色能力上傳到全域能力庫：
 * - 以 name_en（不分大小寫）檢查 abilities 是否已存在
 * - 若已存在：只更新該角色能力的 ability_id 指向既有 ability
 * - 若不存在：建立新的 ability，再更新角色能力的 ability_id
 */
export async function uploadCharacterAbilityToGlobal(
  characterAbilityId: string,
  data: CreateAbilityDataForUpload
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    if (!characterAbilityId) {
      return { success: false, error: '角色能力 ID 無效' };
    }

    const { name, name_en, description, source, recovery_type } = data;

    if (!name.trim() || !name_en.trim() || !description.trim() || !source || !recovery_type) {
      return { success: false, error: '所有欄位皆為必填' };
    }

    const { data: existing, error: findError } = await (supabase
      .from('abilities')
      .select('*')
      .ilike('name_en', name_en)
      .maybeSingle());

    let targetAbilityId: string | null = null;

    if (existing && !findError) {
      targetAbilityId = existing.id;
    } else {
      if (findError && findError.code !== 'PGRST116' && findError.status !== 406) {
        console.error('查詢全域能力失敗:', findError);
        return { success: false, error: '查詢全域能力失敗' };
      }

      const { data: inserted, error: insertError } = await supabase
        .from('abilities')
        .insert([{
          name,
          name_en,
          description,
          source,
          recovery_type
        }])
        .select()
        .single();

      if (insertError || !inserted) {
        console.error('創建全域能力失敗:', insertError);
        return { success: false, error: insertError?.message || '創建全域能力失敗' };
      }

      targetAbilityId = inserted.id;
    }

    if (!targetAbilityId) {
      return { success: false, error: '無法取得全域能力 ID' };
    }

    const { error: updateError } = await supabase
      .from('character_abilities')
      .update({ ability_id: targetAbilityId })
      .eq('id', characterAbilityId);

    if (updateError) {
      console.error('更新角色能力關聯失敗:', updateError);
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (error) {
    console.error('上傳能力到全域庫異常:', error);
    return { success: false, error: '上傳能力到全域庫時發生錯誤' };
  }
}

/**
 * 更新特殊能力
 */
export async function updateAbility(abilityId: string, updates: Partial<CreateAbilityData>): Promise<Ability> {
  const { data, error } = await supabase
    .from('abilities')
    .update(updates)
    .eq('id', abilityId)
    .select()
    .single();

  if (error) {
    console.error('更新特殊能力失敗:', error);
    throw error;
  }

  return data;
}

/**
 * 刪除特殊能力
 */
export async function deleteAbility(abilityId: string): Promise<void> {
  const { error } = await supabase
    .from('abilities')
    .delete()
    .eq('id', abilityId);

  if (error) {
    console.error('刪除特殊能力失敗:', error);
    throw error;
  }
}

/**
 * 取得角色已學習的特殊能力（含能力詳情），依 sort_order 升序，無值則依 created_at 降序
 */
export async function getCharacterAbilities(characterId: string): Promise<CharacterAbilityWithDetails[]> {
  const { data, error } = await supabase
    .from('character_abilities')
    .select(`
      *,
      ability:abilities(*)
    `)
    .eq('character_id', characterId)
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('取得角色特殊能力失敗:', error);
    throw error;
  }

  // 處理 JOIN 返回的數據結構
  const result = (data || []).map(item => {
    const ability = Array.isArray(item.ability) ? item.ability[0] : item.ability;
    return {
      ...item,
      ability: ability ?? null
    };
  });

  return result;
}

/**
 * 角色學習特殊能力
 */
export async function learnAbility(
  characterId: string,
  abilityId: string,
  maxUses: number = 0
): Promise<CharacterAbility> {
  const { data, error } = await supabase
    .from('character_abilities')
    .insert([{
      character_id: characterId,
      ability_id: abilityId,
      current_uses: maxUses,
      max_uses: maxUses
    }])
    .select()
    .single();

  if (error) {
    console.error('學習特殊能力失敗:', error);
    throw error;
  }

  return data;
}

/**
 * 角色移除特殊能力
 */
export async function unlearnAbility(
  characterId: string,
  abilityId: string | null,
  characterAbilityId?: string
): Promise<void> {
  if (!abilityId && !characterAbilityId) {
    throw new Error('角色能力 ID 無效');
  }

  const query = supabase
    .from('character_abilities')
    .delete();

  const { error } = characterAbilityId
    ? await query.eq('id', characterAbilityId)
    : await query.eq('character_id', characterId).eq('ability_id', abilityId);

  if (error) {
    console.error('移除特殊能力失敗:', error);
    throw error;
  }
}

/**
 * 使用特殊能力（扣除次數）
 */
export async function useAbility(
  characterId: string,
  abilityId: string | null,
  characterAbilityId?: string
): Promise<CharacterAbility> {
  if (!abilityId && !characterAbilityId) {
    throw new Error('角色能力 ID 無效');
  }

  const fetchQuery = supabase
    .from('character_abilities')
    .select('*');

  const { data: current, error: fetchError } = characterAbilityId
    ? await fetchQuery.eq('id', characterAbilityId).single()
    : await fetchQuery.eq('character_id', characterId).eq('ability_id', abilityId).single();

  if (fetchError || !current) {
    console.error('取得特殊能力使用記錄失敗:', fetchError);
    throw fetchError || new Error('找不到特殊能力記錄');
  }

  if (current.current_uses <= 0) {
    throw new Error('特殊能力使用次數已用盡');
  }

  // 扣除次數
  const updateQuery = supabase
    .from('character_abilities')
    .update({ current_uses: current.current_uses - 1 });

  const { data, error } = characterAbilityId
    ? await updateQuery.eq('id', characterAbilityId).select().single()
    : await updateQuery.eq('character_id', characterId).eq('ability_id', abilityId).select().single();

  if (error) {
    console.error('使用特殊能力失敗:', error);
    throw error;
  }

  return data;
}

/**
 * 重設特殊能力使用次數（短休/長休恢復）
 */
export async function resetAbilityUses(
  characterId: string,
  recoveryType: '短休' | '長休'
): Promise<void> {
  // 取得該角色所有符合恢復條件的能力
  const { data: characterAbilities, error: fetchError } = await supabase
    .from('character_abilities')
    .select(`
      *,
      ability:abilities(*)
    `)
    .eq('character_id', characterId);

  if (fetchError) {
    console.error('取得角色特殊能力失敗:', fetchError);
    throw fetchError;
  }

  if (!characterAbilities || characterAbilities.length === 0) {
    return; // 沒有能力需要恢復
  }

  // 過濾需要恢復的能力
  const toReset = characterAbilities.filter(ca => {
    const ability = Array.isArray(ca.ability) ? ca.ability[0] : ca.ability;
    const effectiveRecoveryType = ca.recovery_type_override || ability?.recovery_type;
    if (!effectiveRecoveryType) return false;
    
    // 長休恢復所有非常駐能力，短休只恢復短休能力
    if (recoveryType === '長休') {
      return effectiveRecoveryType === '短休' || effectiveRecoveryType === '長休';
    }
    return effectiveRecoveryType === '短休';
  });

  // 批量更新
  const updates = toReset
    .filter(ca => ca.ability_id)
    .map(ca => ({
      character_id: characterId,
      ability_id: ca.ability_id,
      current_uses: ca.max_uses
    }));

  const personalUpdates = toReset
    .filter(ca => !ca.ability_id)
    .map(ca => ({
      id: ca.id,
      current_uses: ca.max_uses
    }));

  if (updates.length === 0 && personalUpdates.length === 0) {
    return; // 沒有能力需要恢復
  }

  // 使用 upsert 批量更新
  if (updates.length > 0) {
    const { error: updateError } = await supabase
      .from('character_abilities')
      .upsert(updates, {
        onConflict: 'character_id,ability_id',
        ignoreDuplicates: false
      });

    if (updateError) {
      console.error('重設特殊能力使用次數失敗:', updateError);
      throw updateError;
    }
  }

  if (personalUpdates.length > 0) {
    for (const update of personalUpdates) {
      const { error: personalUpdateError } = await supabase
        .from('character_abilities')
        .update({ current_uses: update.current_uses })
        .eq('id', update.id);

      if (personalUpdateError) {
        console.error('重設個人特殊能力使用次數失敗:', personalUpdateError);
        throw personalUpdateError;
      }
      
      console.log('重設個人特殊能力使用次數:', update.id, update.current_uses);
    }
  }
}

/**
 * 更新角色特殊能力的最大使用次數
 */
export async function updateAbilityMaxUses(
  characterId: string,
  abilityId: string | null,
  maxUses: number,
  characterAbilityId?: string
): Promise<CharacterAbility> {
  if (!abilityId && !characterAbilityId) {
    throw new Error('角色能力 ID 無效');
  }

  const updateQuery = supabase
    .from('character_abilities')
    .update({ 
      max_uses: maxUses,
      current_uses: maxUses // 同時重設當前次數
    });

  const { data, error } = characterAbilityId
    ? await updateQuery.eq('id', characterAbilityId).select().single()
    : await updateQuery.eq('character_id', characterId).eq('ability_id', abilityId).select().single();

  if (error) {
    console.error('更新特殊能力最大次數失敗:', error);
    throw error;
  }

  return data;
}

/**
 * 更新角色的特殊能力（客製化，不影響全域資料）
 */
export async function updateCharacterAbility(
  characterId: string,
  abilityId: string | null,
  updates: {
    name?: string;
    name_en?: string;
    description?: string;
    source?: '種族' | '職業' | '專長' | '背景' | '其他';
    recovery_type?: '常駐' | '短休' | '長休';
    max_uses?: number;
  },
  characterAbilityId?: string
): Promise<CharacterAbility> {
  if (!abilityId && !characterAbilityId) {
    throw new Error('角色能力 ID 無效');
  }

  const updateData: any = {};
  
  // 將更新轉換為 override 欄位
  if (updates.name !== undefined) updateData.name_override = updates.name;
  if (updates.name_en !== undefined) updateData.name_en_override = updates.name_en || null;
  if (updates.description !== undefined) updateData.description_override = updates.description;
  if (updates.source !== undefined) updateData.source_override = updates.source;
  if (updates.recovery_type !== undefined) updateData.recovery_type_override = updates.recovery_type;
  if (updates.max_uses !== undefined) updateData.max_uses = updates.max_uses;

  const updateQuery = supabase
    .from('character_abilities')
    .update(updateData);

  const { data, error } = characterAbilityId
    ? await updateQuery.eq('id', characterAbilityId).select().single()
    : await updateQuery.eq('character_id', characterId).eq('ability_id', abilityId).select().single();

  if (error) {
    console.error('更新角色特殊能力失敗:', error);
    throw error;
  }

  return data;
}

/**
 * 更新角色能力卡的顯示順序（依 character_ability 的 id 陣列順序寫入 sort_order）
 */
export async function updateCharacterAbilityOrder(
  characterId: string,
  orderedCharacterAbilityIds: string[]
): Promise<void> {
  if (!characterId || !orderedCharacterAbilityIds.length) return;

  const updates = orderedCharacterAbilityIds.map((id, index) =>
    supabase
      .from('character_abilities')
      .update({ sort_order: index })
      .eq('id', id)
      .eq('character_id', characterId)
  );

  const results = await Promise.all(updates);
  const failed = results.find(r => r.error);
  if (failed?.error) {
    console.error('更新能力順序失敗:', failed.error);
    throw failed.error;
  }
}

/**
 * 取得角色能力的顯示值（優先使用 override）
 */
export function getDisplayValues(charAbility: CharacterAbilityWithDetails) {
  return {
    name: charAbility.name_override || charAbility.ability?.name || '',
    name_en: charAbility.name_en_override !== undefined
      ? charAbility.name_en_override
      : (charAbility.ability?.name_en ?? null),
    description: charAbility.description_override || charAbility.ability?.description || '',
    source: charAbility.source_override || charAbility.ability?.source || '其他',
    recovery_type: charAbility.recovery_type_override || charAbility.ability?.recovery_type || '常駐'
  };
}
