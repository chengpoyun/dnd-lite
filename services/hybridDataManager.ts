import { DetailedCharacterService } from './detailedCharacter'
import { CombatItemService } from './database'
import { supabase } from '../lib/supabase'
import type { FullCharacterData, Character, CharacterCombatAction, CharacterUpdateData } from '../lib/supabase'

/**
 * 資料管理器 (原 HybridDataManager)
 * 新策略：完全使用 Database，移除 localStorage 依賴
 * 所有資料直接從 DB 讀取和儲存
 */
export class HybridDataManager {
  private static cachedCharacters: Character[] | null = null
  private static cacheTimestamp: number = 0
  private static CACHE_DURATION = 10000 // 10秒緩存
  
  /**
   * 清除所有緩存（用於緊急重置）
   */
  static clearCache(): void {
    this.cachedCharacters = null
    this.cacheTimestamp = 0
    console.log('🗑️ 已清除所有緩存')
  }
  
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
   * 快速測試資料庫連接（5秒超時）
   */
  static async testDatabaseConnection(): Promise<void> {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('資料庫連接測試超時')), 5000)
      })
      
      const testPromise = supabase.from('characters').select('id').limit(1)
      await Promise.race([testPromise, timeoutPromise])
      
      console.log('✅ 資料庫連接正常')
      return true
    } catch (error) {
      console.warn('⚠️ 資料庫連接測試失敗:', error.message)
      return false
    }
  }

  /**
   * 獲取用戶所有角色（直接從 DB 讀取，帶緩存）
   */
  static async getUserCharacters(): Promise<Character[]> {
    try {
      const now = Date.now()
      
      // 檢查緩存是否有效
      if (this.cachedCharacters && (now - this.cacheTimestamp) < this.CACHE_DURATION) {
        console.log(`📋 從緩存載入 ${this.cachedCharacters.length} 個角色`)
        return this.cachedCharacters
      }
      
      console.log('🔄 從 DB 載入角色列表')
      
      // 添加超時機制（5秒）
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('載入角色列表超時（5秒）')), 5000)
      })
      
      const charactersPromise = DetailedCharacterService.getUserCharacters()
      const dbCharacters = await Promise.race([charactersPromise, timeoutPromise])
      
      // 更新緩存
      this.cachedCharacters = dbCharacters
      this.cacheTimestamp = now
      
      console.log(`✅ 成功載入 ${dbCharacters.length} 個角色`)
      return dbCharacters
    } catch (error) {
      console.error('❌ 載入角色列表失敗:', error)
      // 如果有緩存，返回緩存數據
      if (this.cachedCharacters) {
        console.log('🔄 返回緩存的角色數據')
        return this.cachedCharacters
      }
      // 超時錯誤時返回空數組，避免阻擋應用繼續運行
      console.warn('⚠️ 無緩存可用，返回空角色列表')
      return []
    }
  }

  // ===== 寫入操作 =====
  
  /**
   * 更新角色資料（直接寫入 DB）
   */
  static async updateCharacter(characterId: string, updates: CharacterUpdateData): Promise<boolean> {
    try {
      console.log(`🔄 更新角色到 DB: ${characterId}`, {
        hasCharacter: !!updates.character,
        hasAbilityScores: !!updates.abilityScores,
        hasCurrentStats: !!updates.currentStats,
        hasCurrency: !!updates.currency,
        hasSkillProficiencies: !!updates.skillProficiencies
      })
      
      let allSuccess = true
      const errors: string[] = []

      // 更新角色基本信息
      if (updates.character) {
        console.log('📝 更新角色基本信息:', updates.character)
        const success = await DetailedCharacterService.updateCharacterBasicInfo(characterId, updates.character)
        if (!success) {
          allSuccess = false
          errors.push('角色基本信息更新失敗')
        }
      }

      // 更新屬性值
      if (updates.abilityScores) {
        console.log('💪 更新屬性值')
        const success = await DetailedCharacterService.updateAbilityScores(characterId, updates.abilityScores)
        if (!success) {
          allSuccess = false
          errors.push('屬性值更新失敗')
        }
      }

      // 更新當前狀態
      if (updates.currentStats) {
        console.log('❤️ 更新當前狀態')
        const success = await DetailedCharacterService.updateCurrentStats(characterId, updates.currentStats)
        if (!success) {
          allSuccess = false
          errors.push('當前狀態更新失敗')
        }
      }

      // 更新貨幣
      if (updates.currency) {
        console.log('💰 更新貨幣')
        const success = await DetailedCharacterService.updateCurrency(characterId, updates.currency)
        if (!success) {
          allSuccess = false
          errors.push('貨幣更新失敗')
        }
      }

      // 更新技能熟練度
      if (updates.skillProficiencies) {
        console.log('🎯 更新技能熟練度', {
          skillCount: updates.skillProficiencies.length,
          isArray: Array.isArray(updates.skillProficiencies),
          skillData: updates.skillProficiencies
        })
        
        if (Array.isArray(updates.skillProficiencies)) {
          // 使用 upsert 方式更新技能，不清空所有記錄
          console.log('📝 使用陣列格式更新技能 - 逐個 upsert')
          
          let insertErrors = []
          for (const skill of updates.skillProficiencies) {
            console.log(`🎯 Upsert 技能: ${skill.skill_name} = ${skill.proficiency_level}`)
            try {
              if (skill.proficiency_level > 0) {
                // 有熟練度，插入或更新
                const success = await DetailedCharacterService.upsertSkillProficiency(
                  characterId, 
                  skill.skill_name, 
                  skill.proficiency_level
                )
                if (!success) {
                  insertErrors.push(`技能 ${skill.skill_name} upsert失敗`)
                }
              } else {
                // 無熟練度，刪除記錄
                const success = await DetailedCharacterService.deleteSkillProficiency(
                  characterId, 
                  skill.skill_name
                )
                if (!success) {
                  console.warn(`技能 ${skill.skill_name} 刪除失敗，但不影響整體更新`)
                }
              }
            } catch (insertError: any) {
              console.warn(`技能 ${skill.skill_name} 處理出錯:`, insertError)
              insertErrors.push(`技能 ${skill.skill_name} 處理失敗: ${insertError.message}`)
            }
          }
          
          if (insertErrors.length === 0) {
            console.log('✅ 技能熟練度陣列格式更新完成')
          } else {
            console.warn('❌ 部分技能更新失敗:', insertErrors)
            allSuccess = false
            errors.push(...insertErrors)
          }
        } else {
          // 如果是 Record<string, number> 格式，使用舊邏輯
          console.log('📝 使用物件格式更新技能')
          for (const [skillName, level] of Object.entries(updates.skillProficiencies)) {
            console.log(`🎯 更新技能: ${skillName} = ${level}`)
            const success = await DetailedCharacterService.updateSkillProficiency(characterId, skillName, level)
            if (!success) {
              allSuccess = false
              errors.push(`技能 ${skillName} 更新失敗`)
            }
          }
          console.log('✅ 技能熟練度物件格式更新完成')
        }
      }

      // 更新豁免檢定熟練度 - 添加重試邏輯
      if (updates.savingThrows) {
        console.log('🛡️ 更新豁免檢定熟練度', {
          savingThrowsCount: updates.savingThrows.length,
          savingThrowsData: updates.savingThrows
        })
        const proficiencies = updates.savingThrows.map(st => st.ability)
        console.log('🛡️ 提取的豁免能力值:', proficiencies)
        
        let retryCount = 0
        const maxRetries = 3
        let savingThrowSuccess = false
        
        while (retryCount < maxRetries) {
          try {
            const success = await DetailedCharacterService.updateSavingThrowProficiencies(characterId, proficiencies)
            if (success) {
              console.log('✅ 豁免檢定熟練度更新成功')
              savingThrowSuccess = true
              break
            } else {
              throw new Error('豁免檢定熟練度更新返回 false')
            }
          } catch (error: any) {
            console.error(`豁免檢定更新重試 ${retryCount + 1} 失敗:`, error)
            if (error.code === '23505' && retryCount < maxRetries - 1) {
              // 重複鍵錯誤，重試
              console.log(`❌ 豁免檢定重複鍵錯誤，重試 (${retryCount + 1}/${maxRetries})`)
              retryCount++
              await new Promise(resolve => setTimeout(resolve, 100 * retryCount))
              continue
            } else if (retryCount < maxRetries - 1) {
              retryCount++
              await new Promise(resolve => setTimeout(resolve, 100 * retryCount))
              continue
            } else {
              break // 最後一次重試失敗
            }
          }
        }
        
        if (!savingThrowSuccess) {
          allSuccess = false
          errors.push('豁免檢定熟練度更新失敗')
        }
      }

      if (allSuccess) {
        console.log(`✅ 角色更新成功: ${characterId}`)
        // 清除角色列表緩存，因為數據已更新
        this.cachedCharacters = null
        // 清除該角色的詳細資料緩存
        DetailedCharacterService.clearCharacterCache(characterId)
        return true
      } else {
        console.error(`❌ 部分角色更新失敗: ${characterId}`, errors)
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

  // 單獨更新技能熟練度的專用方法
  static async updateSingleSkillProficiency(characterId: string, skillName: string, level: number): Promise<boolean> {
    try {
      console.log(`🎯 單獨更新技能熟練度: ${skillName} = ${level} (角色: ${characterId})`)
      
      if (level > 0) {
        // 有熟練度，使用 upsert
        const success = await DetailedCharacterService.upsertSkillProficiency(characterId, skillName, level)
        if (success) {
          console.log(`✅ 技能 ${skillName} 更新為 ${level}`)
        } else {
          console.error(`❌ 技能 ${skillName} 更新失敗`)
        }
        return success
      } else {
        // 無熟練度，刪除記錄
        const success = await DetailedCharacterService.deleteSkillProficiency(characterId, skillName)
        if (success) {
          console.log(`✅ 技能 ${skillName} 已清除`)
        } else {
          console.warn(`⚠️ 技能 ${skillName} 清除失敗，但不影響整體操作`)
        }
        return success
      }
    } catch (error) {
      console.error(`❌ 單獨更新技能熟練度失敗 ${skillName}:`, error)
      return false
    }
  }
}