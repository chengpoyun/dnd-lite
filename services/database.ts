import { supabase, type Character, type CharacterCombatAction as CombatItem, type DefaultCombatAction } from '../lib/supabase'
import type { CharacterStats } from '../types'
import { getSpellSlotsForCasterLevel } from '../utils/spellSlots'

// 廢棄的 CharacterService 已移除，請使用 DetailedCharacterService

// 戰鬥項目服務
export class CombatItemService {
  // 獲取預設戰鬥項目
  static async getDefaultCombatItems(): Promise<DefaultCombatAction[]> {
    try {
      const { data, error } = await supabase
        .from('default_combat_actions')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true })

      if (error) {
        console.error('獲取預設戰鬥項目失敗:', error)
        throw new Error(`獲取失敗：${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('獲取預設戰鬥項目失敗:', error)
      throw error
    }
  }

  // 取得角色的戰鬥項目（合併預設項目和角色自定義項目）
  static async getCombatItems(characterId: string): Promise<CombatItem[]> {
    try {
      // 驗證 characterId 格式
      if (!characterId || typeof characterId !== 'string') {
        throw new Error('無效的角色ID格式')
      }

      // 並行獲取預設項目和角色專屬項目
      const [defaultItemsResult, characterItemsResult] = await Promise.all([
        supabase.from('default_combat_actions').select('*').order('category'),
        supabase.from('character_combat_actions')
          .select('*')
          .eq('character_id', characterId)
          .order('category', { ascending: true })
      ])

      if (defaultItemsResult.error) {
        console.error('獲取預設戰鬥項目失敗:', defaultItemsResult.error)
        throw new Error(`獲取預設項目失敗：${defaultItemsResult.error.message}`)
      }

      if (characterItemsResult.error) {
        // 根據錯誤類型提供不同的錯誤訊息
        if (characterItemsResult.error.code === '22P02') {
          throw new Error(`角色ID格式錯誤：${characterId} 不是有效的UUID格式`)
        }
        if (characterItemsResult.error.code === '42501') {
          throw new Error('權限不足，無法存取戰鬥資料')
        }
        throw new Error(`資料庫錯誤：${characterItemsResult.error.message}`)
      }

      const defaultItems = defaultItemsResult.data || []
      const characterItems = characterItemsResult.data || []

      // 建立已被角色修改的預設項目映射
      const modifiedDefaultItems = new Map<string, CombatItem>()
      const customItems: CombatItem[] = []

      characterItems.forEach(item => {
        if (item.is_custom) {
          // 完全自定義的項目
          customItems.push(item)
        } else if (item.default_item_id) {
          // 基於預設項目的修改
          modifiedDefaultItems.set(item.default_item_id, item)
        }
      })

      // 合併結果：預設項目（除非被修改）+ 修改過的預設項目 + 自定義項目
      const mergedItems: CombatItem[] = []

      // 添加預設項目（如果沒有被角色修改）
      defaultItems.forEach(defaultItem => {
        const modifiedItem = modifiedDefaultItems.get(defaultItem.id)
        if (modifiedItem) {
          // 使用修改過的版本
          mergedItems.push(modifiedItem)
        } else {
          // 使用預設版本，轉換為CombatItem格式
          mergedItems.push({
            id: `default_${defaultItem.id}`, // 使用特殊前綴標識預設項目
            character_id: characterId,
            category: defaultItem.category,
            name: defaultItem.name,
            icon: defaultItem.icon || '',
            description: defaultItem.description,
            max_uses: defaultItem.max_uses,
            current_uses: defaultItem.max_uses, // 預設項目當前使用次數等於最大次數
            recovery_type: defaultItem.recovery_type,
            is_default: true,
            is_custom: false,
            default_item_id: defaultItem.id,
            action_type: defaultItem.action_type,
            damage_formula: defaultItem.damage_formula,
            attack_bonus: defaultItem.attack_bonus,
            save_dc: defaultItem.save_dc,
            created_at: defaultItem.created_at,
            updated_at: defaultItem.updated_at
          })
        }
      })

      // 添加完全自定義的項目
      mergedItems.push(...customItems)

      return mergedItems
    } catch (error) {
      console.error('取得戰鬥項目失敗:', error)
      // 如果是網路錯誤，返回空陣列以便使用預設資料
      if (error instanceof Error && error.message.includes('fetch')) {
        console.warn('網路連接問題，使用預設資料')
        return []
      }
      throw error // 重新拋出錯誤以便UI處理
    }
  }

  /**
   * 依角色的合併施法者等級，同步「N環法術位」職業資源項目：
   * - 尚未取得的環位（basic=0）不建立項目。
   * - 已取得但等級變動時，更新 max_uses_basic 並保留使用者手動加值（max_uses_bonus）；
   *   max_uses 維持 basic+bonus，current_uses 隨 basic 的變動量同步增減（clamp 於 [0, max]）。
   * - basic 與圖示皆沒有變動時不寫入資料庫；圖示與範本不同（例如範本圖示調整過）時會自動修正。
   */
  static async syncSpellSlotResources(characterId: string, casterLevel: number): Promise<void> {
    try {
      const basics = getSpellSlotsForCasterLevel(casterLevel)

      const { data: templates, error: templateError } = await supabase
        .from('default_combat_actions')
        .select('*')
        .not('spell_level', 'is', null)

      if (templateError) {
        console.error('讀取法術位範本失敗:', templateError)
        return
      }

      const templateList = (templates || []) as DefaultCombatAction[]
      if (templateList.length === 0) return

      const templateIds = templateList.map(t => t.id)

      const { data: existingRows, error: existingError } = await supabase
        .from('character_combat_actions')
        .select('*')
        .eq('character_id', characterId)
        .in('default_item_id', templateIds)

      if (existingError) {
        console.error('讀取角色法術位資料失敗:', existingError)
        return
      }

      const existingByTemplateId = new Map<string, CombatItem>()
      ;(existingRows || []).forEach((row: CombatItem) => {
        if (row.default_item_id) existingByTemplateId.set(row.default_item_id, row)
      })

      for (const tmpl of templateList) {
        const level = tmpl.spell_level
        if (!level || level < 1 || level > 9) continue

        const newBasic = basics[level - 1] ?? 0
        const existing = existingByTemplateId.get(tmpl.id)

        if (!existing) {
          if (newBasic > 0) {
            const { error } = await supabase.from('character_combat_actions').insert([{
              character_id: characterId,
              category: 'resource',
              name: tmpl.name,
              icon: tmpl.icon,
              max_uses: newBasic,
              current_uses: newBasic,
              max_uses_basic: newBasic,
              max_uses_bonus: 0,
              recovery_type: 'long_rest',
              is_default: false,
              is_custom: false,
              default_item_id: tmpl.id,
            }])
            if (error) console.error(`建立${tmpl.name}失敗:`, error)
          }
          continue
        }

        const oldBasic = existing.max_uses_basic ?? 0
        const iconOutdated = existing.icon !== tmpl.icon
        if (newBasic === oldBasic && !iconOutdated) continue

        const bonus = existing.max_uses_bonus ?? 0
        const delta = newBasic - oldBasic
        const newMax = Math.max(0, newBasic + bonus)
        const newCurrent = Math.min(newMax, Math.max(0, existing.current_uses + delta))

        const { error } = await supabase
          .from('character_combat_actions')
          .update({ max_uses: newMax, max_uses_basic: newBasic, current_uses: newCurrent, icon: tmpl.icon })
          .eq('id', existing.id)
        if (error) console.error(`更新${tmpl.name}失敗:`, error)
      }
    } catch (error) {
      console.error('同步法術位資源失敗:', error)
    }
  }

  // 創建基於預設項目的角色專屬修改版本
  static async createModifiedDefaultItem(characterId: string, defaultItemId: string, modifications: Partial<CombatItem>): Promise<CombatItem | null> {
    try {
      // 獲取預設項目
      const { data: defaultItem, error: defaultError } = await supabase
        .from('default_combat_actions')
        .select('*')
        .eq('id', defaultItemId)
        .single()

      if (defaultError) {
        throw new Error(`無法找到預設項目：${defaultError.message}`)
      }

      // 創建基於預設項目的修改版本
      const modifiedItem = {
        character_id: characterId,
        category: modifications.category || defaultItem.category,
        name: modifications.name || defaultItem.name,
        icon: modifications.icon || defaultItem.icon,
        description: modifications.description || defaultItem.description,
        max_uses: modifications.max_uses ?? defaultItem.max_uses,
        current_uses: modifications.current_uses ?? defaultItem.max_uses,
        recovery_type: modifications.recovery_type || defaultItem.recovery_type,
        is_default: false, // 這是修改過的版本
        is_custom: false, // 不是完全自定義的
        default_item_id: defaultItemId,
        action_type: modifications.action_type || defaultItem.action_type,
        damage_formula: modifications.damage_formula || defaultItem.damage_formula,
        attack_bonus: modifications.attack_bonus ?? defaultItem.attack_bonus,
        save_dc: modifications.save_dc ?? defaultItem.save_dc
      }

      const { data, error } = await supabase
        .from('character_combat_actions')
        .insert([modifiedItem])
        .select()
        .single()

      if (error) {
        console.error('創建修改版預設項目失敗:', error)
        throw new Error(`創建失敗：${error.message}`)
      }

      return data
    } catch (error) {
      console.error('創建修改版預設項目失敗:', error)
      throw error
    }
  }

  // 建立戰鬥項目
  static async createCombatItem(item: Omit<CombatItem, 'id' | 'created_at'>): Promise<CombatItem | null> {
    try {
      // 驗證必要欄位
      if (!item.character_id) {
        throw new Error('缺少角色ID')
      }
      if (!item.name || !item.category) {
        throw new Error('缺少必要欄位：名稱或類別')
      }
      
      // 調試：檢查認證狀態和角色所有權
      console.log('=== 戰鬥項目創建調試 ===');
      console.log('角色ID:', item.character_id);
      
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id;
      console.log('當前用戶ID:', currentUserId || 'null (匿名)');
      
      // 檢查角色所有權
      const { data: character, error: charError } = await supabase
        .from('characters')
        .select('id, user_id, anonymous_id, is_anonymous')
        .eq('id', item.character_id)
        .single();
      
      if (charError) {
        console.error('查詢角色失敗:', charError);
        throw new Error(`無法查詢角色：${charError.message}`);
      }
      
      console.log('角色信息:', {
        id: character.id,
        user_id: character.user_id,
        anonymous_id: character.anonymous_id,
        is_anonymous: character.is_anonymous
      });
      
      // 檢查所有權邏輯
      if (character.is_anonymous) {
        console.log('匿名角色 - RLS策略將允許所有匿名用戶訪問');
        if (!character.anonymous_id) {
          console.warn('匿名角色缺少匿名ID - 這可能會造成問題');
        }
      } else {
        console.log('登錄用戶角色 - 檢查用戶ID匹配');
        if (!currentUserId) {
          throw new Error('需要登錄才能操作非匿名角色');
        }
        if (character.user_id !== currentUserId) {
          throw new Error('角色所有權不匹配');
        }
        console.log('用戶ID匹配，應該可以操作');
      }
      
      console.log('嘗試插入戰鬥項目...');
      const { data, error } = await supabase
        .from('character_combat_actions')
        .insert([item])
        .select()
        .single()
      
      if (error) {
        console.error('插入戰鬥項目失敗:', error);
        console.error('錯誤詳情:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        
        if (error.code === '22P02') {
          throw new Error(`角色ID格式錯誤：${item.character_id} 不是有效的UUID格式`)
        }
        if (error.code === '23505') {
          throw new Error('戰鬥項目已存在')
        }
        if (error.code === '42501') {
          throw new Error('權限不足，無法建立戰鬥項目。請檢查RLS策略配置。')
        }
        throw new Error(`建立失敗：${error.message}`)
      }
      
      console.log('戰鬥項目創建成功:', data);
      console.log('=== 調試結束 ===');
      return data
    } catch (error) {
      console.error('建立戰鬥項目失敗:', error)
      // 在這裡不返回null，而是重新拋出錯誤讓上層處理
      throw error
    }
  }

  // 更新戰鬥項目（智能處理預設項目的修改）
  static async updateCombatItem(itemId: string, updates: Partial<CombatItem>): Promise<CombatItem | null> {
    try {
      // 檢查是否為預設項目（ID以default_開頭）
      if (itemId.startsWith('default_')) {
        // 這是對預設項目的首次修改，需要創建角色專屬版本
        const defaultItemId = itemId.replace('default_', '')
        const characterId = updates.character_id
        
        if (!characterId) {
          throw new Error('修改預設項目時需要提供角色ID')
        }

        // 創建基於預設項目的修改版本
        return await this.createModifiedDefaultItem(characterId, defaultItemId, updates)
      } else {
        // 普通的項目更新
        const { data, error } = await supabase
          .from('character_combat_actions')
          .update(updates)
          .eq('id', itemId)
          .select()
          .single()

        if (error) {
          console.error('更新戰鬥項目失敗:', error)
          throw new Error(`更新失敗：${error.message}`)
        }

        return data
      }
    } catch (error) {
      console.error('更新戰鬥項目失敗:', error)
      throw error
    }
  }

  // 刪除戰鬥項目
  static async deleteCombatItem(itemId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('character_combat_actions')
        .delete()
        .eq('id', itemId)

      if (error) {
        console.error('刪除戰鬥項目失敗:', error)
        throw new Error(`刪除失敗：${error.message}`)
      }

      return true
    } catch (error) {
      console.error('刪除戰鬥項目失敗:', error)
      throw error
    }
  }

  // 批量更新使用次數
  static async updateUsages(items: Array<{ id: string, current_uses: number }>): Promise<boolean> {
    try {
      const updates = items.map(item => 
        supabase
          .from('character_combat_actions')
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