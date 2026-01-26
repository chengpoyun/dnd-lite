import { DetailedCharacterService } from './detailedCharacter'
import { ConflictResolver } from './conflictResolver'
import type { FullCharacterData, Character } from '../lib/supabase'

/**
 * 混合資料管理器
 * 策略：localStorage 為主，DB 為備份同步
 * 衝突處理：localStorage 優先
 */
export class HybridDataManager {
  private static readonly STORAGE_PREFIX = 'dnd_'
  private static readonly CHARACTER_IDS_KEY = 'dnd_character_ids'
  
  // ===== 讀取操作 =====
  
  /**
   * 獲取角色完整資料（優先 localStorage，處理衝突）
   */
  static async getCharacter(characterId: string): Promise<FullCharacterData | null> {
    // 1. 先讀 localStorage
    const localData = this.getLocalCharacter(characterId)
    
    // 2. 同時讀 DB
    const dbData = await DetailedCharacterService.getFullCharacter(characterId)
    
    // 3. 如果都有數據，檢查衝突
    if (localData && dbData) {
      const hasConflict = ConflictResolver.detectConflict(localData, dbData)
      
      if (hasConflict) {
        console.warn(`檢測到角色數據衝突: ${localData.character.name}`)
        
        // 自動解決衝突（localStorage 優先）
        const resolution = ConflictResolver.autoResolveConflict(localData, dbData)
        const finalData = ConflictResolver.applyResolution(localData, dbData, resolution)
        
        // 如果選擇了 localStorage，確保 DB 同步
        if (resolution.winner === 'localStorage') {
          this.syncToDatabase(characterId, localData, false) // 非阻塞同步
        }
        
        return finalData
      }
      
      console.log(`從 localStorage 載入角色: ${localData.character.name}`)
      return localData
    }
    
    // 4. 只有本地數據
    if (localData && !dbData) {
      console.log(`從 localStorage 載入角色: ${localData.character.name}`)
      // 非阻塞同步到 DB
      this.syncToDatabase(characterId, localData, false)
      return localData
    }
    
    // 5. 只有 DB 數據
    if (!localData && dbData) {
      console.log(`從 DB 載入角色: ${dbData.character.name}`)
      // 同步到 localStorage
      this.setLocalCharacter(characterId, dbData)
      this.addToCharacterList(characterId)
      return dbData
    }
    
    // 6. 都沒有數據
    return null
  }
  
  /**
   * 獲取用戶所有角色
   */
  static async getUserCharacters(): Promise<Character[]> {
    // 1. 從 localStorage 獲取角色列表
    const localCharacterIds = this.getLocalCharacterIds()
    const localCharacters: Character[] = []
    
    for (const id of localCharacterIds) {
      const data = this.getLocalCharacter(id)
      if (data) {
        localCharacters.push(data.character)
      }
    }
    
    // 2. 如果 localStorage 有資料，直接返回
    if (localCharacters.length > 0) {
      console.log(`從 localStorage 載入 ${localCharacters.length} 個角色`)
      return localCharacters
    }
    
    // 3. localStorage 為空，嘗試從 DB 載入
    console.log('localStorage 為空，從 DB 載入角色列表')
    const dbCharacters = await DetailedCharacterService.getUserCharacters()
    
    // 同步到 localStorage
    for (const character of dbCharacters) {
      const fullData = await DetailedCharacterService.getFullCharacter(character.id)
      if (fullData) {
        this.setLocalCharacter(character.id, fullData)
        this.addToCharacterList(character.id)
      }
    }
    
    return dbCharacters
  }
  
  // ===== 寫入操作 =====
  
  /**
   * 更新角色資料（同時寫入 localStorage + DB）
   */
  static async updateCharacter(characterId: string, updates: Partial<FullCharacterData>): Promise<boolean> {
    try {
      // 1. 立即寫入 localStorage（用戶體驗優先）
      const currentData = this.getLocalCharacter(characterId)
      if (currentData) {
        const updatedData = this.mergeCharacterData(currentData, updates)
        this.setLocalCharacter(characterId, updatedData)
        console.log(`localStorage 更新成功: ${characterId}`)
      }
      
      // 2. 嘗試寫入 DB（不等待結果）
      this.syncUpdatesToDatabase(characterId, updates).catch(error => {
        console.warn('DB 同步失敗（忽略）:', error)
      })
      
      return true // 立即返回成功
    } catch (error) {
      console.error('更新角色失敗:', error)
      return false
    }
  }
  
  /**
   * 創建新角色
   */
  static async createCharacter(characterData: {
    name: string
    class: string
    level?: number
  }): Promise<FullCharacterData | null> {
    try {
      // 1. 創建 DB 記錄
      const fullData = await DetailedCharacterService.createCharacter(characterData)
      if (!fullData) return null
      
      // 2. 同步到 localStorage
      this.setLocalCharacter(fullData.character.id, fullData)
      
      // 3. 更新角色列表
      this.addToCharacterList(fullData.character.id)
      
      console.log(`新角色創建成功: ${fullData.character.name}`)
      return fullData
    } catch (error) {
      console.error('創建角色失敗:', error)
      return null
    }
  }
  
  /**
   * 刪除角色
   */
  static async deleteCharacter(characterId: string): Promise<boolean> {
    try {
      // 1. 從 localStorage 移除
      this.removeLocalCharacter(characterId)
      this.removeFromCharacterList(characterId)
      
      // 2. 可選：從 DB 刪除（目前未實作刪除功能）
      // TODO: 實作 DetailedCharacterService.deleteCharacter 方法
      console.log(`角色已從本地刪除: ${characterId}`)
      
      return true
    } catch (error) {
      console.error('刪除角色失敗:', error)
      return false
    }
  }
  
  // ===== localStorage 操作 =====
  
  private static getLocalCharacter(characterId: string): FullCharacterData | null {
    try {
      const key = `${this.STORAGE_PREFIX}character_${characterId}`
      const data = localStorage.getItem(key)
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.warn('localStorage 讀取失敗:', error)
      return null
    }
  }
  
  private static setLocalCharacter(characterId: string, data: FullCharacterData) {
    try {
      const key = `${this.STORAGE_PREFIX}character_${characterId}`
      // 更新時間戳
      data.character.updated_at = new Date().toISOString()
      localStorage.setItem(key, JSON.stringify(data))
    } catch (error) {
      console.warn('localStorage 寫入失敗:', error)
    }
  }
  
  private static removeLocalCharacter(characterId: string) {
    try {
      const key = `${this.STORAGE_PREFIX}character_${characterId}`
      localStorage.removeItem(key)
    } catch (error) {
      console.warn('localStorage 刪除失敗:', error)
    }
  }
  
  // ===== 角色列表管理 =====
  
  private static getLocalCharacterIds(): string[] {
    try {
      const ids = localStorage.getItem(this.CHARACTER_IDS_KEY)
      return ids ? JSON.parse(ids) : []
    } catch (error) {
      console.warn('角色列表讀取失敗:', error)
      return []
    }
  }
  
  private static addToCharacterList(characterId: string) {
    try {
      const ids = this.getLocalCharacterIds()
      if (!ids.includes(characterId)) {
        ids.push(characterId)
        localStorage.setItem(this.CHARACTER_IDS_KEY, JSON.stringify(ids))
      }
    } catch (error) {
      console.warn('角色列表更新失敗:', error)
    }
  }
  
  private static removeFromCharacterList(characterId: string) {
    try {
      const ids = this.getLocalCharacterIds()
      const filteredIds = ids.filter(id => id !== characterId)
      localStorage.setItem(this.CHARACTER_IDS_KEY, JSON.stringify(filteredIds))
    } catch (error) {
      console.warn('角色列表移除失敗:', error)
    }
  }
  
  // ===== 資料合併和同步 =====
  
  private static mergeCharacterData(current: FullCharacterData, updates: Partial<FullCharacterData>): FullCharacterData {
    return {
      character: { ...current.character, ...updates.character },
      abilityScores: { ...current.abilityScores, ...updates.abilityScores },
      savingThrows: updates.savingThrows || current.savingThrows,
      skillProficiencies: updates.skillProficiencies || current.skillProficiencies,
      currentStats: { ...current.currentStats, ...updates.currentStats },
      currency: { ...current.currency, ...updates.currency },
      items: updates.items || current.items,
      spells: updates.spells || current.spells,
      spellSlots: updates.spellSlots || current.spellSlots,
      combatActions: updates.combatActions || current.combatActions
    }
  }
  
  /**
   * 同步資料到資料庫（非阻塞）
   */
  private static async syncToDatabase(characterId: string, data: FullCharacterData, blocking: boolean = true): Promise<void> {
    const syncOperation = async () => {
      try {
        const promises: Promise<any>[] = []
        
        // 更新角色基本信息 (需要實作相應的更新方法)
        // TODO: 實作角色基本信息更新
        
        // 更新當前狀態
        if (data.currentStats) {
          promises.push(
            DetailedCharacterService.updateCurrentStats(characterId, data.currentStats)
          )
        }
        
        // 更新能力值
        if (data.abilityScores) {
          promises.push(
            DetailedCharacterService.updateAbilityScores(characterId, data.abilityScores)
          )
        }
        
        // 更新貨幣
        if (data.currency) {
          promises.push(
            DetailedCharacterService.updateCurrency(characterId, data.currency)
          )
        }
        
        // 等待所有更新完成
        await Promise.all(promises)
        console.log(`DB 同步完成: ${data.character.name}`)
      } catch (error) {
        console.warn(`DB 同步失敗: ${characterId}`, error)
        throw error
      }
    }
    
    if (blocking) {
      await syncOperation()
    } else {
      // 非阻塞：放到下一個事件循環
      setTimeout(() => {
        syncOperation().catch(error => {
          console.warn('背景 DB 同步失敗（忽略）:', error)
        })
      }, 0)
    }
  }

  private static async syncUpdatesToDatabase(characterId: string, updates: Partial<FullCharacterData>) {
    const promises: Promise<any>[] = []
    
    // 更新角色基本信息
    if (updates.character) {
      promises.push(
        DetailedCharacterService.updateCharacterBasicInfo(characterId, updates.character)
      )
    }
    
    // 根據 updates 類型分別同步
    if (updates.currentStats) {
      promises.push(
        DetailedCharacterService.updateCurrentStats(characterId, updates.currentStats)
      )
    }
    
    if (updates.abilityScores) {
      promises.push(
        DetailedCharacterService.updateAbilityScores(characterId, updates.abilityScores)
      )
    }
    
    if (updates.currency) {
      promises.push(
        DetailedCharacterService.updateCurrency(characterId, updates.currency)
      )
    }

    // 更新技能熟練度
    if (updates.skillProficiencies) {
      // 批次更新所有技能熟練度
      for (const [skillName, level] of Object.entries(updates.skillProficiencies)) {
        if (level > 0) {
          promises.push(
            DetailedCharacterService.updateSkillProficiency(characterId, skillName, level)
          )
        }
      }
    }

    // 更新豁免骰熟練度
    if (updates.savingThrows) {
      promises.push(
        DetailedCharacterService.updateSavingThrowProficiencies(characterId, updates.savingThrows)
      )
    }
    
    // 等待所有同步完成
    await Promise.all(promises)
    console.log(`DB 同步成功: ${characterId}`)
  }
  
  // ===== 工具方法 =====
  
  /**
   * 清除所有本地資料
   */
  static clearAllLocalData() {
    try {
      const characterIds = this.getLocalCharacterIds()
      for (const id of characterIds) {
        this.removeLocalCharacter(id)
      }
      localStorage.removeItem(this.CHARACTER_IDS_KEY)
      console.log('所有本地資料已清除')
    } catch (error) {
      console.warn('清除本地資料失敗:', error)
    }
  }
  
  /**
   * 獲取儲存統計
   */
  static getStorageStats() {
    const characterIds = this.getLocalCharacterIds()
    const characters = characterIds.map(id => this.getLocalCharacter(id)).filter(Boolean)
    
    return {
      totalCharacters: characters.length,
      characterIds,
      storageKeys: Object.keys(localStorage).filter(key => key.startsWith(this.STORAGE_PREFIX))
    }
  }
}