import { supabase } from '../lib/supabase';
import type { CharacterAbility, CharacterAbilityWithDetails } from '../lib/supabase';

/** 能力來源顯示順序（篩選、表單選單、標籤等依此順序） */
export const ABILITY_SOURCE_ORDER = ['職業', '種族', '裝備', '專長', '背景', '其他'] as const;

export type AbilitySource = (typeof ABILITY_SOURCE_ORDER)[number];

/** 能力恢復規則（表單選單依此順序） */
export const RECOVERY_TYPES = ['常駐', '短休', '長休'] as const;

export type AbilityRecoveryType = (typeof RECOVERY_TYPES)[number];

export interface CreateAbilityData {
  name: string;
  name_en: string;  // 可以是空字串
  description: string;
  source: AbilitySource;
  recovery_type: '常駐' | '短休' | '長休';
  /** 此能力是否影響角色數值（顯示 stat_bonuses 編輯器用） */
  affects_stats?: boolean;
  /** 此能力提供的數值加成定義（存入 abilities.stat_bonuses） */
  stat_bonuses?: {
    abilityModifiers?: Record<string, number>;
    savingThrows?: Record<string, number>;
    skills?: Record<string, number>;
    savingThrowAdvantage?: string[];
    savingThrowDisadvantage?: string[];
    skillAdvantage?: string[];
    skillDisadvantage?: string[];
    /** 純數字為一般加值；字串為骰子記法（如 "1d8"），供攻擊傷害等額外骰子加成使用 */
    combatStats?: {
      ac?: number | string;
      initiative?: number | string;
      maxHp?: number | string;
      speed?: number | string;
      attackHit?: number | string;
      attackDamage?: number | string;
      spellHit?: number | string;
      spellDc?: number | string;
    };
    /** 「其他效果」自由文字說明（非數值加成） */
    other?: string;
  };
}

/** 新增個人能力（直接寫入 character_abilities） */
export interface CreateCharacterAbilityData {
  name: string;
  name_en: string;
  source: AbilitySource;
  recovery_type: '常駐' | '短休' | '長休';
  description?: string;
  max_uses?: number;
  /** 此能力是否影響角色數值（從本地能力目錄「獲得」時可能帶入） */
  affects_stats?: boolean;
  /** 此能力提供的數值加成定義（從本地能力目錄「獲得」時可能帶入） */
  stat_bonuses?: CreateAbilityData['stat_bonuses'];
}

/**
 * 新增個人能力／從本地能力目錄獲得能力（皆直接寫入 character_abilities）
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

    const row: Record<string, unknown> = {
      character_id: characterId,
      current_uses: maxUses,
      max_uses: maxUses,
      name_override: data.name.trim(),
      name_en_override: data.name_en?.trim() || null,
      description_override: data.description?.trim() ?? '',
      source_override: data.source,
      recovery_type_override: data.recovery_type,
    };
    if (data.affects_stats !== undefined) row.affects_stats = data.affects_stats;
    if (data.stat_bonuses !== undefined) row.stat_bonuses = data.stat_bonuses;

    const { data: insertedRow, error } = await supabase
      .from('character_abilities')
      .insert([row])
      .select()
      .single();

    if (error) {
      console.error('新增個人能力失敗:', error);
      return { success: false, error: error.message };
    }

    return { success: true, item: insertedRow };
  } catch (error) {
    console.error('新增個人能力異常:', error);
    return { success: false, error: '新增個人能力時發生錯誤' };
  }
}


/**
 * 取得角色已學習的特殊能力，依 sort_order 升序，無值則依 created_at 降序
 */
export async function getCharacterAbilities(characterId: string): Promise<CharacterAbilityWithDetails[]> {
  const { data, error } = await supabase
    .from('character_abilities')
    .select('*')
    .eq('character_id', characterId)
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('取得角色特殊能力失敗:', error);
    throw error;
  }

  return data || [];
}

/**
 * 角色移除特殊能力
 */
export async function unlearnAbility(characterAbilityId: string): Promise<void> {
  const { error } = await supabase
    .from('character_abilities')
    .delete()
    .eq('id', characterAbilityId);

  if (error) {
    console.error('移除特殊能力失敗:', error);
    throw error;
  }
}

/**
 * 使用特殊能力（扣除次數）
 */
export async function useAbility(characterAbilityId: string): Promise<CharacterAbility> {
  const { data: current, error: fetchError } = await supabase
    .from('character_abilities')
    .select('*')
    .eq('id', characterAbilityId)
    .single();

  if (fetchError || !current) {
    console.error('取得特殊能力使用記錄失敗:', fetchError);
    throw fetchError || new Error('找不到特殊能力記錄');
  }

  if (current.current_uses <= 0) {
    throw new Error('特殊能力使用次數已用盡');
  }

  const { data, error } = await supabase
    .from('character_abilities')
    .update({ current_uses: current.current_uses - 1 })
    .eq('id', characterAbilityId)
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
  const { data: characterAbilities, error: fetchError } = await supabase
    .from('character_abilities')
    .select('*')
    .eq('character_id', characterId);

  if (fetchError) {
    console.error('取得角色特殊能力失敗:', fetchError);
    throw fetchError;
  }

  if (!characterAbilities || characterAbilities.length === 0) {
    return; // 沒有能力需要恢復
  }

  // 過濾需要恢復的能力：長休恢復所有非常駐能力，短休只恢復短休能力
  const toReset = characterAbilities.filter(ca => {
    const effectiveRecoveryType = ca.recovery_type_override;
    if (!effectiveRecoveryType) return false;
    if (recoveryType === '長休') {
      return effectiveRecoveryType === '短休' || effectiveRecoveryType === '長休';
    }
    return effectiveRecoveryType === '短休';
  });

  if (toReset.length === 0) {
    return;
  }

  for (const ca of toReset) {
    const { error: updateError } = await supabase
      .from('character_abilities')
      .update({ current_uses: ca.max_uses })
      .eq('id', ca.id);

    if (updateError) {
      console.error('重設特殊能力使用次數失敗:', updateError);
      throw updateError;
    }
  }
}

/**
 * 更新角色特殊能力的最大使用次數
 */
export async function updateAbilityMaxUses(
  characterAbilityId: string,
  maxUses: number
): Promise<CharacterAbility> {
  const { data, error } = await supabase
    .from('character_abilities')
    .update({
      max_uses: maxUses,
      current_uses: maxUses // 同時重設當前次數
    })
    .eq('id', characterAbilityId)
    .select()
    .single();

  if (error) {
    console.error('更新特殊能力最大次數失敗:', error);
    throw error;
  }

  return data;
}

/**
 * 更新角色的特殊能力
 */
export async function updateCharacterAbility(
  characterAbilityId: string,
  updates: {
    name?: string;
    name_en?: string;
    description?: string;
    source?: AbilitySource;
    recovery_type?: '常駐' | '短休' | '長休';
    max_uses?: number;
    /** 此角色版能力是否影響角色數值 */
    affects_stats?: boolean;
    /** 此角色版能力的數值加成定義（存入 character_abilities.stat_bonuses） */
    stat_bonuses?: any;
  }
): Promise<CharacterAbility> {
  const updateData: any = {};

  // 將更新轉換為 override 欄位
  if (updates.name !== undefined) updateData.name_override = updates.name;
  if (updates.name_en !== undefined) updateData.name_en_override = updates.name_en || null;
  if (updates.description !== undefined) updateData.description_override = updates.description;
  if (updates.source !== undefined) updateData.source_override = updates.source;
  if (updates.recovery_type !== undefined) updateData.recovery_type_override = updates.recovery_type;
  if (updates.max_uses !== undefined) updateData.max_uses = updates.max_uses;
  if (updates.affects_stats !== undefined) updateData.affects_stats = updates.affects_stats;
  if (updates.stat_bonuses !== undefined) updateData.stat_bonuses = updates.stat_bonuses;

  const { data, error } = await supabase
    .from('character_abilities')
    .update(updateData)
    .eq('id', characterAbilityId)
    .select()
    .single();

  if (error) {
    console.error('更新角色特殊能力失敗:', error);
    throw error;
  }

  return data;
}

/**
 * 依拖曳排序計算結果（見 utils/fractionalOrder.ts 的 planReorder），
 * 將 { id: 新sort_order } 對照表逐筆寫回 DB（限定 character_id，避免誤改其他角色資料）
 */
export async function updateCharacterAbilityOrder(
  characterId: string,
  updates: Record<string, number>
): Promise<{ success: boolean; error?: string }> {
  try {
    const entries = Object.entries(updates);
    if (!characterId || entries.length === 0) {
      return { success: false, error: '角色 ID 或排序資料無效' };
    }

    const results = await Promise.all(
      entries.map(([id, sortOrder]) =>
        supabase
          .from('character_abilities')
          .update({ sort_order: sortOrder })
          .eq('id', id)
          .eq('character_id', characterId)
      )
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) {
      console.error('更新能力順序失敗:', failed.error);
      return { success: false, error: failed.error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('更新能力順序異常:', error);
    return { success: false, error: '更新能力順序時發生錯誤' };
  }
}

/**
 * 取得角色能力的顯示值
 */
export function getDisplayValues(charAbility: CharacterAbilityWithDetails) {
  return {
    name: charAbility.name_override || '',
    name_en: charAbility.name_en_override ?? null,
    description: charAbility.description_override ?? '',
    source: charAbility.source_override || '其他',
    recovery_type: charAbility.recovery_type_override || '常駐'
  };
}
