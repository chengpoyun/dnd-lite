import { supabase } from '../lib/supabase'
import { AnonymousService } from './anonymous'
import type { 
  Character, 
  CharacterAbilityScores, 
  CharacterSavingThrow, 
  CharacterSkillProficiency, 
  CharacterCurrentStats, 
  CharacterCurrency, 
  CharacterItem, 
  CharacterSpell, 
  CharacterSpellSlot, 
  CharacterCombatAction,
  FullCharacterData 
} from '../lib/supabase'
import type { CharacterStats } from '../types'

// 詳細角色資料服務
export class DetailedCharacterService {
  // 添加角色資料緩存
  private static characterCache: Map<string, { data: FullCharacterData; timestamp: number }> = new Map()
  private static CACHE_DURATION = 30000 // 30秒緩存

  // 清除指定角色的緩存
  static clearCharacterCache(characterId?: string): void {
    if (characterId) {
      this.characterCache.delete(characterId)
      console.log(`🗑️ 已清除角色 ${characterId} 的緩存`)
    } else {
      this.characterCache.clear()
      console.log('🗑️ 已清除所有角色緩存')
    }
  }
  
  // 檢查當前用戶狀態（認證或匿名）
  private static async getCurrentUserContext(): Promise<{
    isAuthenticated: boolean,
    userId?: string,
    anonymousId?: string
  }> {
    const startTime = performance.now()
    console.log('⏱️ getCurrentUserContext() 開始')
    
    try {
      const authCheckStart = performance.now()
      const { data: { user } } = await supabase.auth.getUser()
      const authCheckTime = performance.now() - authCheckStart
      console.log(`⏱️ supabase.auth.getUser(): ${authCheckTime.toFixed(1)}ms`)
      
      if (user) {
        const totalTime = performance.now() - startTime
        console.log(`✅ getCurrentUserContext 認證用戶 (${totalTime.toFixed(1)}ms)`)
        return { isAuthenticated: true, userId: user.id }
      } else {
        const anonIdStart = performance.now()
        console.log('👤 獲取匿名用戶ID...')
        const anonymousId = AnonymousService.getAnonymousId()
        const anonIdTime = performance.now() - anonIdStart
        console.log(`⏱️ 匿名ID獲取: ${anonIdTime.toFixed(1)}ms`)
        
        const totalTime = performance.now() - startTime
        console.log(`✅ getCurrentUserContext 匿名用戶 (${totalTime.toFixed(1)}ms)`)
        return { isAuthenticated: false, anonymousId }
      }
    } catch (error) {
      const totalTime = performance.now() - startTime
      console.error(`❌ getCurrentUserContext 失敗 (${totalTime.toFixed(1)}ms):`, error?.message)
      
      // 降級到匿名模式
      const anonymousId = AnonymousService.getAnonymousId()
      return { isAuthenticated: false, anonymousId }
    }
  }

  // 獲取用戶的角色列表
  static async getUserCharacters(userContext?: {
    isAuthenticated: boolean,
    userId?: string,
    anonymousId?: string
  }): Promise<Character[]> {
    // 重試邏輯：處理 Supabase 冷啟動
    const maxRetries = 2
    let lastError: any = null
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          console.log(`🔄 重試第 ${attempt} 次...`)
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
        
        let context
        if (userContext) {
          context = userContext
        } else {
          context = await this.getCurrentUserContext()
        }
        
        let query = supabase
          .from('characters')
          .select('id, user_id, anonymous_id, name, character_class, level, experience, avatar_url, is_anonymous, created_at, updated_at')
          .order('updated_at', { ascending: false })
        
        if (context.isAuthenticated) {
          query = query.eq('user_id', context.userId)
        } else {
          query = query.eq('anonymous_id', context.anonymousId)
        }
        
        const dbQueryStart = performance.now()
        const { data, error } = await query
        const dbQueryTime = performance.now() - dbQueryStart
        
        if (error) {
          // 檢查是否為值得重試的錯誤
          const errorMessage = error.message || ''
          if (attempt < maxRetries && (
            errorMessage.includes('CORS') || 
            errorMessage.includes('520') || 
            errorMessage.includes('502') || 
            errorMessage.includes('503') ||
            errorMessage.includes('Failed to fetch') ||
            dbQueryTime > 30000 // 超過 30 秒視為超時
          )) {
            console.warn(`⚠️ 查詢超時或網路錯誤，將重試`)
            lastError = error
            continue
          }
          
          console.warn('⚠️ 載入角色列表失敗:', error.message)
          return []
        }
        
        return data || []
        
      } catch (error) {
        lastError = error
      }
    }
    
    // 所有重試都失敗
    console.error('❌ 載入角色列表失敗（已重試）:', lastError?.message || lastError)
    return []
  }

  // 獲取完整的角色資料
  static async getFullCharacter(
    characterId: string,
    userContext?: { isAuthenticated: boolean, userId?: string, anonymousId?: string }
  ): Promise<FullCharacterData | null> {
    // 重試邏輯：處理 Supabase 冷啟動問題（520 錯誤）
    const maxRetries = 2
    let lastError: any = null
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          console.log(`🔄 重試第 ${attempt} 次...`)
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
        
        // 檢查緩存
        const cached = this.characterCache.get(characterId)
        if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
          return cached.data
        }

        // 驗證 characterId 是有效的 UUID
        if (!characterId || characterId.trim() === '' || characterId.length < 32) {
          console.error('getFullCharacter: 無效的 characterId:', characterId)
          return null
        }

        // 使用傳入的上下文或獲取新的
        const context = userContext || await this.getCurrentUserContext()

        // 使用單一查詢與 JOIN 避免多次 RLS 檢查
      // 先只驗證角色權限（最關鍵的 RLS 檢查）
      let characterQuery = supabase
        .from('characters')
        .select(`
          id, user_id, anonymous_id, name, character_class, level, experience, avatar_url, is_anonymous, created_at, updated_at,
          character_ability_scores!character_ability_scores_character_id_fkey (
            id, strength, dexterity, constitution, intelligence, wisdom, charisma, updated_at
          ),
          character_current_stats!character_current_stats_character_id_fkey (
            id, current_hp, max_hp, temporary_hp, current_hit_dice, total_hit_dice, hit_die_type, armor_class, initiative_bonus, speed, extra_data, updated_at
          ),
          character_currency!character_currency_character_id_fkey (
            id, copper, silver, electrum, gp, platinum, updated_at
          ),
          character_saving_throws!character_saving_throws_character_id_fkey (
            id, ability, is_proficient, updated_at
          ),
          character_skill_proficiencies!character_skill_proficiencies_character_id_fkey (
            id, skill_name, proficiency_level, updated_at
          ),
          character_combat_actions!character_combat_actions_character_id_fkey (
            id, name, category, current_uses, max_uses, is_custom, default_item_id, created_at, updated_at
          )
        `)
        .eq('id', characterId)
      
      if (context.isAuthenticated) {
        characterQuery = characterQuery.eq('user_id', context.userId)
      } else {
        characterQuery = characterQuery.eq('anonymous_id', context.anonymousId)
      }
      
        const characterResult = await characterQuery.single()
        
        if (characterResult.error || !characterResult.data) {
          // 檢查是否為網路/伺服器錯誤（值得重試）
          if (characterResult.error && attempt < maxRetries) {
            const errorMessage = characterResult.error.message || ''
            // CORS, 520, 502, 503 等錯誤值得重試
            if (errorMessage.includes('CORS') || errorMessage.includes('520') || 
                errorMessage.includes('502') || errorMessage.includes('503') ||
                errorMessage.includes('Failed to fetch')) {
              console.warn(`⚠️ 網路錯誤，將重試`)
              lastError = characterResult.error
              continue // 進入下一次循環重試
            }
          }
          console.error('角色不存在或無權限訪問')
          return null
        }

      // 提取嵌套的資料（來自 JOIN）
      const character = characterResult.data
      const abilityScores = Array.isArray(character.character_ability_scores) && character.character_ability_scores.length > 0
        ? character.character_ability_scores[0]
        : null
      const currentStats = Array.isArray(character.character_current_stats) && character.character_current_stats.length > 0
        ? character.character_current_stats[0]
        : null
      const currency = Array.isArray(character.character_currency) && character.character_currency.length > 0
        ? character.character_currency[0]
        : null
      const savingThrows = character.character_saving_throws || []
      const skillProficiencies = character.character_skill_proficiencies || []
      const combatActions = character.character_combat_actions || []

      // 移除嵌套數據，只保留角色基本信息
      const { 
        character_ability_scores, 
        character_current_stats, 
        character_currency, 
        character_saving_throws, 
        character_skill_proficiencies,
        character_combat_actions,
        ...characterData 
      } = character

      const result = {
        character: characterData,
        abilityScores: abilityScores || this.getDefaultAbilityScores(),
        savingThrows: savingThrows,
        skillProficiencies: skillProficiencies,
        currentStats: currentStats || this.getDefaultCurrentStats(),
        currency: currency || this.getDefaultCurrency(),
        combatActions: combatActions
      }
      
      // 存入緩存
      this.characterCache.set(characterId, {
        data: result,
        timestamp: Date.now()
      })
      
      return result
      
      } catch (error) {
        lastError = error
      }
    }
    
    // 所有重試都失敗
    console.error('❌ 載入角色資料失敗（已重試）:', lastError?.message || lastError)
    return null
  }

  // 創建新角色（包含所有預設資料）
  static async createCharacter(characterData: {
    name: string
    class: string
    level?: number
    abilityScores?: Partial<CharacterAbilityScores>
    stats?: CharacterStats // 向後相容
  }): Promise<FullCharacterData | null> {
    try {
      const context = await this.getCurrentUserContext()
      
      // 如果是匿名用戶，檢查是否已有角色（限制一個）
      if (!context.isAuthenticated) {
        const existingCharacters = await this.getUserCharacters()
        if (existingCharacters.length >= 1) {
          throw new Error('匿名用戶只能創建一個角色，請登入以創建更多角色')
        }
      }

      // 創建主角色記錄
      const insertData: any = {
        name: characterData.name,
        level: characterData.level || 1,
        experience: 0
      }
      
      // 使用新的資料庫結構
      insertData.character_class = characterData.class

      if (context.isAuthenticated) {
        insertData.user_id = context.userId
        insertData.is_anonymous = false
      } else {
        insertData.anonymous_id = context.anonymousId
        insertData.is_anonymous = true
      }

      const { data: character, error: charError } = await supabase
        .from('characters')
        .insert([insertData])
        .select()
        .single()

      if (charError) throw charError

      // 創建相關聯的資料
      const characterId = character.id
      
      // 暫時在匿名模式下只創建基本角色記錄，避免 RLS 問題
      if (context.isAuthenticated) {
        // 如果有舊格式的 stats，轉換它們
        const defaultAbilityScores = characterData.stats ? {
          strength: characterData.stats.abilityScores.str,
          dexterity: characterData.stats.abilityScores.dex,
          constitution: characterData.stats.abilityScores.con,
          intelligence: characterData.stats.abilityScores.int,
          wisdom: characterData.stats.abilityScores.wis,
          charisma: characterData.stats.abilityScores.cha
        } : {
          strength: 10, dexterity: 10, constitution: 10,
          intelligence: 10, wisdom: 10, charisma: 10
        }

        const abilityScores = await this.createAbilityScores(characterId, {
          ...defaultAbilityScores,
          ...characterData.abilityScores
        })

        const currentStats = await this.createCurrentStats(characterId, characterData.stats)
        const currency = await this.createCurrency(characterId, characterData.stats?.currency)

        // 創建預設的豁免骰熟練度
        if (characterData.stats?.savingProficiencies) {
          await this.createSavingThrows(characterId, characterData.stats.savingProficiencies)
        }

        // 創建技能熟練度
        if (characterData.stats?.proficiencies) {
          await this.createSkillProficiencies(characterId, characterData.stats.proficiencies)
        }

        return {
          character,
          abilityScores,
          savingThrows: [],
          skillProficiencies: [],
          currentStats,
          currency,
          items: [],
          spells: [],
          spellSlots: [],
          combatActions: []
        }
      } else {
        // 匿名模式：只返回基本角色信息，避免 RLS 問題
        return {
          character,
          abilityScores: null,
          savingThrows: [],
          skillProficiencies: [],
          currentStats: null,
          currency: null,
          items: [],
          spells: [],
          spellSlots: [],
          combatActions: []
        }
      }
    } catch (error) {
      console.error('創建角色失敗:', error)
      return null
    }
  }

  // 更新屬性分數
  static async updateAbilityScores(characterId: string, scores: Partial<CharacterAbilityScores>): Promise<boolean> {
    try {
      // 驗證 characterId 是有效的 UUID
      if (!characterId || characterId.trim() === '' || characterId.length < 32) {
        console.error('updateAbilityScores: 無效的 characterId:', characterId)
        return false
      }

      const { error } = await supabase
        .from('character_ability_scores')
        .upsert(
          { character_id: characterId, ...scores, updated_at: new Date().toISOString() },
          { onConflict: 'character_id' }
        )

      if (error) {
        console.error('更新能力值失敗:', error)
        return false
      }
      return true
    } catch (error) {
      console.error('更新能力值失敗:', error)
      return false
    }
  }

  // 更新當前狀態（血量、護甲值等）
  static async updateCurrentStats(characterId: string, stats: Partial<CharacterCurrentStats>): Promise<boolean> {
    try {
      // 驗證 characterId 是有效的 UUID
      if (!characterId || characterId.trim() === '' || characterId.length < 32) {
        console.error('updateCurrentStats: 無效的 characterId:', characterId)
        return false
      }

      // 先檢查記錄是否存在
      const { data: existingRecord, error: queryError } = await supabase
        .from('character_current_stats')
        .select('*')
        .eq('character_id', characterId)
        .single()

      if (queryError && queryError.code !== 'PGRST116') { // PGRST116 = 記錄不存在
        console.error('查詢現有記錄失敗:', queryError)
        return false
      }

      if (existingRecord) {
        // 記錄存在，進行 UPDATE
        const { error } = await supabase
          .from('character_current_stats')
          .update({ ...stats, updated_at: new Date().toISOString() })
          .eq('character_id', characterId)

        if (error) {
          console.error('更新當前狀態失敗:', error)
          return false
        }
      } else {
        // 記錄不存在，創建新記錄（使用默認值）
        const defaultStats = this.getDefaultCurrentStats()
        const { error } = await supabase
          .from('character_current_stats')
          .insert([{
            character_id: characterId,
            ...defaultStats,
            ...stats, // 覆蓋默認值
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])

        if (error) {
          console.error('創建當前狀態記錄失敗:', error)
          return false
        }
      }
      
      return true
    } catch (error) {
      console.error('更新當前狀態失敗:', error)
      return false
    }
  }

  // 專門更新 extra_data 的方法
  static async updateExtraData(characterId: string, extraData: any): Promise<boolean> {
    try {
      // 驗證 characterId
      if (!characterId || characterId.trim() === '' || characterId.length < 32) {
        console.error('updateExtraData: 無效的 characterId:', characterId)
        return false
      }

      // 先查詢現有記錄，如果不存在則創建基本記錄
      const { data: existingStats } = await supabase
        .from('character_current_stats')
        .select('*')
        .eq('character_id', characterId)
        .single()

      if (existingStats) {
        // 記錄存在，只更新 extra_data
        const { error } = await supabase
          .from('character_current_stats')
          .update({ extra_data: extraData, updated_at: new Date().toISOString() })
          .eq('character_id', characterId)

        if (error) {
          console.error('更新額外數據失敗:', error)
          return false
        }
      } else {
        // 記錄不存在，創建新記錄with預設值
        const { error } = await supabase
          .from('character_current_stats')
          .insert({
            character_id: characterId,
            current_hp: 1,
            max_hp: 1,
            temporary_hp: 0,
            current_hit_dice: 0,
            total_hit_dice: 1,
            armor_class: 10,
            initiative_bonus: 0,
            speed: 30,
            hit_die_type: 'd8',
            extra_data: extraData,
            updated_at: new Date().toISOString()
          })

        if (error) {
          console.error('創建角色狀態記錄失敗:', error)
          return false
        }
      }

      return true
    } catch (error) {
      console.error('更新額外數據失敗:', error)
      return false
    }
  }

  // 更新角色基本信息 - 接受前端 CharacterStats 格式並映射到資料庫欄位
  static async updateCharacterBasicInfo(characterId: string, updates: Partial<Character> | { name?: string; class?: string; level?: number; experience?: number; avatar_url?: string }): Promise<boolean> {
    try {
      // 建立映射後的更新物件
      const dbUpdates: Partial<Character> = {}
      
      if ('name' in updates && updates.name !== undefined) {
        dbUpdates.name = updates.name
      }
      if ('class' in updates && updates.class !== undefined) {
        dbUpdates.character_class = updates.class  // 前端的 class 映射到資料庫的 character_class
      }
      if ('character_class' in updates && updates.character_class !== undefined) {
        dbUpdates.character_class = updates.character_class  // 直接的資料庫欄位
      }
      if ('level' in updates && updates.level !== undefined) {
        dbUpdates.level = updates.level
      }
      if ('experience' in updates && updates.experience !== undefined) {
        dbUpdates.experience = updates.experience
      }
      if ('avatar_url' in updates && updates.avatar_url !== undefined) {
        dbUpdates.avatar_url = updates.avatar_url
      }
      
      if (Object.keys(dbUpdates).length === 0) {
        console.warn('沒有需要更新的欄位')
        return false
      }
      
      const { error } = await supabase
        .from('characters')
        .update({
          ...dbUpdates,
          updated_at: new Date().toISOString()
        })
        .eq('id', characterId);

      if (error) {
        console.error('更新角色基本信息失敗:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('更新角色基本信息失敗:', error);
      return false;
    }
  }

  // 更新貨幣
  static async updateCurrency(characterId: string, currency: Partial<CharacterCurrency>): Promise<boolean> {
    try {
      // 驗證 characterId 是有效的 UUID
      if (!characterId || characterId.trim() === '' || characterId.length < 32) {
        console.error('updateCurrency: 無效的 characterId:', characterId)
        return false
      }

      const { error } = await supabase
        .from('character_currency')
        .upsert(
          { character_id: characterId, ...currency, updated_at: new Date().toISOString() },
          { onConflict: 'character_id' }
        )

      if (error) {
        console.error('更新貨幣失敗:', error)
        return false
      }
      return true
    } catch (error) {
      console.error('更新貨幣失敗:', error)
      return false
    }
  }

  // 更新技能熟練度
  static async updateSkillProficiency(characterId: string, skillName: string, level: number): Promise<boolean> {
    console.log(`🔄 更新技能熟練度到 DB: ${skillName} = ${level} (角色: ${characterId})`)
    try {
      if (level === 0) {
        // 如果熟練度為 0，刪除記錄
        console.log(`🗑️ 刪除技能記錄: ${skillName}`)
        const { error } = await supabase
          .from('character_skill_proficiencies')
          .delete()
          .eq('character_id', characterId)
          .eq('skill_name', skillName)
        
        if (error) {
          console.error('❌ 刪除技能記錄失敗:', error)
          return false
        }
        console.log(`✅ 技能記錄已刪除: ${skillName}`)
        return true
      } else {
        // 否則更新或插入記錄
        console.log(`💾 插入/更新技能記錄: ${skillName} = ${level}`)
        const { error } = await supabase
          .from('character_skill_proficiencies')
          .upsert({
            character_id: characterId,
            skill_name: skillName,
            proficiency_level: level,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'character_id,skill_name'
          })

        if (error) {
          console.error('❌ 更新技能熟練度失敗:', error)
          return false
        }
        console.log(`✅ 技能熟練度更新成功: ${skillName} = ${level}`)
        return true
      }
    } catch (error) {
      console.error('❌ 更新技能熟練度失敗:', error)
      return false
    }
  }

  // 清空角色的所有技能熟練度記錄
  static async clearAllSkillProficiencies(characterId: string): Promise<boolean> {
    try {
      console.log(`🗑️ 清空角色所有技能熟練度: ${characterId}`)
      const { error } = await supabase
        .from('character_skill_proficiencies')
        .delete()
        .eq('character_id', characterId)
      
      if (error) {
        console.error('❌ 清空技能熟練度失敗:', error)
        return false
      }
      console.log('✅ 所有技能熟練度已清空')
      return true
    } catch (error) {
      console.error('❌ 清空技能熟練度失敗:', error)
      return false
    }
  }

  // 插入新的技能熟練度記錄
  static async insertSkillProficiency(characterId: string, skillName: string, level: number): Promise<boolean> {
    try {
      console.log(`➕ 插入技能熟練度: ${skillName} = ${level} (角色: ${characterId})`)
      const { error } = await supabase
        .from('character_skill_proficiencies')
        .insert({
          character_id: characterId,
          skill_name: skillName,
          proficiency_level: level,
          updated_at: new Date().toISOString()
        })

      if (error) {
        console.error('❌ 插入技能熟練度失敗:', error)
        return false
      }
      console.log(`✅ 技能熟練度插入成功: ${skillName} = ${level}`)
      return true
    } catch (error) {
      console.error('❌ 插入技能熟練度失敗:', error)
      return false
    }
  }

  // Upsert 技能熟練度記錄（插入或更新）
  static async upsertSkillProficiency(characterId: string, skillName: string, level: number): Promise<boolean> {
    try {
      console.log(`🔄 Upsert 技能熟練度: ${skillName} = ${level} (角色: ${characterId})`)
      const { error } = await supabase
        .from('character_skill_proficiencies')
        .upsert({
          character_id: characterId,
          skill_name: skillName,
          proficiency_level: level,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'character_id,skill_name'
        })

      if (error) {
        console.error('❌ Upsert技能熟練度失敗:', error)
        return false
      }
      console.log(`✅ 技能熟練度Upsert成功: ${skillName} = ${level}`)
      return true
    } catch (error) {
      console.error('❌ Upsert技能熟練度失敗:', error)
      return false
    }
  }

  // 刪除特定技能熟練度記錄
  static async deleteSkillProficiency(characterId: string, skillName: string): Promise<boolean> {
    try {
      console.log(`🗑️ 刪除技能熟練度: ${skillName} (角色: ${characterId})`)
      const { error } = await supabase
        .from('character_skill_proficiencies')
        .delete()
        .eq('character_id', characterId)
        .eq('skill_name', skillName)

      if (error) {
        console.error('❌ 刪除技能熟練度失敗:', error)
        return false
      }
      console.log(`✅ 技能熟練度刪除成功: ${skillName}`)
      return true
    } catch (error) {
      console.error('❌ 刪除技能熟練度失敗:', error)
      return false
    }
  }

  // 更新豁免骰熟練度
  static async updateSavingThrowProficiencies(characterId: string, proficiencies: string[]): Promise<boolean> {
    try {
      console.log('🛡️ DetailedCharacterService: 更新豁免熟練度', {
        characterId,
        proficiencies,
        count: proficiencies.length
      })
      
      // 先刪除所有現有的豁免骰熟練度
      const { error: deleteError } = await supabase
        .from('character_saving_throws')
        .delete()
        .eq('character_id', characterId)

      if (deleteError) {
        console.error('刪除舊豁免熟練度失敗:', deleteError)
        return false
      }

      // 然後插入新的熟練度
      if (proficiencies.length > 0) {
        const inserts = proficiencies.map(ability => ({
          character_id: characterId,
          ability,
          is_proficient: true,
          updated_at: new Date().toISOString()
        }))

        console.log('🛡️ 準備插入豁免熟練度:', inserts)

        const { error } = await supabase
          .from('character_saving_throws')
          .insert(inserts)

        if (error) {
          console.error('插入豁免熟練度失敗:', error)
          return false
        }
        
        console.log('✅ 豁免熟練度插入成功')
      } else {
        console.log('📝 沒有豁免熟練度需要插入（清空所有）')
      }

      return true
    } catch (error) {
      console.error('更新豁免骰熟練度失敗:', error)
      return false
    }
  }

  // 新增物品
  static async addItem(characterId: string, item: Omit<CharacterItem, 'id' | 'character_id' | 'created_at' | 'updated_at'>): Promise<CharacterItem | null> {
    try {
      const { data, error } = await supabase
        .from('character_items')
        .insert([{
          character_id: characterId,
          ...item
        }])
        .select()
        .single()

      return error ? null : data
    } catch (error) {
      console.error('新增物品失敗:', error)
      return null
    }
  }

  // 更新物品
  static async updateItem(itemId: string, updates: Partial<CharacterItem>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('character_items')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', itemId)

      return !error
    } catch (error) {
      console.error('更新物品失敗:', error)
      return false
    }
  }

  // 刪除物品
  static async deleteItem(itemId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('character_items')
        .delete()
        .eq('id', itemId)

      return !error
    } catch (error) {
      console.error('刪除物品失敗:', error)
      return false
    }
  }

  // 轉換新格式到舊格式 CharacterStats（向後相容）
  static fullDataToCharacterStats(fullData: FullCharacterData): CharacterStats {
    const savingProficienciesArray: string[] = []
    fullData.savingThrows.forEach(st => {
      if (st.is_proficient) {
        savingProficienciesArray.push(st.ability)
      }
    })

    const proficienciesRecord: Record<string, number> = {}
    fullData.skillProficiencies.forEach(sp => {
      proficienciesRecord[sp.skill_name] = sp.proficiency_level
    })

    return {
      name: fullData.character.name,
      class: fullData.character.character_class || (fullData.character as any).class || '戰士',
      level: fullData.character.level,
      exp: fullData.character.experience,
      hp: {
        current: fullData.currentStats.current_hp,
        max: fullData.currentStats.max_hp,
        temp: fullData.currentStats.temporary_hp
      },
      hitDice: {
        current: fullData.currentStats.current_hit_dice,
        total: fullData.currentStats.total_hit_dice,
        die: fullData.currentStats.hit_die_type
      },
      ac: fullData.currentStats.armor_class,
      initiative: fullData.currentStats.initiative_bonus,
      speed: fullData.currentStats.speed,
      abilityScores: {
        str: fullData.abilityScores.strength,
        dex: fullData.abilityScores.dexterity,
        con: fullData.abilityScores.constitution,
        int: fullData.abilityScores.intelligence,
        wis: fullData.abilityScores.wisdom,
        cha: fullData.abilityScores.charisma
      },
      savingProficiencies: savingProficienciesArray as any,
      proficiencies: proficienciesRecord,
      downtime: 0,
      renown: { used: 0, total: 0 },
      prestige: { org: '', level: 0, rankName: '' },
      attacks: [],
      currency: {
        cp: fullData.currency.copper,
        sp: fullData.currency.silver,
        ep: fullData.currency.electrum,
        gp: fullData.currency.gp,
        pp: fullData.currency.platinum
      },
      customRecords: []
    }
  }

  // === 私有輔助方法 ===

  // 獲取預設能力值（不寫入資料庫）
  private static getDefaultAbilityScores(): CharacterAbilityScores {
    return {
      character_id: '', // 會在實際使用時忽略
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
      created_at: '',
      updated_at: ''
    }
  }

  // 獲取預設當前狀態（不寫入資料庫）
  private static getDefaultCurrentStats(): CharacterCurrentStats {
    return {
      character_id: '',
      current_hp: 20,
      max_hp: 20,
      temporary_hp: 0,
      current_hit_dice: 1,
      total_hit_dice: 1,
      hit_die_type: 'd8',
      armor_class: 10,
      initiative_bonus: 0,
      speed: 30,
      created_at: '',
      updated_at: ''
    }
  }

  // 獲取預設貨幣（不寫入資料庫）
  private static getDefaultCurrency(): CharacterCurrency {
    return {
      character_id: '',
      copper: 0,
      silver: 0,
      electrum: 0,
      gp: 150,
      platinum: 0,
      created_at: '',
      updated_at: ''
    }
  }

  private static async createDefaultAbilityScores(characterId: string): Promise<CharacterAbilityScores> {
    return this.createAbilityScores(characterId, {})
  }

  private static async createAbilityScores(characterId: string, scores: Partial<CharacterAbilityScores>): Promise<CharacterAbilityScores> {
    const { data, error } = await supabase
      .from('character_ability_scores')
      .insert([{
        character_id: characterId,
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
        ...scores
      }])
      .select()
      .single()

    if (error) throw error
    return data
  }

  private static async createDefaultCurrentStats(characterId: string): Promise<CharacterCurrentStats> {
    return this.createCurrentStats(characterId)
  }

  private static async createCurrentStats(characterId: string, stats?: CharacterStats): Promise<CharacterCurrentStats> {
    const { data, error } = await supabase
      .from('character_current_stats')
      .insert([{
        character_id: characterId,
        current_hp: stats?.hp.current || 20,
        max_hp: stats?.hp.max || 20,
        temporary_hp: stats?.hp.temp || 0,
        current_hit_dice: stats?.hitDice.current || 1,
        total_hit_dice: stats?.hitDice.total || 1,
        hit_die_type: stats?.hitDice.die || 'd8',
        armor_class: stats?.ac || 10,
        initiative_bonus: stats?.initiative || 0,
        speed: stats?.speed || 30
      }])
      .select()
      .single()

    if (error) throw error
    return data
  }

  private static async createDefaultCurrency(characterId: string): Promise<CharacterCurrency> {
    return this.createCurrency(characterId)
  }

  private static async createCurrency(characterId: string, currency?: any): Promise<CharacterCurrency> {
    const { data, error } = await supabase
      .from('character_currency')
      .insert([{
        character_id: characterId,
        copper: currency?.cp || 0,
        silver: currency?.sp || 0,
        electrum: currency?.ep || 0,
        gp: currency?.gp || 150,
        platinum: currency?.pp || 0
      }])
      .select()
      .single()

    if (error) throw error
    return data
  }

  private static async createSavingThrows(characterId: string, savingProficiencies: string[]): Promise<void> {
    const inserts = savingProficiencies.map((ability) => ({
      character_id: characterId,
      ability,
      is_proficient: true
    }))

    const { error } = await supabase
      .from('character_saving_throws')
      .insert(inserts)

    if (error) throw error
  }

  private static async createSkillProficiencies(characterId: string, proficiencies: Record<string, number>): Promise<void> {
    const inserts = Object.entries(proficiencies).map(([skillName, level]) => ({
      character_id: characterId,
      skill_name: skillName,
      proficiency_level: level
    }))

    const { error } = await supabase
      .from('character_skill_proficiencies')
      .insert(inserts)

    if (error) throw error
  }

  // === 匿名用戶轉換 ===

  // 將匿名用戶的角色轉換為登入用戶的角色
  static async convertAnonymousCharactersToUser(userId: string): Promise<boolean> {
    try {
      // 直接從 localStorage 獲取 anonymousId
      const anonymousId = localStorage.getItem('dnd_anonymous_user_id')
      if (!anonymousId) {
        return true // 沒有匿名角色需要轉換
      }

      // 獲取匿名角色
      const { data: anonymousCharacters, error: fetchError } = await supabase
        .from('characters')
        .select('*')
        .eq('anonymous_id', anonymousId)
        .eq('is_anonymous', true)

      if (fetchError) throw fetchError

      if (anonymousCharacters && anonymousCharacters.length > 0) {
        // 將匿名角色轉換為用戶角色
        const { error: updateError } = await supabase
          .from('characters')
          .update({
            user_id: userId,
            is_anonymous: false,
            anonymous_id: null,
            updated_at: new Date().toISOString()
          })
          .eq('anonymous_id', anonymousId)
          .eq('is_anonymous', true)

        if (updateError) throw updateError

        console.log(`成功轉換 ${anonymousCharacters.length} 個匿名角色到用戶帳號`)
      }

      // 清除本地匿名 ID
      AnonymousService.clearAnonymousId()

      return true
    } catch (error) {
      console.error('轉換匿名角色失敗:', error)
      return false
    }
  }

  // 檢查是否有匿名角色需要轉換
  static async hasAnonymousCharactersToConvert(): Promise<boolean> {
    try {
      // 直接從 localStorage 獲取 anonymousId，而不是從內存
      const anonymousId = localStorage.getItem('dnd_anonymous_user_id')
      if (!anonymousId) {
        return false
      }

      const { data, error } = await supabase
        .from('characters')
        .select('id')
        .eq('anonymous_id', anonymousId)
        .eq('is_anonymous', true)
        .limit(1)

      if (error) throw error
      return (data?.length || 0) > 0
    } catch (error) {
      console.error('檢查匿名角色失敗:', error)
      return false
    }
  }
}