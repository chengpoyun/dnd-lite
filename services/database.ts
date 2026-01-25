import { supabase, type Character, type CombatItem } from '../lib/supabase'
import type { CharacterStats } from '../types'

// 角色資料服務
export class CharacterService {
  // 取得當前用戶的所有角色
  static async getCharacters(): Promise<Character[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.warn('用戶未登入')
        return []
      }

      const { data, error } = await supabase
        .from('characters')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('取得角色失敗:', error)
      return []
    }
  }

  // 取得特定角色（僅限當前用戶）
  static async getCharacter(id: string): Promise<Character | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.warn('用戶未登入')
        return null
      }

      const { data, error } = await supabase
        .from('characters')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('取得角色失敗:', error)
      return null
    }
  }

  // 建立新角色
  static async createCharacter(characterData: { name: string, stats: CharacterStats }): Promise<Character | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.warn('用戶未登入，無法建立角色')
        return null
      }

      const character = {
        user_id: user.id,
        name: characterData.name,
        stats: characterData.stats
      }

      const { data, error } = await supabase
        .from('characters')
        .insert([character])
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('建立角色失敗:', error)
      return null
    }
  }

  // 更新角色（僅限當前用戶）
  static async updateCharacter(id: string, updates: { name?: string, stats?: CharacterStats }): Promise<Character | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.warn('用戶未登入，無法更新角色')
        return null
      }

      const { data, error } = await supabase
        .from('characters')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('更新角色失敗:', error)
      return null
    }
  }

  // 刪除角色（僅限當前用戶）
  static async deleteCharacter(id: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.warn('用戶未登入，無法刪除角色')
        return false
      }

      const { error } = await supabase
        .from('characters')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
      
      if (error) throw error
      return true
    } catch (error) {
      console.error('刪除角色失敗:', error)
      return false
    }
  }
}

// 戰鬥項目服務
export class CombatItemService {
  // 取得角色的戰鬥項目
  static async getCombatItems(characterId: string): Promise<CombatItem[]> {
    try {
      const { data, error } = await supabase
        .from('combat_items')
        .select('*')
        .eq('character_id', characterId)
        .order('category', { ascending: true })
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('取得戰鬥項目失敗:', error)
      return []
    }
  }

  // 建立戰鬥項目
  static async createCombatItem(item: Omit<CombatItem, 'id' | 'created_at'>): Promise<CombatItem | null> {
    try {
      const { data, error } = await supabase
        .from('combat_items')
        .insert([item])
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('建立戰鬥項目失敗:', error)
      return null
    }
  }

  // 更新戰鬥項目
  static async updateCombatItem(id: string, updates: Partial<CombatItem>): Promise<CombatItem | null> {
    try {
      const { data, error } = await supabase
        .from('combat_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('更新戰鬥項目失敗:', error)
      return null
    }
  }

  // 刪除戰鬥項目
  static async deleteCombatItem(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('combat_items')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      return true
    } catch (error) {
      console.error('刪除戰鬥項目失敗:', error)
      return false
    }
  }

  // 批量更新使用次數
  static async updateUsages(items: Array<{ id: string, current_uses: number }>): Promise<boolean> {
    try {
      const updates = items.map(item => 
        supabase
          .from('combat_items')
          .update({ current_uses: item.current_uses })
          .eq('id', item.id)
      )
      
      await Promise.all(updates)
      return true
    } catch (error) {
      console.error('批量更新使用次數失敗:', error)
      return false
    }
  }
}

// 離線快取服務
export class CacheService {
  private static CACHE_PREFIX = 'dnd_cache_'
  
  // 快取角色資料
  static cacheCharacter(character: Character): void {
    localStorage.setItem(
      `${this.CACHE_PREFIX}character_${character.id}`, 
      JSON.stringify(character)
    )
  }
  
  // 取得快取的角色資料
  static getCachedCharacter(id: string): Character | null {
    try {
      const cached = localStorage.getItem(`${this.CACHE_PREFIX}character_${id}`)
      return cached ? JSON.parse(cached) : null
    } catch {
      return null
    }
  }
  
  // 快取戰鬥項目
  static cacheCombatItems(characterId: string, items: CombatItem[]): void {
    localStorage.setItem(
      `${this.CACHE_PREFIX}items_${characterId}`, 
      JSON.stringify(items)
    )
  }
  
  // 取得快取的戰鬥項目
  static getCachedCombatItems(characterId: string): CombatItem[] {
    try {
      const cached = localStorage.getItem(`${this.CACHE_PREFIX}items_${characterId}`)
      return cached ? JSON.parse(cached) : []
    } catch {
      return []
    }
  }
  
  // 清除快取
  static clearCache(pattern?: string): void {
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.startsWith(this.CACHE_PREFIX)) {
        if (!pattern || key.includes(pattern)) {
          localStorage.removeItem(key)
        }
      }
    })
  }
}