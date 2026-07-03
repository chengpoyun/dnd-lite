import { DetailedCharacterService } from './detailedCharacter'
import { CombatItemService } from './database'
import { supabase } from '../lib/supabase'
import type { FullCharacterData, Character, CharacterCombatAction, CharacterCurrentStats, CharacterUpdateData } from '../lib/supabase'

/**
 * 資料管理器 (原 HybridDataManager)
 * 新策略：完全使用 Database，移除 localStorage 依賴
 * 所有資料直接從 DB 讀取和儲存
 */
export class HybridDataManager {
  private static cachedCharacters: Character[] | null = null
  private static cacheTimestamp: number = 0
  private static connectionTestCache = { lastTest: 0, isConnected: false }
  private static CACHE_DURATION = 60000 // 60秒緩存（提升到 1 分鐘）
  private static isPreloading = false // 防止重複預載
  
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
  static async getCharacter(
    characterId: string,
    userContext?: { isAuthenticated: boolean, userId?: string, anonymousId?: string }
  ): Promise<FullCharacterData | null> {
    try {
      const dbData = await DetailedCharacterService.getFullCharacter(characterId, userContext)
      
      if (dbData) {
        return dbData
      }
      
      console.warn(`角色 ${characterId} 不存在`)
      return null
    } catch (error) {
      console.error('❌ 載入角色失敗:', error?.message || error)
      return null
    }
  }
  
  /**
   * 快速測試資料庫連接（5秒超時）
   */
  static async testDatabaseConnection(): Promise<boolean> {
    const now = Date.now()
    
    // 如果最近測試過且成功，直接返回緩存結果
    if (now - this.connectionTestCache.lastTest < 5000 && this.connectionTestCache.isConnected) {
      return true
    }
    
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('資料庫連接測試超時')), 5000)
      })
      
      const testPromise = supabase.from('characters').select('id').limit(1)
      await Promise.race([testPromise, timeoutPromise])
      
      // 更新緩存
      this.connectionTestCache.lastTest = now
      this.connectionTestCache.isConnected = true
      
      return true
    } catch (error) {
      this.connectionTestCache.lastTest = now
      this.connectionTestCache.isConnected = false
      console.warn('⚠️ 資料庫連接測試失敗:', error.message)
      return false
    }
  }

  /**
   * 獲取用戶所有角色（直接從 DB 讀取，帶緩存）
   */
  static async getUserCharacters(userContext?: {
    isAuthenticated: boolean,
    userId?: string,
    anonymousId?: string
  }): Promise<Character[]> {
    const startTime = performance.now()
    console.log('⏱️ HybridDataManager.getUserCharacters() 開始')
    
    try {
      const now = Date.now()
      
      // 檢查緩存是否有效
      const cacheCheckStart = performance.now()
      if (this.cachedCharacters && (now - this.cacheTimestamp) < this.CACHE_DURATION) {
        const cacheAge = ((now - this.cacheTimestamp) / 1000).toFixed(1)
        const cacheTime = performance.now() - cacheCheckStart
        console.log(`⚡ 使用緩存 (${cacheAge}秒前): ${cacheTime.toFixed(1)}ms`)
        return this.cachedCharacters
      }
      const cacheTime = performance.now() - cacheCheckStart
      console.log(`⏱️ 緩存檢查: ${cacheTime.toFixed(1)}ms${this.cachedCharacters ? ' (已過期)' : ' (無緩存)'}`)
      
      // 傳入用戶上下文，避免重複認證檢查
      // 加入超時保護，避免請求長時間卡住
      const serviceCallStart = performance.now()
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('載入角色列表超時')), 8000)
      })
      const dbCharacters = await Promise.race([
        DetailedCharacterService.getUserCharacters(userContext),
        timeoutPromise
      ])
      const serviceTime = performance.now() - serviceCallStart
      console.log(`⏱️ DetailedCharacterService 調用: ${serviceTime.toFixed(1)}ms`)
      
      // 更新緩存
      const updateCacheStart = performance.now()
      this.cachedCharacters = dbCharacters
      this.cacheTimestamp = now
      const updateCacheTime = performance.now() - updateCacheStart
      console.log(`⏱️ 更新緩存: ${updateCacheTime.toFixed(1)}ms`)
      
      const totalTime = performance.now() - startTime
      console.log(`✅ HybridDataManager 總時間: ${totalTime.toFixed(1)}ms, 結果: ${dbCharacters.length} 個角色`)
      
      return dbCharacters
    } catch (error) {
      console.error('❌ 載入角色列表失敗:', error?.message)
      
      // 如果有緩存，返回緩存數據
      if (this.cachedCharacters) {
        return this.cachedCharacters
      }
      
      // 無緩存時返回空陣列
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
      console.log(`🗑️ 刪除角色: ${characterId}`)
      
      // 調用 DetailedCharacterService 刪除角色及所有關聯資料
      const success = await DetailedCharacterService.deleteCharacter(characterId)
      
      if (success) {
        console.log(`✅ 角色 ${characterId} 已從資料庫刪除`)
        // 清除緩存
        DetailedCharacterService.clearCharacterCache(characterId)
      } else {
        console.error(`❌ 角色 ${characterId} 刪除失敗`)
      }
      
      return success
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

  /**
   * 刪除戰鬥項目（直接從 DB 刪除）
   */
  static async deleteCombatItem(itemId: string): Promise<boolean> {
    try {
      console.log(`從 DB 刪除戰鬥項目: ${itemId}`)
      const success = await CombatItemService.deleteCombatItem(itemId)
      if (success) {
        console.log(`戰鬥項目刪除成功: ${itemId}`)
      }
      return success
    } catch (error) {
      console.error('刪除戰鬥項目失敗:', error)
      return false
    }
  }

  /**
   * 依角色目前的合併施法者等級，同步「N環法術位」職業資源項目
   */
  static async syncSpellSlotResources(characterId: string, casterLevel: number): Promise<void> {
    await CombatItemService.syncSpellSlotResources(characterId, casterLevel)
  }

  /**
   * 依角色目前的遊蕩者等級，同步「偷襲傷害」職業資源項目
   */
  static async syncSneakAttackResource(characterId: string, rogueLevel: number): Promise<void> {
    await CombatItemService.syncSneakAttackResource(characterId, rogueLevel)
  }

  /**
   * 更新屬性額外調整值（直接寫入 DB）
   */
  static async updateAbilityBonuses(
    characterId: string,
    abilityBonuses: Record<string, number>,
    modifierBonuses: Record<string, number>
  ): Promise<boolean> {
    try {
      console.log(`更新屬性額外調整值到 DB: ${characterId}`)
      return await DetailedCharacterService.updateAbilityBonuses(characterId, abilityBonuses, modifierBonuses)
    } catch (error) {
      console.error('更新屬性額外調整值失敗:', error)
      return false
    }
  }

  /**
   * 更新當前狀態（血量、護甲值等，直接寫入 DB）
   */
  static async updateCurrentStats(characterId: string, stats: Partial<CharacterCurrentStats>): Promise<boolean> {
    try {
      console.log(`更新當前狀態到 DB: ${characterId}`)
      return await DetailedCharacterService.updateCurrentStats(characterId, stats)
    } catch (error) {
      console.error('更新當前狀態失敗:', error)
      return false
    }
  }

  /**
   * 更新 extra_data（修整期、名聲、屬性加成、自定義冒險紀錄等，直接寫入 DB）
   */
  static async updateExtraData(characterId: string, extraData: any): Promise<boolean> {
    try {
      console.log(`更新 extra_data 到 DB: ${characterId}`)
      return await DetailedCharacterService.updateExtraData(characterId, extraData)
    } catch (error) {
      console.error('更新 extra_data 失敗:', error)
      return false
    }
  }

  // ===== 匿名用戶轉換 =====

  /**
   * 檢查是否有匿名角色需要轉換
   */
  static async hasAnonymousCharactersToConvert(): Promise<boolean> {
    return DetailedCharacterService.hasAnonymousCharactersToConvert()
  }

  /**
   * 將匿名用戶的角色轉換為登入用戶的角色
   */
  static async convertAnonymousCharactersToUser(userId: string): Promise<boolean> {
    return DetailedCharacterService.convertAnonymousCharactersToUser(userId)
  }

  /**
   * 清除角色詳細資料緩存（可指定角色，或省略以清除全部）
   */
  static clearCharacterCache(characterId?: string): void {
    DetailedCharacterService.clearCharacterCache(characterId)
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