import { createClient } from '@supabase/supabase-js'

// Supabase 設定
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// 建立 Supabase 客戶端
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 詳細資料庫類型定義
export interface Character {
  id: string
  user_id: string | null
  anonymous_id: string | null
  name: string
  character_class: string
  level: number
  experience: number
  avatar_url?: string | null
  is_anonymous: boolean
  created_at?: string
  updated_at?: string
}

export interface CharacterAbilityScores {
  id: string
  character_id: string
  strength: number
  dexterity: number
  constitution: number
  intelligence: number
  wisdom: number
  charisma: number
  // 屬性值額外加成（裝備/魔法效果）
  strength_bonus?: number
  dexterity_bonus?: number
  constitution_bonus?: number
  intelligence_bonus?: number
  wisdom_bonus?: number
  charisma_bonus?: number
  // 調整值額外加成（裝備/魔法效果）
  strength_modifier_bonus?: number
  dexterity_modifier_bonus?: number
  constitution_modifier_bonus?: number
  intelligence_modifier_bonus?: number
  wisdom_modifier_bonus?: number
  charisma_modifier_bonus?: number
  updated_at?: string
}

export interface CharacterSavingThrow {
  id: string
  character_id: string
  ability: 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma'
  is_proficient: boolean
  updated_at?: string
}

export interface CharacterSkillProficiency {
  id: string
  character_id: string
  skill_name: string
  proficiency_level: number // 0: 無熟練, 1: 熟練, 2: 專精
  updated_at?: string
}

export interface UserSettings {
  id: string
  user_id: string
  last_character_id?: string | null
  supabase_test_completed?: boolean
  created_at: string
  updated_at: string
}

export interface CharacterCurrentStats {
  id: string
  character_id: string
  current_hp: number
  max_hp: number
  temporary_hp: number
  current_hit_dice: number
  total_hit_dice: number
  hit_die_type: string
  armor_class: number
  initiative_bonus: number
  speed: number
  spell_attack_bonus: number
  spell_save_dc: number
  weapon_attack_bonus?: number
  weapon_damage_bonus?: number
  extra_data?: {
    downtime?: number
    renown?: { used: number; total: number }
    prestige?: { org: string; level: number; rankName: string }
    customRecords?: Array<{ id: string; name: string; value: string; note?: string }>
    attacks?: Array<{ name: string; bonus: number; damage: string; type: string }>
  }
  updated_at?: string
}

export interface CharacterCurrency {
  id: string
  character_id: string
  copper: number
  silver: number
  electrum: number
  gp: number
  platinum: number
  updated_at?: string
}

export interface CharacterCombatAction {
  id: string
  character_id: string
  category: 'action' | 'bonus_action' | 'reaction' | 'resource'
  name: string
  icon: string
  description?: string
  max_uses: number
  current_uses: number
  recovery_type: 'turn' | 'short_rest' | 'long_rest' | 'manual'
  is_default: boolean
  is_custom: boolean // 新增：是否為完全自定義項目
  default_item_id?: string // 新增：關聯的預設項目ID
  action_type?: string
  damage_formula?: string
  attack_bonus?: number
  save_dc?: number
  created_at?: string
  updated_at?: string
}

// ===== 兼職系統類型 =====
export interface CharacterClass {
  id: string
  character_id: string
  class_name: string
  class_level: number
  hit_die: 'd4' | 'd6' | 'd8' | 'd10' | 'd12'
  is_primary: boolean
  created_at?: string
  updated_at?: string
}

export interface CharacterHitDicePools {
  id: string
  character_id: string
  d12_current: number
  d12_total: number
  d10_current: number
  d10_total: number
  d8_current: number
  d8_total: number
  d6_current: number
  d6_total: number
  updated_at?: string
}

// 新增：預設戰鬥動作類型
export interface DefaultCombatAction {
  id: string
  category: 'action' | 'bonus_action' | 'reaction' | 'resource'
  name: string
  icon: string
  description?: string
  max_uses: number
  recovery_type: 'turn' | 'short_rest' | 'long_rest' | 'manual'
  action_type?: string
  damage_formula?: string
  attack_bonus?: number
  save_dc?: number
  created_at?: string
  updated_at?: string
}

// 複合類型：完整的角色資料（用於前端顯示）
export interface FullCharacterData {
  character: Character
  abilityScores: CharacterAbilityScores
  savingThrows: CharacterSavingThrow[]
  skillProficiencies: CharacterSkillProficiency[]
  currentStats: CharacterCurrentStats
  currency: CharacterCurrency
  combatActions: CharacterCombatAction[]
  classes?: CharacterClass[]  // 新增：職業列表（可選，向後兼容）
  hitDicePools?: CharacterHitDicePools  // 新增：生命骰池（可選，向後兼容）
}

// 更新專用類型：用於部分更新角色資料
export interface CharacterUpdateData {
  character?: Partial<Character>
  abilityScores?: Partial<CharacterAbilityScores>
  savingThrows?: Omit<CharacterSavingThrow, 'id'>[]
  skillProficiencies?: Record<string, number> | CharacterSkillProficiency[] | Omit<CharacterSkillProficiency, 'id'>[]
  currentStats?: Partial<CharacterCurrentStats>
  currency?: Partial<CharacterCurrency>
  combatActions?: CharacterCombatAction[]
}

// 戰鬥追蹤系統類型定義
export interface CombatSession {
  id: string
  session_code: string
  user_id: string | null
  anonymous_id: string | null
  created_at: string
  last_updated: string
  is_active: boolean
}

export interface CombatMonster {
  id: string
  session_code: string
  monster_number: number
  name: string
  ac_min: number
  ac_max: number | null
  max_hp: number | null
  total_damage: number
  is_dead: boolean
  resistances: Record<string, ResistanceType>
  created_at: string
}

export type ResistanceType = 'normal' | 'resistant' | 'vulnerable' | 'immune'

export interface CombatDamageLog {
  id: string
  monster_id: string
  damage_value: number
  damage_type: string
  resistance_type: ResistanceType
  created_at: string
}

// 特殊能力系統類型定義
export interface Ability {
  id: string
  name: string
  name_en: string | null  // 修改：英文名稱改為可選
  description: string
  source: '種族' | '職業' | '專長' | '背景' | '其他'
  recovery_type: '常駐' | '短休' | '長休'
  created_at?: string
  updated_at?: string
}

export interface CharacterAbility {
  id: string
  character_id: string
  ability_id: string | null
  current_uses: number
  max_uses: number
  /** 顯示順序（愈小愈前面）；null 時依 created_at 排 */
  sort_order?: number | null
  // 覆蓋欄位（可選，用於客製化）
  name_override?: string | null
  name_en_override?: string | null
  description_override?: string | null
  source_override?: '種族' | '職業' | '專長' | '背景' | '其他' | null
  recovery_type_override?: '常駐' | '短休' | '長休' | null
  created_at?: string
  updated_at?: string
}

// 組合類型：包含能力詳情的角色能力
export interface CharacterAbilityWithDetails extends CharacterAbility {
  ability: Ability | null
  // 便利方法：取得實際顯示的值（優先使用 override）
  displayName?: string
  displayNameEn?: string | null
  displayDescription?: string
  displaySource?: '種族' | '職業' | '專長' | '背景' | '其他'
  displayRecoveryType?: '常駐' | '短休' | '長休'
}

// 組合類型：包含傷害記錄的怪物
export interface CombatMonsterWithLogs extends CombatMonster {
  damage_logs: CombatDamageLog[]
}

// 從現有類型導入（向後相容）
import type { CharacterStats } from '../types'