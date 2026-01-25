import { createClient } from '@supabase/supabase-js'

// Supabase 設定
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// 建立 Supabase 客戶端
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 資料庫類型定義
export interface Character {
  id: string
  user_id?: string
  name: string
  stats: CharacterStats
  created_at?: string
  updated_at?: string
}

export interface CombatItem {
  id: string
  character_id: string
  category: 'action' | 'bonus' | 'reaction' | 'resource'
  name: string
  icon: string
  max_uses: number
  current_uses: number
  recovery: 'round' | 'short' | 'long'
  is_default: boolean
  created_at?: string
}

// 從現有類型導入
import type { CharacterStats } from '../types'