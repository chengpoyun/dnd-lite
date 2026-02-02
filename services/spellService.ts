import { supabase } from '../lib/supabase';

export interface Spell {
  id: string;
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
  created_at: string;
  updated_at: string;
}

export interface CharacterSpell {
  id: string;
  character_id: string;
  spell_id: string;
  is_prepared: boolean;
  created_at: string;
  // Override 欄位（角色專屬客製化）
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
  // JOIN 查詢時會包含完整法術資料
  spell?: Spell;
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

export interface SpellFilters {
  level?: number;
  school?: string;
  searchText?: string;
}

export interface CreateSpellData {
  name: string;
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
 * 取得所有法術（可選篩選條件）
 */
export async function getAllSpells(filters?: SpellFilters): Promise<Spell[]> {
  let query = supabase
    .from('spells')
    .select('*')
    .order('level', { ascending: true })
    .order('name', { ascending: true });

  if (filters?.level !== undefined) {
    query = query.eq('level', filters.level);
  }

  if (filters?.school) {
    query = query.eq('school', filters.school);
  }

  if (filters?.searchText) {
    query = query.ilike('name', `%${filters.searchText}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('取得法術列表失敗:', error);
    throw error;
  }

  return data || [];
}

/**
 * 新增法術到資料庫
 */
export async function createSpell(spellData: CreateSpellData): Promise<Spell> {
  const { data, error } = await supabase
    .from('spells')
    .insert([spellData])
    .select()
    .single();

  if (error) {
    console.error('新增法術失敗:', error);
    throw error;
  }

  return data;
}

/**
 * 編輯法術
 */
export async function updateSpell(spellId: string, spellData: Partial<CreateSpellData>): Promise<Spell> {
  const { data, error } = await supabase
    .from('spells')
    .update(spellData)
    .eq('id', spellId)
    .select()
    .single();

  if (error) {
    console.error('編輯法術失敗:', error);
    throw error;
  }

  return data;
}

/**
 * 取得角色已學的法術
 */
export async function getCharacterSpells(characterId: string): Promise<CharacterSpell[]> {
  const { data, error } = await supabase
    .from('character_spells')
    .select(`
      *,
      spell:spells(*)
    `)
    .eq('character_id', characterId);

  if (error) {
    console.error('取得角色法術失敗:', error);
    throw error;
  }

  return data || [];
}

/**
 * 角色學習法術
 */
export async function learnSpell(characterId: string, spellId: string): Promise<CharacterSpell> {
  const { data, error } = await supabase
    .from('character_spells')
    .insert([{
      character_id: characterId,
      spell_id: spellId,
      is_prepared: false
    }])
    .select(`
      *,
      spell:spells(*)
    `)
    .single();

  if (error) {
    console.error('學習法術失敗:', error);
    throw error;
  }

  return data;
}

/**
 * 角色遺忘法術
 */
export async function forgetSpell(characterId: string, spellId: string): Promise<void> {
  const { error } = await supabase
    .from('character_spells')
    .delete()
    .eq('character_id', characterId)
    .eq('spell_id', spellId);

  if (error) {
    console.error('遺忘法術失敗:', error);
    throw error;
  }
}

/**
 * 切換法術的準備狀態
 */
export async function togglePrepared(characterId: string, spellId: string, isPrepared: boolean): Promise<void> {
  const { error } = await supabase
    .from('character_spells')
    .update({ is_prepared: isPrepared })
    .eq('character_id', characterId)
    .eq('spell_id', spellId);

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
    .select(`
      is_prepared,
      spell:spells!inner(level)
    `)
    .eq('character_id', characterId)
    .eq('is_prepared', true)
    .neq('spell.level', 0); // 排除戲法

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
    .select(`
      is_prepared,
      spell:spells!inner(level)
    `)
    .eq('character_id', characterId)
    .eq('is_prepared', true)
    .eq('spell.level', 0); // 只計算戲法

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
  updates: Partial<Omit<CharacterSpell, 'id' | 'character_id' | 'spell_id' | 'created_at' | 'spell'>>
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
 * 獲取法術的顯示值（優先使用 override 值，否則使用原始值）
 */
export function getDisplayValues(characterSpell: CharacterSpell): CharacterSpellWithDetails {
  const spell = characterSpell.spell;
  
  return {
    ...characterSpell,
    displayName: characterSpell.name_override ?? spell?.name ?? '',
    displayNameEn: characterSpell.name_en_override ?? spell?.name_en,
    displayLevel: characterSpell.level_override ?? spell?.level ?? 0,
    displayCastingTime: characterSpell.casting_time_override ?? spell?.casting_time ?? '',
    displaySchool: characterSpell.school_override ?? spell?.school ?? '塑能',
    displayConcentration: characterSpell.concentration_override ?? spell?.concentration ?? false,
    displayRitual: characterSpell.ritual_override ?? spell?.ritual ?? false,
    displayDuration: characterSpell.duration_override ?? spell?.duration ?? '',
    displayRange: characterSpell.range_override ?? spell?.range ?? '',
    displaySource: characterSpell.source_override ?? spell?.source ?? '',
    displayVerbal: characterSpell.verbal_override ?? spell?.verbal ?? false,
    displaySomatic: characterSpell.somatic_override ?? spell?.somatic ?? false,
    displayMaterial: characterSpell.material_override ?? spell?.material ?? '',
    displayDescription: characterSpell.description_override ?? spell?.description ?? ''
  };
}
