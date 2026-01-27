import { supabase } from '../lib/supabase'

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
  properties: Record<string, any>
  created_at: string
  updated_at: string
}

export interface CreateCharacterItemData {
  name: string
  description?: string
  quantity?: number
  weight?: number
  value_in_copper?: number
  item_type?: string
  is_equipped?: boolean
  properties?: Record<string, any>
}

export interface UpdateCharacterItemData {
  name?: string
  description?: string
  quantity?: number
  weight?: number
  value_in_copper?: number
  item_type?: string
  is_equipped?: boolean
  properties?: Record<string, any>
}

/**
 * 角色物品服務 - 完全使用 Database 儲存角色物品
 * 取代原本的 localStorage 實作
 */
export class CharacterItemService {
  /**
   * 獲取角色的所有物品
   */
  static async getCharacterItems(characterId: string): Promise<CharacterItem[]> {
    try {
      const { data, error } = await supabase
        .from('character_items')
        .select('*')
        .eq('character_id', characterId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('獲取角色物品失敗:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('getCharacterItems 失敗:', error)
      throw error
    }
  }

  /**
   * 新增角色物品
   */
  static async createCharacterItem(
    characterId: string, 
    itemData: CreateCharacterItemData
  ): Promise<CharacterItem | null> {
    try {
      const { data, error } = await supabase
        .from('character_items')
        .insert({
          character_id: characterId,
          name: itemData.name,
          description: itemData.description || '',
          quantity: itemData.quantity || 1,
          weight: itemData.weight || 0,
          value_in_copper: itemData.value_in_copper || 0,
          item_type: itemData.item_type || '',
          is_equipped: itemData.is_equipped || false,
          properties: itemData.properties || {},
        })
        .select()
        .single()

      if (error) {
        console.error('新增角色物品失敗:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('createCharacterItem 失敗:', error)
      return null
    }
  }

  /**
   * 更新角色物品
   */
  static async updateCharacterItem(
    itemId: string,
    updates: UpdateCharacterItemData
  ): Promise<CharacterItem | null> {
    try {
      const { data, error } = await supabase
        .from('character_items')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId)
        .select()
        .single()

      if (error) {
        console.error('更新角色物品失敗:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('updateCharacterItem 失敗:', error)
      return null
    }
  }

  /**
   * 刪除角色物品
   */
  static async deleteCharacterItem(itemId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('character_items')
        .delete()
        .eq('id', itemId)

      if (error) {
        console.error('刪除角色物品失敗:', error)
        throw error
      }

      return true
    } catch (error) {
      console.error('deleteCharacterItem 失敗:', error)
      return false
    }
  }

  /**
   * 批量更新物品數量
   */
  static async updateItemQuantities(
    updates: Array<{ id: string; quantity: number }>
  ): Promise<boolean> {
    try {
      // 使用 Promise.all 並行更新
      const updatePromises = updates.map(({ id, quantity }) =>
        supabase
          .from('character_items')
          .update({ quantity, updated_at: new Date().toISOString() })
          .eq('id', id)
      )

      const results = await Promise.all(updatePromises)
      
      // 檢查是否有任何更新失敗
      const hasError = results.some(result => result.error)
      if (hasError) {
        console.error('批量更新物品數量時發生錯誤')
        return false
      }

      return true
    } catch (error) {
      console.error('updateItemQuantities 失敗:', error)
      return false
    }
  }

  /**
   * 初始化角色預設物品
   */
  static async initializeDefaultItems(characterId: string): Promise<boolean> {
    const defaultItems: CreateCharacterItemData[] = [
      { 
        name: '探索者背包', 
        weight: 5, 
        quantity: 1, 
        description: '包含睡袋、餐具等', 
        item_type: '裝備' 
      },
      { 
        name: '火把', 
        weight: 1, 
        quantity: 10, 
        description: '照明用', 
        item_type: '消耗品' 
      },
      { 
        name: '口糧 (天)', 
        weight: 2, 
        quantity: 5, 
        description: '食物', 
        item_type: '消耗品' 
      },
      { 
        name: '治療藥水', 
        weight: 0.5, 
        quantity: 2, 
        description: '回復 2d4+2 HP', 
        item_type: '消耗品' 
      },
    ]

    try {
      // 檢查是否已有物品
      const existingItems = await this.getCharacterItems(characterId)
      if (existingItems.length > 0) {
        console.log('角色已有物品，跳過初始化')
        return true
      }

      // 批量創建預設物品
      for (const item of defaultItems) {
        await this.createCharacterItem(characterId, item)
      }

      console.log(`為角色 ${characterId} 初始化了 ${defaultItems.length} 個預設物品`)
      return true
    } catch (error) {
      console.error('初始化預設物品失敗:', error)
      return false
    }
  }
}