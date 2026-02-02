import { supabase } from '../lib/supabase';
import type { Ability, CharacterAbility, CharacterAbilityWithDetails } from '../lib/supabase';

export interface AbilityFilters {
  source?: '種族' | '職業' | '專長' | '背景' | '其他';
  recoveryType?: '常駐' | '短休' | '長休';
  searchText?: string;
}

export interface CreateAbilityData {
  name: string;
  name_en: string;
  description: string;
  source: '種族' | '職業' | '專長' | '背景' | '其他';
  recovery_type: '常駐' | '短休' | '長休';
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
 * 取得角色已學習的特殊能力（含能力詳情）
 */
export async function getCharacterAbilities(characterId: string): Promise<CharacterAbilityWithDetails[]> {
  const { data, error } = await supabase
    .from('character_abilities')
    .select(`
      *,
      ability:abilities(*)
    `)
    .eq('character_id', characterId)
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
      ability: ability as Ability
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
export async function unlearnAbility(characterId: string, abilityId: string): Promise<void> {
  const { error } = await supabase
    .from('character_abilities')
    .delete()
    .eq('character_id', characterId)
    .eq('ability_id', abilityId);

  if (error) {
    console.error('移除特殊能力失敗:', error);
    throw error;
  }
}

/**
 * 使用特殊能力（扣除次數）
 */
export async function useAbility(characterId: string, abilityId: string): Promise<CharacterAbility> {
  // 先取得當前數據
  const { data: current, error: fetchError } = await supabase
    .from('character_abilities')
    .select('*')
    .eq('character_id', characterId)
    .eq('ability_id', abilityId)
    .single();

  if (fetchError || !current) {
    console.error('取得特殊能力使用記錄失敗:', fetchError);
    throw fetchError || new Error('找不到特殊能力記錄');
  }

  if (current.current_uses <= 0) {
    throw new Error('特殊能力使用次數已用盡');
  }

  // 扣除次數
  const { data, error } = await supabase
    .from('character_abilities')
    .update({ current_uses: current.current_uses - 1 })
    .eq('character_id', characterId)
    .eq('ability_id', abilityId)
    .select()
    .single();

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
    if (!ability) return false;
    
    // 長休恢復所有非常駐能力，短休只恢復短休能力
    if (recoveryType === '長休') {
      return ability.recovery_type === '短休' || ability.recovery_type === '長休';
    } else {
      return ability.recovery_type === '短休';
    }
  });

  // 批量更新
  const updates = toReset.map(ca => ({
    character_id: characterId,
    ability_id: ca.ability_id,
    current_uses: ca.max_uses
  }));

  if (updates.length === 0) {
    return; // 沒有能力需要恢復
  }

  // 使用 upsert 批量更新
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

  console.log(`✅ ${recoveryType}恢復：已重設 ${updates.length} 個特殊能力`);
}

/**
 * 更新角色特殊能力的最大使用次數
 */
export async function updateAbilityMaxUses(
  characterId: string,
  abilityId: string,
  maxUses: number
): Promise<CharacterAbility> {
  const { data, error } = await supabase
    .from('character_abilities')
    .update({ 
      max_uses: maxUses,
      current_uses: maxUses // 同時重設當前次數
    })
    .eq('character_id', characterId)
    .eq('ability_id', abilityId)
    .select()
    .single();

  if (error) {
    console.error('更新特殊能力最大次數失敗:', error);
    throw error;
  }

  return data;
}
