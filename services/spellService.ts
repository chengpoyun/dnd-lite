import { supabase } from '../lib/supabase';

/** 法術欄位型別（本地目錄 data/spells.json 沿用此欄位命名，見 school） */
export interface Spell {
  name: string;
  name_en?: string;
  level: number;
  casting_time: string;
  school: '塑能' | '惑控' | '預言' | '咒法' | '變化' | '防護' | '死靈' | '幻術';
  concentration: boolean;
  ritual: boolean;
  duration: string;
  range: string;
  source: string;
  verbal: boolean;
  somatic: boolean;
  material: string;
  description: string;
}

/** 角色法術：每列自足，名稱/環階等一律存在 xxx_override 欄位，不再有 spell_id 外鍵指向全域 spells 表 */
export interface CharacterSpell {
  id: string;
  character_id: string;
  is_prepared: boolean;
  created_at: string;
  name_override?: string | null;
  name_en_override?: string | null;
  level_override?: number | null;
  casting_time_override?: string | null;
  school_override?: Spell['school'] | null;
  concentration_override?: boolean | null;
  ritual_override?: boolean | null;
  duration_override?: string | null;
  range_override?: string | null;
  source_override?: string | null;
  verbal_override?: boolean | null;
  somatic_override?: boolean | null;
  material_override?: string | null;
  description_override?: string | null;
}

// 帶有 display helper 的 CharacterSpell 類型
export interface CharacterSpellWithDetails extends CharacterSpell {
  displayName: string;
  displayNameEn?: string;
  displayLevel: number;
  displayCastingTime: string;
  displaySchool: Spell['school'];
  displayConcentration: boolean;
  displayRitual: boolean;
  displayDuration: string;
  displayRange: string;
  displaySource: string;
  displayVerbal: boolean;
  displaySomatic: boolean;
  displayMaterial: string;
  displayDescription: string;
}

/** 新增個人法術（直接寫入 character_spells，不經 spells） */
export interface CreateCharacterSpellData {
  name: string;
  name_en: string;
  level: number;
  casting_time: string;
  school: Spell['school'];
  concentration: boolean;
  ritual: boolean;
  duration: string;
  range: string;
  source: string;
  verbal: boolean;
  somatic: boolean;
  material: string;
  description: string;
}

/**
 * 新增個人法術／從本地法術目錄獲得法術（皆直接寫入 character_spells）
 */
export async function createCharacterSpell(
  characterId: string,
  data: CreateCharacterSpellData
): Promise<{
  success: boolean;
  item?: CharacterSpell;
  error?: string;
}> {
  try {
    if (!characterId) {
      return { success: false, error: '角色 ID 無效' };
    }

    const requiredFields = [
      data.name,
      data.name_en,
      data.casting_time,
      data.duration,
      data.range,
      data.source,
      data.material,
      data.description,
    ];

    if (requiredFields.some((value) => !value?.toString().trim())) {
      return { success: false, error: '所有欄位皆為必填' };
    }

    const { data: row, error } = await supabase
      .from('character_spells')
      .insert([{
        character_id: characterId,
        is_prepared: false,
        name_override: data.name.trim(),
        name_en_override: data.name_en.trim(),
        level_override: data.level,
        casting_time_override: data.casting_time,
        school_override: data.school,
        concentration_override: data.concentration,
        ritual_override: data.ritual,
        duration_override: data.duration,
        range_override: data.range,
        source_override: data.source,
        verbal_override: data.verbal,
        somatic_override: data.somatic,
        material_override: data.material,
        description_override: data.description,
      }])
      .select()
      .single();

    if (error) {
      console.error('新增個人法術失敗:', error);
      return { success: false, error: error.message };
    }

    return { success: true, item: row };
  } catch (error) {
    console.error('新增個人法術異常:', error);
    return { success: false, error: '新增個人法術時發生錯誤' };
  }
}

/**
 * 取得角色已學的法術
 */
export async function getCharacterSpells(characterId: string): Promise<CharacterSpell[]> {
  const { data, error } = await supabase
    .from('character_spells')
    .select('*')
    .eq('character_id', characterId);

  if (error) {
    console.error('取得角色法術失敗:', error);
    throw error;
  }

  return data || [];
}

/**
 * 角色遺忘法術
 */
export async function forgetSpell(characterSpellId: string): Promise<void> {
  const { error } = await supabase
    .from('character_spells')
    .delete()
    .eq('id', characterSpellId);

  if (error) {
    console.error('遺忘法術失敗:', error);
    throw error;
  }
}

/**
 * 切換法術的準備狀態
 */
export async function togglePrepared(characterSpellId: string, isPrepared: boolean): Promise<void> {
  const { error } = await supabase
    .from('character_spells')
    .update({ is_prepared: isPrepared })
    .eq('id', characterSpellId);

  if (error) {
    console.error('切換準備狀態失敗:', error);
    throw error;
  }
}

/**
 * 取得角色已準備的法術數量（不含戲法）
 */
export async function getPreparedSpellsCount(characterId: string): Promise<number> {
  const { data, error } = await supabase
    .from('character_spells')
    .select('id')
    .eq('character_id', characterId)
    .eq('is_prepared', true)
    .neq('level_override', 0); // 排除戲法

  if (error) {
    console.error('取得已準備法術數量失敗:', error);
    return 0;
  }

  return data?.length || 0;
}

/**
 * 取得角色已準備的戲法數量
 */
export async function getPreparedCantripsCount(characterId: string): Promise<number> {
  const { data, error } = await supabase
    .from('character_spells')
    .select('id')
    .eq('character_id', characterId)
    .eq('is_prepared', true)
    .eq('level_override', 0); // 只計算戲法

  if (error) {
    console.error('取得已準備戲法數量失敗:', error);
    return 0;
  }

  return data?.length || 0;
}

/**
 * 更新角色專屬法術（使用 override 欄位）
 * 不影響 spells 表的全域資料
 */
export async function updateCharacterSpell(
  characterSpellId: string,
  updates: Partial<Omit<CharacterSpell, 'id' | 'character_id' | 'created_at'>>
): Promise<{success: boolean; error?: string}> {
  try {
    const { error } = await supabase
      .from('character_spells')
      .update(updates)
      .eq('id', characterSpellId);

    if (error) {
      console.error('更新角色法術失敗:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('更新角色法術異常:', error);
    return { success: false, error: '更新法術時發生錯誤' };
  }
}

/**
 * 獲取法術的顯示值
 */
export function getDisplayValues(characterSpell: CharacterSpell): CharacterSpellWithDetails {
  return {
    ...characterSpell,
    displayName: characterSpell.name_override ?? '',
    displayNameEn: characterSpell.name_en_override ?? '',
    displayLevel: characterSpell.level_override ?? 0,
    displayCastingTime: characterSpell.casting_time_override ?? '',
    displaySchool: characterSpell.school_override ?? '塑能',
    displayConcentration: characterSpell.concentration_override ?? false,
    displayRitual: characterSpell.ritual_override ?? false,
    displayDuration: characterSpell.duration_override ?? '',
    displayRange: characterSpell.range_override ?? '',
    displaySource: characterSpell.source_override ?? '',
    displayVerbal: characterSpell.verbal_override ?? false,
    displaySomatic: characterSpell.somatic_override ?? false,
    displayMaterial: characterSpell.material_override ?? '',
    displayDescription: characterSpell.description_override ?? ''
  };
}
