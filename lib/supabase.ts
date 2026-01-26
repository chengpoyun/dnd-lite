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

export interface CharacterItem {
  id: string
  character_id: string
  name: string
  description?: string
  quantity: number
  weight: number
  value_in_copper: number
  item_type?: string
  is_equipped: boolean
  properties?: Record<string, any>
  created_at?: string
  updated_at?: string
}

export interface CharacterSpell {
  id: string
  character_id: string
  name: string
  level: number
  school: string
  casting_time: string
  range_distance: string
  components: string
  duration: string
  description: string
  is_prepared: boolean
  is_ritual: boolean
  source?: string
  created_at?: string
  updated_at?: string
}

export interface CharacterSpellSlot {
  id: string
  character_id: string
  spell_level: number
  total_slots: number
  used_slots: number
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
  items: CharacterItem[]
  spells: CharacterSpell[]
  spellSlots: CharacterSpellSlot[]
  combatActions: CharacterCombatAction[]
}

// 從現有類型導入（向後相容）
import type { CharacterStats } from '../types'