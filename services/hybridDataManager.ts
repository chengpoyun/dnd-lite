import { DetailedCharacterService } from './detailedCharacter'
import { CombatItemService } from './database'
import type { FullCharacterData, Character, CharacterCombatAction, CharacterUpdateData } from '../lib/supabase'

/**
 * 資料管理器 (原 HybridDataManager)
 * 新策略：完全使用 Database，移除 localStorage 依賴
 * 所有資料直接從 DB 讀取和儲存
 */
export class HybridDataManager {
  
  // ===== 讀取操作 =====
  
  /**
   * 獲取角色完整資料（直接從 DB 讀取）
   */
  static async getCharacter(characterId: string): Promise<FullCharacterData | null> {
    try {
      console.log(`從 DB 載入角色: ${characterId}`)
      const dbData = await DetailedCharacterService.getFullCharacter(characterId)
      
      if (dbData) {
        console.log(`成功載入角色: ${dbData.character.name}`)
        return dbData
      }
      
      console.warn(`角色 ${characterId} 不存在`)
      return null
    } catch (error) {
      console.error('載入角色失敗:', error)
      return null
    }
  }
  
  /**
   * 獲取用戶所有角色（直接從 DB 讀取）
   */
  static async getUserCharacters(): Promise<Character[]> {
    try {
      console.log('從 DB 載入角色列表')
      const dbCharacters = await DetailedCharacterService.getUserCharacters()
      console.log(`成功載入 ${dbCharacters.length} 個角色`)
      return dbCharacters
    } catch (error) {
      console.error('載入角色列表失敗:', error)
      return []
    }
  }

  // ===== 寫入操作 =====
  
  /**
   * 更新角色資料（直接寫入 DB）
   */
  static async updateCharacter(characterId: string, updates: CharacterUpdateData): Promise<boolean> {
    try {
      console.log(`更新角色到 DB: ${characterId}`)
      
      // 直接寫入 DB
      const success = await DetailedCharacterService.updateCharacter(characterId, updates)
      
      if (success) {
        console.log(`角色更新成功: ${characterId}`)
        return true
      } else {
        console.error('角色更新失敗')
        return false
      }
    } catch (error) {
      console.error('更新角色失敗:', error)
      return false
    }
  }
  
  /**
   * 創建新角色（直接寫入 DB）
   */
  static async createCharacter(characterData: {
    name: string
    class: string
    level?: number
  }): Promise<FullCharacterData | null> {
    try {
      console.log(`創建新角色: ${characterData.name}`)
      
      // 創建 DB 記錄
      const fullData = await DetailedCharacterService.createCharacter(characterData)
      if (!fullData) return null
      
      console.log(`新角色創建成功: ${fullData.character.name}`)
      return fullData
    } catch (error) {
      console.error('創建角色失敗:', error)
      return null
    }
  }
  
  /**
   * 刪除角色（直接從 DB 刪除）
   */
  static async deleteCharacter(characterId: string): Promise<boolean> {
    try {
      console.log(`刪除角色: ${characterId}`)
      
      // TODO: 實作 DetailedCharacterService.deleteCharacter 方法
      console.log(`角色 ${characterId} 標記為刪除（DB 刪除功能待實作）`)
      
      return true
    } catch (error) {
      console.error('刪除角色失敗:', error)
      return false
    }
  }
  
  // ===== 戰鬥項目操作 =====
  
  /**
   * 獲取角色戰鬥項目（直接從 DB 讀取）
   */
  static async getCombatItems(characterId: string): Promise<CharacterCombatAction[]> {
    try {
      console.log(`從 DB 載入戰鬥項目: ${characterId}`)
      const items = await CombatItemService.getCombatItems(characterId)
      console.log(`成功載入 ${items.length} 個戰鬥項目`)
      return items
    } catch (error) {
      console.error('載入戰鬥項目失敗:', error)
      return []
    }
  }
  
  /**
   * 更新戰鬥項目（直接寫入 DB）
   */
  static async updateCombatItem(itemId: string, updates: Partial<CharacterCombatAction>): Promise<boolean> {
    try {
      console.log(`更新戰鬥項目到 DB: ${itemId}`)
      await CombatItemService.updateCombatItem(itemId, updates)
      console.log(`戰鬥項目更新成功: ${itemId}`)
      return true
    } catch (error) {
      console.error('更新戰鬥項目失敗:', error)
      return false
    }
  }
  
  /**
   * 創建戰鬥項目（直接寫入 DB）
   */
  static async createCombatItem(itemData: Omit<CharacterCombatAction, 'id' | 'created_at'>): Promise<CharacterCombatAction | null> {
    try {
      console.log(`創建戰鬥項目到 DB: ${itemData.name}`)
      const newItem = await CombatItemService.createCombatItem(itemData)
      if (newItem) {
        console.log(`戰鬥項目創建成功: ${newItem.name}`)
      }
      return newItem
    } catch (error) {
      console.error('創建戰鬥項目失敗:', error)
      return null
    }
  }
}