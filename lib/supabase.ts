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
  classes: CharacterClass[]  // 新增：職業列表
  hitDicePools: CharacterHitDicePools  // 新增：生命骰池
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

// 從現有類型導入（向後相容）
import type { CharacterStats } from '../types'