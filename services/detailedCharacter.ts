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
  CharacterCombatAction,
  FullCharacterData 
} from '../lib/supabase'
import type { CharacterStats } from '../types'
import {
  getSpecialEffectId,
  getSpecialEffectCombatBonus,
  type SpecialEffectContext,
} from '../utils/specialEffects'
import { computeSaveAndSkillAdvantageDisadvantage } from '../utils/advantageDisadvantage'

/** 能力／物品 stat_bonuses 聚合結果（供 buildCharacterStats / 前端顯示用） */
export interface AggregatedStatBonuses {
  /** 來自能力／物品的「屬性值」加成（力量、敏捷等） */
  abilityScores: Record<string, number>;
  abilityModifiers: Record<string, number>;
  savingThrows: Record<string, number>;
  skills: Record<string, number>;
  combatStats: {
    ac?: number;
    initiative?: number;
    maxHp?: number;
    speed?: number;
    attackHit?: number;
    attackDamage?: number;
    spellHit?: number;
    spellDc?: number;
  };
  bySource: {
    id: string;
    type: 'ability' | 'item';
    name: string;
    abilityScores?: Record<string, number>;
    abilityModifiers?: Record<string, number>;
    savingThrows?: Record<string, number>;
    skills?: Record<string, number>;
    savingThrowAdvantage?: string[];
    savingThrowDisadvantage?: string[];
    skillAdvantage?: string[];
    skillDisadvantage?: string[];
    combatStats?: AggregatedStatBonuses['combatStats'];
  }[];
  /** 依 bySource 結算後的豁免優劣勢 */
  saveAdvantageDisadvantage?: Record<string, 'advantage' | 'normal' | 'disadvantage'>;
  /** 依 bySource 結算後的技能優劣勢 */
  skillAdvantageDisadvantage?: Record<string, 'advantage' | 'normal' | 'disadvantage'>;
}

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
    // 重試邏輯：處理 Supabase 冷啟動問題
    const maxRetries = 2
    let lastError: any = null
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          console.log(`🔄 重試第 ${attempt} 次...`)
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
        
        // 使用傳入的上下文或獲取新的
        const context = userContext || await this.getCurrentUserContext()
        
        let query = supabase
          .from('characters')
          .select('id, user_id, anonymous_id, name, character_class, level, experience, is_anonymous, created_at, updated_at')
          .order('updated_at', { ascending: false })
        
        if (context.isAuthenticated) {
          query = query.eq('user_id', context.userId)
        } else {
          query = query.eq('anonymous_id', context.anonymousId)
        }
        
        const { data, error } = await query
        
        if (error) {
          // 檢查是否為網路/伺服器錯誤（值得重試）
          if (attempt < maxRetries) {
            const errorMessage = error.message || ''
            if (errorMessage.includes('CORS') || errorMessage.includes('520') || 
                errorMessage.includes('502') || errorMessage.includes('503') ||
                errorMessage.includes('Failed to fetch')) {
              console.warn(`⚠️ 網路錯誤，將重試`)
              lastError = error
              continue
            }
          }
          console.warn('⚠️ 載入角色列表失敗:', error.message)
          return []
        }
        
        return data || []
        
      } catch (error) {
        lastError = error
        // 檢查是否為網路錯誤（值得重試）
        if (attempt < maxRetries) {
          const errorMessage = error?.message || ''
          if (errorMessage.includes('CORS') || errorMessage.includes('520') || 
              errorMessage.includes('502') || errorMessage.includes('503') ||
              errorMessage.includes('Failed to fetch')) {
            console.warn(`⚠️ 網路錯誤，將重試`)
            continue
          }
        }
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
      // 使用簡化的 JOIN 語法，讓 Supabase 自動找到外鍵關係
      let characterQuery = supabase
        .from('characters')
        .select(`
          *,
          character_ability_scores(*),
          character_current_stats(*),
          character_currency(*),
          character_saving_throws(*),
          character_skill_proficiencies(*),
          character_combat_actions(*),
          character_classes(*),
          character_hit_dice_pools(*)
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
      
      console.log('🔍 查詢返回的完整資料結構:', {
        hasAbilityScores: !!character.character_ability_scores,
        abilityScoresType: Array.isArray(character.character_ability_scores) ? 'array' : typeof character.character_ability_scores,
        abilityScoresLength: Array.isArray(character.character_ability_scores) ? character.character_ability_scores.length : 'N/A',
        rawData: character.character_ability_scores
      })
      
      // 處理一對一關係：如果是 object 直接使用，如果是 array 取第一個
      const abilityScores = character.character_ability_scores
        ? (Array.isArray(character.character_ability_scores) 
            ? character.character_ability_scores[0] 
            : character.character_ability_scores)
        : null
      
      console.log('📊 讀取到的能力值資料:', { 
        hasData: !!abilityScores,
        abilityScores: abilityScores
      })
      
      // 處理其他一對一關係
      const currentStats = character.character_current_stats
        ? (Array.isArray(character.character_current_stats)
            ? character.character_current_stats[0]
            : character.character_current_stats)
        : null
        
      const currency = character.character_currency
        ? (Array.isArray(character.character_currency)
            ? character.character_currency[0]
            : character.character_currency)
        : null
        
      // 一對多關係保持 array
      const savingThrows = Array.isArray(character.character_saving_throws) 
        ? character.character_saving_throws 
        : (character.character_saving_throws ? [character.character_saving_throws] : [])
        
      const skillProficiencies = Array.isArray(character.character_skill_proficiencies)
        ? character.character_skill_proficiencies
        : (character.character_skill_proficiencies ? [character.character_skill_proficiencies] : [])
        
      const combatActions = Array.isArray(character.character_combat_actions)
        ? character.character_combat_actions
        : (character.character_combat_actions ? [character.character_combat_actions] : [])
        
      // 處理多職業資料（一對多關係）
      const classes = Array.isArray(character.character_classes)
        ? character.character_classes
        : (character.character_classes ? [character.character_classes] : [])
        
      // 處理生命骰池資料（一對一關係）
      const hitDicePools = character.character_hit_dice_pools
        ? (Array.isArray(character.character_hit_dice_pools)
            ? character.character_hit_dice_pools[0]
            : character.character_hit_dice_pools)
        : null



      // 移除嵌套數據，只保留角色基本信息
      const { 
        character_ability_scores, 
        character_current_stats, 
        character_currency, 
        character_saving_throws, 
        character_skill_proficiencies,
        character_combat_actions,
        character_classes,
        character_hit_dice_pools,
        ...characterData 
      } = character

      // 透過角色能力與物品聚合 stat_bonuses，並寫入 currentStats.extra_data 供前端使用
      if (currentStats && character.id) {
        try {
          const specialEffectContext: SpecialEffectContext = {
            level: characterData.level ?? (character as any).level ?? 1,
            classes: (classes || []).map((c: any) => ({
              name: c.class_name ?? c.name ?? '',
              level: c.class_level ?? c.level ?? 1,
              hitDie: c.hit_die ?? c.hitDie,
            })),
          };
          const aggregated = await this.collectSourceBonusesForCharacter(character.id, specialEffectContext);
          const rawExtra = (currentStats as any).extra_data ?? (currentStats as any).extraData ?? {};
          // 僅使用本次彙總結果，不疊加 DB 既有值，避免重複計算與「其他加值」差額
          const mergedSkillBonuses: Record<string, number> = {};
          for (const [k, v] of Object.entries(aggregated.skills || {})) {
            const num = typeof v === 'number' && Number.isFinite(v) ? v : 0;
            if (num !== 0) mergedSkillBonuses[k] = num;
          }
          const mergedAbilityBonuses: Record<string, number> = {};
          for (const [k, v] of Object.entries(aggregated.abilityScores || {})) {
            const num = typeof v === 'number' && Number.isFinite(v) ? v : 0;
            if (num !== 0) mergedAbilityBonuses[k] = num;
          }
          const mergedModifierBonuses: Record<string, number> = {};
          for (const [k, v] of Object.entries(aggregated.abilityModifiers || {})) {
            const num = typeof v === 'number' && Number.isFinite(v) ? v : 0;
            if (num !== 0) mergedModifierBonuses[k] = num;
          }

          (currentStats as any).extra_data = {
            ...rawExtra,
            abilityBonuses: mergedAbilityBonuses,
            modifierBonuses: mergedModifierBonuses,
            skillBonuses: mergedSkillBonuses,
            statBonusSources: aggregated.bySource,
            saveAdvantageDisadvantage: aggregated.saveAdvantageDisadvantage ?? {},
            skillAdvantageDisadvantage: aggregated.skillAdvantageDisadvantage ?? {},
          };
        } catch (e) {
          console.error('collectSourceBonusesForCharacter 失敗，略過加值聚合：', e);
        }
      }

      const result = {
        character: characterData,
        abilityScores: abilityScores || this.getDefaultAbilityScores(),
        savingThrows: savingThrows,
        skillProficiencies: skillProficiencies,
        currentStats: currentStats || this.getDefaultCurrentStats(),
        currency: currency || this.getDefaultCurrency(),
        combatActions: combatActions,
        classes: classes.length > 0 ? classes : undefined,
        hitDicePools: hitDicePools || undefined
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

        // 創建預設戰鬥項目
        await this.createDefaultCombatActions(characterId)

        return {
          character,
          abilityScores,
          savingThrows: [],
          skillProficiencies: [],
          currentStats,
          currency,
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

      console.log('📝 準備更新能力值到資料庫:', { characterId, scores })
      
      const { data, error } = await supabase
        .from('character_ability_scores')
        .upsert(
          { character_id: characterId, ...scores, updated_at: new Date().toISOString() },
          { onConflict: 'character_id' }
        )
        .select() // 添加 select 以確認寫入

      if (error) {
        console.error('❌ 更新能力值失敗:', error)
        return false
      }
      
      console.log('✅ 能力值已寫入資料庫:', data)
      return true
    } catch (error) {
      console.error('❌ 更新能力值異常:', error)
      return false
    }
  }

  // 一次更新所有屬性額外調整值（寫入 character_ability_scores 的 *_bonus / *_modifier_bonus）
  static async updateAbilityBonuses(
    characterId: string,
    abilityBonuses: Record<string, number>,
    modifierBonuses: Record<string, number>
  ): Promise<boolean> {
    try {
      if (!characterId || characterId.trim() === '' || characterId.length < 32) {
        console.error('updateAbilityBonuses: 無效的 characterId:', characterId)
        return false
      }
      const keys: { short: keyof Record<string, number>; db: 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma' }[] = [
        { short: 'str', db: 'strength' }, { short: 'dex', db: 'dexterity' }, { short: 'con', db: 'constitution' },
        { short: 'int', db: 'intelligence' }, { short: 'wis', db: 'wisdom' }, { short: 'cha', db: 'charisma' }
      ]
      const row: Record<string, number | string> = { character_id: characterId }
      for (const { short: k, db } of keys) {
        row[`${db}_bonus`] = typeof abilityBonuses?.[k] === 'number' && Number.isFinite(abilityBonuses[k]) ? abilityBonuses[k] : 0
        row[`${db}_modifier_bonus`] = typeof modifierBonuses?.[k] === 'number' && Number.isFinite(modifierBonuses[k]) ? modifierBonuses[k] : 0
      }
      row.updated_at = new Date().toISOString()
      const { error } = await supabase
        .from('character_ability_scores')
        .upsert(row, { onConflict: 'character_id' })
        .select('id')
        .single()
      if (error) {
        console.error('❌ updateAbilityBonuses 失敗:', error)
        return false
      }
      this.clearCharacterCache(characterId)
      return true
    } catch (error) {
      console.error('❌ updateAbilityBonuses 異常:', error)
      return false
    }
  }

  // 保存基礎屬性值（獨立函數）
  static async saveAbilityBaseValue(
    characterId: string,
    ability: 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma',
    value: number
  ): Promise<boolean> {
    try {
      if (!characterId || characterId.trim() === '' || characterId.length < 32) {
        console.error('saveAbilityBaseValue: 無效的 characterId:', characterId)
        return false
      }

      const { error } = await supabase
        .from('character_ability_scores')
        .upsert(
          { character_id: characterId, [ability]: value, updated_at: new Date().toISOString() },
          { onConflict: 'character_id' }
        )

      if (error) {
        console.error(`❌ 保存 ${ability} 基礎值失敗:`, error)
        return false
      }
      
      console.log(`✅ 已保存 ${ability} 基礎值: ${value}`)
      return true
    } catch (error) {
      console.error(`❌ 保存 ${ability} 基礎值異常:`, error)
      return false
    }
  }

  // 保存屬性裝備加成（獨立函數）
  static async saveAbilityBonus(
    characterId: string,
    ability: 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma',
    bonus: number
  ): Promise<boolean> {
    try {
      if (!characterId || characterId.trim() === '' || characterId.length < 32) {
        console.error('saveAbilityBonus: 無效的 characterId:', characterId)
        return false
      }

      const bonusField = `${ability}_bonus`
      const { error } = await supabase
        .from('character_ability_scores')
        .upsert(
          { character_id: characterId, [bonusField]: bonus, updated_at: new Date().toISOString() },
          { onConflict: 'character_id' }
        )

      if (error) {
        console.error(`❌ 保存 ${ability} 裝備加成失敗:`, error)
        return false
      }
      
      console.log(`✅ 已保存 ${ability} 裝備加成: ${bonus}`)
      return true
    } catch (error) {
      console.error(`❌ 保存 ${ability} 裝備加成異常:`, error)
      return false
    }
  }

  // 保存調整值額外加成（獨立函數）
  static async saveModifierBonus(
    characterId: string,
    ability: 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma',
    bonus: number
  ): Promise<boolean> {
    try {
      if (!characterId || characterId.trim() === '' || characterId.length < 32) {
        console.error('saveModifierBonus: 無效的 characterId:', characterId)
        return false
      }

      const bonusField = `${ability}_modifier_bonus`
      const { error } = await supabase
        .from('character_ability_scores')
        .upsert(
          { character_id: characterId, [bonusField]: bonus, updated_at: new Date().toISOString() },
          { onConflict: 'character_id' }
        )

      if (error) {
        console.error(`❌ 保存 ${ability} 調整值加成失敗:`, error)
        return false
      }
      
      console.log(`✅ 已保存 ${ability} 調整值加成: ${bonus}`)
      return true
    } catch (error) {
      console.error(`❌ 保存 ${ability} 調整值加成異常:`, error)
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

  // 屬性鍵（與前端 ABILITY_KEYS 一致），用於正規化 abilityBonuses / modifierBonuses
  private static readonly EXTRA_DATA_ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const

  // 正規化為 { str, dex, con, int, wis, cha } 數字物件，確保可寫入 JSONB
  private static normalizeAbilityBonusMap(obj: any): Record<string, number> {
    const out: Record<string, number> = {}
    for (const key of this.EXTRA_DATA_ABILITY_KEYS) {
      const v = obj?.[key]
      out[key] = typeof v === 'number' && Number.isFinite(v) ? v : 0
    }
    return out
  }

  // 專門更新 extra_data 的方法（修整期、名聲、屬性加成、自定義冒險紀錄等寫入 character_current_stats.extra_data）
  static async updateExtraData(characterId: string, extraData: any): Promise<boolean> {
    try {
      // 驗證 characterId
      if (!characterId || characterId.trim() === '' || characterId.length < 32) {
        console.error('❌ updateExtraData: 無效的 characterId:', characterId)
        return false
      }

      // 先查詢現有記錄（含 extra_data），用於合併，避免只更新單一區塊時覆蓋其他欄位
      const { data: existingRow, error: queryError } = await supabase
        .from('character_current_stats')
        .select('id, extra_data')
        .eq('character_id', characterId)
        .maybeSingle()

      if (queryError) {
        console.error('❌ updateExtraData 查詢現有狀態失敗:', queryError)
        return false
      }

      const existing = (existingRow?.extra_data ?? null) as Record<string, unknown> | null
      const existingEd = existing && typeof existing === 'object' && !Array.isArray(existing) ? existing : {}

      // 合併：以傳入的 extraData 為準，未傳則保留 DB 既有值。屬性額外調整值已改存 character_ability_scores，不寫入 extra_data
      const payload: Record<string, unknown> = {
        downtime: typeof extraData?.downtime === 'number' ? extraData.downtime : (typeof (existingEd as any)?.downtime === 'number' ? (existingEd as any).downtime : 0),
        renown: extraData?.renown && typeof extraData.renown === 'object'
          ? { used: Number(extraData.renown.used) || 0, total: Number(extraData.renown.total) || 0 }
          : (existingEd as any)?.renown && typeof (existingEd as any).renown === 'object'
            ? { used: Number((existingEd as any).renown.used) || 0, total: Number((existingEd as any).renown.total) || 0 }
            : { used: 0, total: 0 },
        prestige: extraData?.prestige && typeof extraData.prestige === 'object' ? extraData.prestige : (existingEd as any)?.prestige && typeof (existingEd as any).prestige === 'object' ? (existingEd as any).prestige : { org: '', level: 0, rankName: '' },
        customRecords: Array.isArray(extraData?.customRecords) ? extraData.customRecords : Array.isArray((existingEd as any)?.customRecords) ? (existingEd as any).customRecords : [],
        attacks: Array.isArray(extraData?.attacks) ? extraData.attacks : Array.isArray((existingEd as any)?.attacks) ? (existingEd as any).attacks : [],
        attack_hit_ability: extraData?.attack_hit_ability ?? extraData?.attackHitAbility ?? (existingEd as any)?.attack_hit_ability ?? 'str',
        spell_hit_ability: extraData?.spell_hit_ability ?? extraData?.spellHitAbility ?? (existingEd as any)?.spell_hit_ability ?? 'int',
      }

      // 技能相關欄位（如未傳入則保留既有 JSON 值）
      const existingSkillOverrides = (existingEd as any)?.skillBasicOverrides;
      const mergedSkillOverrides =
        extraData?.skillBasicOverrides && typeof extraData.skillBasicOverrides === 'object'
          ? extraData.skillBasicOverrides
          : existingSkillOverrides && typeof existingSkillOverrides === 'object'
            ? existingSkillOverrides
            : undefined;
      if (mergedSkillOverrides) {
        payload.skillBasicOverrides = mergedSkillOverrides;
      }

      const existingSkillBonuses = (existingEd as any)?.skillBonuses;
      const mergedSkillBonuses =
        extraData?.skillBonuses && typeof extraData.skillBonuses === 'object'
          ? extraData.skillBonuses
          : existingSkillBonuses && typeof existingSkillBonuses === 'object'
            ? existingSkillBonuses
            : undefined;
      if (mergedSkillBonuses) {
        payload.skillBonuses = mergedSkillBonuses;
      }

      if (extraData?.classes && Array.isArray(extraData.classes)) payload.classes = extraData.classes
      else if (Array.isArray((existingEd as any)?.classes)) payload.classes = (existingEd as any).classes

      if (existingRow) {
        // 記錄存在，只更新 extra_data，並用 select 確認有寫入
        const { data: updated, error } = await supabase
          .from('character_current_stats')
          .update({ extra_data: payload, updated_at: new Date().toISOString() })
          .eq('character_id', characterId)
          .select('id, extra_data')
          .single()

        if (error) {
          console.error('❌ updateExtraData 更新額外數據失敗:', error)
          return false
        }
        if (!updated) {
          console.error('❌ updateExtraData 更新後未返回列（可能 RLS 或條件未匹配）')
          return false
        }
        this.clearCharacterCache(characterId)
        return true
      }

      // 記錄不存在，創建新記錄（含 extra_data）
      const { data: inserted, error } = await supabase
        .from('character_current_stats')
        .insert({
          character_id: characterId,
          current_hp: 1,
          temporary_hp: 0,
          current_hit_dice: 0,
          total_hit_dice: 1,
          hit_die_type: 'd8',
          max_hp_basic: 1,
          max_hp_bonus: 0,
          ac_basic: 10,
          ac_bonus: 0,
          initiative_basic: 0,
          initiative_bonus: 0,
          speed_basic: 30,
          speed_bonus: 0,
          attack_hit_basic: 0,
          attack_hit_bonus: 0,
          attack_damage_basic: 0,
          attack_damage_bonus: 0,
          spell_hit_basic: 2,
          spell_hit_bonus: 0,
          spell_dc_basic: 10,
          spell_dc_bonus: 0,
          extra_data: payload,
          updated_at: new Date().toISOString()
        })
        .select('id, extra_data')
        .single()

      if (error) {
        console.error('❌ updateExtraData 創建角色狀態記錄失敗:', error)
        return false
      }
      if (!inserted) {
        console.error('❌ updateExtraData 插入後未返回列')
        return false
      }
      this.clearCharacterCache(characterId)
      return true
    } catch (error) {
      console.error('❌ updateExtraData 異常:', error)
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

    const cs = fullData.currentStats
    const hpMax = (cs.max_hp_basic ?? 1) + (cs.max_hp_bonus ?? 0)

    return {
      name: fullData.character.name,
      class: fullData.character.character_class || (fullData.character as any).class || '戰士',
      level: fullData.character.level,
      exp: fullData.character.experience,
      hp: {
        current: fullData.currentStats.current_hp,
        max: hpMax,
        temp: fullData.currentStats.temporary_hp
      },
      hitDice: {
        current: fullData.currentStats.current_hit_dice,
        total: fullData.currentStats.total_hit_dice,
        die: fullData.currentStats.hit_die_type
      },
      ac: { basic: cs.ac_basic ?? 10, bonus: cs.ac_bonus ?? 0 },
      initiative: { basic: cs.initiative_basic ?? 0, bonus: cs.initiative_bonus ?? 0 },
      speed: { basic: cs.speed_basic ?? 30, bonus: cs.speed_bonus ?? 0 },
      maxHp: { basic: cs.max_hp_basic ?? 1, bonus: cs.max_hp_bonus ?? 0 },
      attackHit: { basic: cs.attack_hit_basic ?? 0, bonus: cs.attack_hit_bonus ?? 0 },
      attackDamage: { basic: cs.attack_damage_basic ?? 0, bonus: cs.attack_damage_bonus ?? 0 },
      spellHit: { basic: cs.spell_hit_basic ?? 2, bonus: cs.spell_hit_bonus ?? 0 },
      spellDc: { basic: cs.spell_dc_basic ?? 10, bonus: cs.spell_dc_bonus ?? 0 },
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
      skillBonuses: (() => {
        const out: Record<string, number> = {}
        fullData.skillProficiencies.forEach((p: any) => {
          if (p?.skill_name != null && typeof p.misc_bonus === 'number') out[p.skill_name] = p.misc_bonus
        })
        return Object.keys(out).length ? out : undefined
      })(),
      saveBonuses: (() => {
        const abilityMap: Record<string, string> = { strength: 'str', dexterity: 'dex', constitution: 'con', intelligence: 'int', wisdom: 'wis', charisma: 'cha' }
        const out: Record<string, number> = {}
        fullData.savingThrows.forEach((s: any) => {
          if (s?.ability != null && typeof s.misc_bonus === 'number') out[abilityMap[s.ability] ?? s.ability] = s.misc_bonus
        })
        return Object.keys(out).length ? out : undefined
      })(),
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
      id: '', // 預設物件，不寫入 DB
      character_id: '',
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
      updated_at: ''
    }
  }

  // 獲取預設當前狀態（不寫入資料庫）
  private static getDefaultCurrentStats(): CharacterCurrentStats {
    return {
      id: '', // 預設物件，不寫入 DB
      character_id: '',
      current_hp: 20,
      temporary_hp: 0,
      current_hit_dice: 1,
      total_hit_dice: 1,
      hit_die_type: 'd8',
      max_hp_basic: 20,
      max_hp_bonus: 0,
      ac_basic: 10,
      ac_bonus: 0,
      initiative_basic: 0,
      initiative_bonus: 0,
      speed_basic: 30,
      speed_bonus: 0,
      attack_hit_basic: 0,
      attack_hit_bonus: 0,
      attack_damage_basic: 0,
      attack_damage_bonus: 0,
      spell_hit_basic: 2,
      spell_hit_bonus: 0,
      spell_dc_basic: 10,
      spell_dc_bonus: 0,
      updated_at: ''
    }
  }

  // 獲取預設貨幣（不寫入資料庫）
  private static getDefaultCurrency(): CharacterCurrency {
    return {
      id: '', // 預設物件，不寫入 DB
      character_id: '',
      copper: 0,
      silver: 0,
      electrum: 0,
      gp: 150,
      platinum: 0,
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
    const acVal = typeof stats?.ac === 'object' ? (stats.ac.basic + stats.ac.bonus) : (stats?.ac ?? 10)
    const initVal = typeof stats?.initiative === 'object' ? (stats.initiative.basic + stats.initiative.bonus) : (stats?.initiative ?? 0)
    const speedVal = typeof stats?.speed === 'object' ? (stats.speed.basic + stats.speed.bonus) : (stats?.speed ?? 30)
    const attackHitVal = typeof stats?.attackHit === 'object' ? (stats.attackHit.basic + stats.attackHit.bonus) : (stats?.attackHit ?? (stats as any)?.weapon_attack_bonus ?? 0)
    const attackDmgVal = typeof stats?.attackDamage === 'object' ? (stats.attackDamage.basic + stats.attackDamage.bonus) : (stats?.attackDamage ?? (stats as any)?.weapon_damage_bonus ?? 0)
    const spellHitVal = typeof stats?.spellHit === 'object' ? (stats.spellHit.basic + stats.spellHit.bonus) : (stats?.spellHit ?? (stats as any)?.spell_attack_bonus ?? 2)
    const spellDcVal = typeof stats?.spellDc === 'object' ? (stats.spellDc.basic + stats.spellDc.bonus) : (stats?.spellDc ?? (stats as any)?.spell_save_dc ?? 10)

    const { data, error } = await supabase
      .from('character_current_stats')
      .insert([{
        character_id: characterId,
        current_hp: stats?.hp?.current ?? 20,
        max_hp_basic: typeof stats?.maxHp === 'object' ? stats.maxHp.basic : (stats?.hp?.max ?? 20),
        max_hp_bonus: typeof stats?.maxHp === 'object' ? stats.maxHp.bonus : 0,
        temporary_hp: stats?.hp?.temp ?? 0,
        current_hit_dice: stats?.hitDice?.current ?? 1,
        total_hit_dice: stats?.hitDice?.total ?? 1,
        hit_die_type: stats?.hitDice?.die ?? 'd8',
        ac_basic: typeof stats?.ac === 'object' ? stats.ac.basic : acVal,
        ac_bonus: typeof stats?.ac === 'object' ? stats.ac.bonus : 0,
        initiative_basic: typeof stats?.initiative === 'object' ? stats.initiative.basic : initVal,
        initiative_bonus: typeof stats?.initiative === 'object' ? stats.initiative.bonus : 0,
        speed_basic: typeof stats?.speed === 'object' ? stats.speed.basic : speedVal,
        speed_bonus: typeof stats?.speed === 'object' ? stats.speed.bonus : 0,
        attack_hit_basic: typeof stats?.attackHit === 'object' ? stats.attackHit.basic : attackHitVal,
        attack_hit_bonus: typeof stats?.attackHit === 'object' ? stats.attackHit.bonus : 0,
        attack_damage_basic: typeof stats?.attackDamage === 'object' ? stats.attackDamage.basic : attackDmgVal,
        attack_damage_bonus: typeof stats?.attackDamage === 'object' ? stats.attackDamage.bonus : 0,
        spell_hit_basic: typeof stats?.spellHit === 'object' ? stats.spellHit.basic : spellHitVal,
        spell_hit_bonus: typeof stats?.spellHit === 'object' ? stats.spellHit.bonus : 0,
        spell_dc_basic: typeof stats?.spellDc === 'object' ? stats.spellDc.basic : spellDcVal,
        spell_dc_bonus: typeof stats?.spellDc === 'object' ? stats.spellDc.bonus : 0
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

  // === 能力／物品數值加成統計（stat_bonuses 聚合） ===

  /**
   * 從角色擁有的能力與物品（global_items）上，聚合所有 stat_bonuses。
   * - abilities.stat_bonuses：透過 character_abilities -> abilities 關聯取得
   * - global_items.stat_bonuses：透過 character_items -> global_items 關聯取得
   * - 特殊能力（依 name_en 對應）：需傳入 context（level、classes），計算後併入 bySource 與 totals
   */
  static async collectSourceBonusesForCharacter(
    characterId: string,
    context?: SpecialEffectContext
  ): Promise<AggregatedStatBonuses> {
    const empty: AggregatedStatBonuses = {
      abilityScores: {},
      abilityModifiers: {},
      savingThrows: {},
      skills: {},
      combatStats: {},
      bySource: []
    }

    if (!characterId || characterId.trim() === '' || characterId.length < 32) {
      console.error('collectSourceBonusesForCharacter: 無效的 characterId:', characterId)
      return empty
    }

    // 小工具：將 stat_bonuses 物件安全地規範化後累加到 totals 與 perSource
    const mergeNumberMap = (target: Record<string, number>, src: any) => {
      if (!src || typeof src !== 'object') return
      for (const [k, v] of Object.entries(src)) {
        const num = typeof v === 'number' && Number.isFinite(v) ? v : 0
        if (!num) continue
        target[k] = (target[k] ?? 0) + num
      }
    }

    const mergeCombatStats = (target: AggregatedStatBonuses['combatStats'], src: any) => {
      if (!src || typeof src !== 'object') return
      const keys: (keyof AggregatedStatBonuses['combatStats'])[] = [
        'ac',
        'initiative',
        'maxHp',
        'speed',
        'attackHit',
        'attackDamage',
        'spellHit',
        'spellDc'
      ]
      for (const key of keys) {
        const v = (src as any)[key]
        const num = typeof v === 'number' && Number.isFinite(v) ? v : 0
        if (!num) continue
        target[key] = (target[key] ?? 0) + num
      }
    }

    const totals: AggregatedStatBonuses = {
      abilityScores: {},
      abilityModifiers: {},
      savingThrows: {},
      skills: {},
      combatStats: {},
      bySource: []
    }

    try {
      // 1. 角色能力 -> abilities（優先使用 character_abilities 的 affects_stats / stat_bonuses 覆寫；個人能力 ability_id 為 null 時只用 row）
      const { data: characterAbilities, error: caError } = await supabase
        .from('character_abilities')
        .select(`
          id,
          character_id,
          ability_id,
          name_override,
          affects_stats,
          stat_bonuses,
          ability:abilities(
            id,
            name,
            name_en,
            affects_stats,
            stat_bonuses
          )
        `)
        .eq('character_id', characterId)

      if (caError) {
        console.error('collectSourceBonusesForCharacter: 讀取角色能力失敗:', caError)
      } else if (Array.isArray(characterAbilities)) {
        for (const row of characterAbilities as any[]) {
          const abilityRaw = Array.isArray(row.ability) ? row.ability[0] : row.ability
          const hasOverride =
            (typeof row.affects_stats === 'boolean' && row.affects_stats) ||
            (row.stat_bonuses && typeof row.stat_bonuses === 'object' && Object.keys(row.stat_bonuses).length > 0)
          const bonuses = (hasOverride ? row.stat_bonuses : abilityRaw?.stat_bonuses) as any
          const effectId = getSpecialEffectId(bonuses)
          const isSpecial = !!(effectId && context)
          const effectiveAffectsStats = hasOverride ? !!row.affects_stats : !!abilityRaw?.affects_stats
          if (!effectiveAffectsStats && !isSpecial) continue

          const hasBonuses = bonuses && typeof bonuses === 'object'
          if (!hasBonuses && !isSpecial) continue

          const abilityScores = hasBonuses ? bonuses.abilityScores : undefined
          const abilityModifiers = hasBonuses ? bonuses.abilityModifiers : undefined
          const savingThrows = hasBonuses ? bonuses.savingThrows : undefined
          const skills = hasBonuses ? bonuses.skills : undefined
          const combatStats = hasBonuses ? bonuses.combatStats : undefined
          const savingThrowAdvantage = hasBonuses && Array.isArray(bonuses.savingThrowAdvantage) ? bonuses.savingThrowAdvantage : undefined
          const savingThrowDisadvantage = hasBonuses && Array.isArray(bonuses.savingThrowDisadvantage) ? bonuses.savingThrowDisadvantage : undefined
          const skillAdvantage = hasBonuses && Array.isArray(bonuses.skillAdvantage) ? bonuses.skillAdvantage : undefined
          const skillDisadvantage = hasBonuses && Array.isArray(bonuses.skillDisadvantage) ? bonuses.skillDisadvantage : undefined

          const perSource: {
            id: string
            type: 'ability'
            name: string
            abilityScores?: Record<string, number>
            abilityModifiers?: Record<string, number>
            savingThrows?: Record<string, number>
            skills?: Record<string, number>
            savingThrowAdvantage?: string[]
            savingThrowDisadvantage?: string[]
            skillAdvantage?: string[]
            skillDisadvantage?: string[]
            combatStats?: AggregatedStatBonuses['combatStats']
          } = {
            id: row.id,
            type: 'ability',
            name: (row.name_override || abilityRaw.name || '').toString()
          }

          if (abilityScores && typeof abilityScores === 'object') {
            const map: Record<string, number> = {}
            mergeNumberMap(map, abilityScores)
            if (Object.keys(map).length) {
              perSource.abilityScores = map
              mergeNumberMap(totals.abilityScores, map)
            }
          }

          if (abilityModifiers && typeof abilityModifiers === 'object') {
            const map: Record<string, number> = {}
            mergeNumberMap(map, abilityModifiers)
            if (Object.keys(map).length) {
              perSource.abilityModifiers = map
              mergeNumberMap(totals.abilityModifiers, map)
            }
          }

          if (savingThrows && typeof savingThrows === 'object') {
            const map: Record<string, number> = {}
            mergeNumberMap(map, savingThrows)
            if (Object.keys(map).length) {
              perSource.savingThrows = map
              mergeNumberMap(totals.savingThrows, map)
            }
          }

          if (skills && typeof skills === 'object') {
            const map: Record<string, number> = {}
            mergeNumberMap(map, skills)
            if (Object.keys(map).length) {
              perSource.skills = map
              mergeNumberMap(totals.skills, map)
            }
          }

          if (combatStats && typeof combatStats === 'object') {
            const cs: AggregatedStatBonuses['combatStats'] = {}
            mergeCombatStats(cs, combatStats)
            if (Object.keys(cs).length) {
              perSource.combatStats = cs
              mergeCombatStats(totals.combatStats, cs)
            }
          }

          if (isSpecial && context && effectId) {
            const specialBonus = getSpecialEffectCombatBonus(effectId, context)
            if (specialBonus && typeof specialBonus === 'object' && Object.keys(specialBonus).length > 0) {
              if (!perSource.combatStats) perSource.combatStats = {}
              mergeCombatStats(perSource.combatStats, specialBonus)
              mergeCombatStats(totals.combatStats, specialBonus)
            }
          }

          if (savingThrowAdvantage?.length) perSource.savingThrowAdvantage = savingThrowAdvantage
          if (savingThrowDisadvantage?.length) perSource.savingThrowDisadvantage = savingThrowDisadvantage
          if (skillAdvantage?.length) perSource.skillAdvantage = skillAdvantage
          if (skillDisadvantage?.length) perSource.skillDisadvantage = skillDisadvantage

          if (perSource.abilityScores || perSource.abilityModifiers || perSource.savingThrows || perSource.skills || perSource.combatStats ||
              perSource.savingThrowAdvantage || perSource.savingThrowDisadvantage || perSource.skillAdvantage || perSource.skillDisadvantage) {
            totals.bySource.push(perSource)
          }
        }
      }

      // 2. 角色物品 -> global_items（僅「穿戴中」is_equipped 的裝備計入數值；優先使用 character_items 的 affects_stats / stat_bonuses 覆寫）
      const { data: characterItems, error: ciError } = await supabase
        .from('character_items')
        .select(`
          id,
          character_id,
          item_id,
          name_override,
          affects_stats,
          stat_bonuses,
          is_equipped,
          item:global_items(
            id,
            name,
            affects_stats,
            stat_bonuses
          )
        `)
        .eq('character_id', characterId)

      if (ciError) {
        console.error('collectSourceBonusesForCharacter: 讀取角色物品失敗:', ciError)
      } else if (Array.isArray(characterItems)) {
        for (const row of characterItems as any[]) {
          if (row.is_equipped !== true) continue
          const itemRaw = Array.isArray(row.item) ? row.item[0] : row.item
          const hasOverride =
            (typeof row.affects_stats === 'boolean' && row.affects_stats) ||
            (row.stat_bonuses && typeof row.stat_bonuses === 'object' && Object.keys(row.stat_bonuses).length > 0)
          const effectiveAffectsStats = hasOverride ? !!row.affects_stats : !!itemRaw?.affects_stats
          if (!effectiveAffectsStats) continue

          const bonuses = (hasOverride ? row.stat_bonuses : itemRaw?.stat_bonuses) as any
          if (!bonuses || typeof bonuses !== 'object') continue

          const abilityScores = bonuses.abilityScores
          const abilityModifiers = bonuses.abilityModifiers
          const savingThrows = bonuses.savingThrows
          const skills = bonuses.skills
          const combatStats = bonuses.combatStats
          const savingThrowAdvantage = Array.isArray(bonuses.savingThrowAdvantage) ? bonuses.savingThrowAdvantage : undefined
          const savingThrowDisadvantage = Array.isArray(bonuses.savingThrowDisadvantage) ? bonuses.savingThrowDisadvantage : undefined
          const skillAdvantage = Array.isArray(bonuses.skillAdvantage) ? bonuses.skillAdvantage : undefined
          const skillDisadvantage = Array.isArray(bonuses.skillDisadvantage) ? bonuses.skillDisadvantage : undefined

          const perSource: {
            id: string
            type: 'item'
            name: string
            abilityScores?: Record<string, number>
            abilityModifiers?: Record<string, number>
            savingThrows?: Record<string, number>
            skills?: Record<string, number>
            savingThrowAdvantage?: string[]
            savingThrowDisadvantage?: string[]
            skillAdvantage?: string[]
            skillDisadvantage?: string[]
            combatStats?: AggregatedStatBonuses['combatStats']
          } = {
            id: row.id,
            type: 'item',
            name: (row.name_override || itemRaw.name || '').toString()
          }

          if (abilityScores && typeof abilityScores === 'object') {
            const map: Record<string, number> = {}
            mergeNumberMap(map, abilityScores)
            if (Object.keys(map).length) {
              perSource.abilityScores = map
              mergeNumberMap(totals.abilityScores, map)
            }
          }

          if (abilityModifiers && typeof abilityModifiers === 'object') {
            const map: Record<string, number> = {}
            mergeNumberMap(map, abilityModifiers)
            if (Object.keys(map).length) {
              perSource.abilityModifiers = map
              mergeNumberMap(totals.abilityModifiers, map)
            }
          }

          if (savingThrows && typeof savingThrows === 'object') {
            const map: Record<string, number> = {}
            mergeNumberMap(map, savingThrows)
            if (Object.keys(map).length) {
              perSource.savingThrows = map
              mergeNumberMap(totals.savingThrows, map)
            }
          }

          if (skills && typeof skills === 'object') {
            const map: Record<string, number> = {}
            mergeNumberMap(map, skills)
            if (Object.keys(map).length) {
              perSource.skills = map
              mergeNumberMap(totals.skills, map)
            }
          }

          if (combatStats && typeof combatStats === 'object') {
            const cs: AggregatedStatBonuses['combatStats'] = {}
            mergeCombatStats(cs, combatStats)
            if (Object.keys(cs).length) {
              perSource.combatStats = cs
              mergeCombatStats(totals.combatStats, cs)
            }
          }

          if (savingThrowAdvantage?.length) perSource.savingThrowAdvantage = savingThrowAdvantage
          if (savingThrowDisadvantage?.length) perSource.savingThrowDisadvantage = savingThrowDisadvantage
          if (skillAdvantage?.length) perSource.skillAdvantage = skillAdvantage
          if (skillDisadvantage?.length) perSource.skillDisadvantage = skillDisadvantage

          if (perSource.abilityScores || perSource.abilityModifiers || perSource.savingThrows || perSource.skills || perSource.combatStats ||
              perSource.savingThrowAdvantage || perSource.savingThrowDisadvantage || perSource.skillAdvantage || perSource.skillDisadvantage) {
            totals.bySource.push(perSource)
          }
        }
      }

      const resolved = computeSaveAndSkillAdvantageDisadvantage(totals.bySource)
      totals.saveAdvantageDisadvantage = resolved.saveAdvantageDisadvantage
      totals.skillAdvantageDisadvantage = resolved.skillAdvantageDisadvantage
    } catch (error) {
      console.error('collectSourceBonusesForCharacter: 聚合 stat_bonuses 時發生錯誤:', error)
      // 發生錯誤時回傳目前已累計的數值（通常是全空），避免整體流程崩潰
    }

    return totals
  }

  // === 刪除角色 ===

  /**
   * 刪除角色及其所有關聯資料
   * @param characterId 角色ID
   * @returns 是否成功刪除
   */
  static async deleteCharacter(characterId: string): Promise<boolean> {
    try {
      console.log('🗑️ 開始刪除角色:', characterId)
      
      // 驗證 characterId
      if (!characterId || characterId.trim() === '' || characterId.length < 32) {
        console.error('❌ deleteCharacter: 無效的 characterId:', characterId)
        return false
      }

      // 檢查角色是否存在並驗證權限
      const { data: character, error: fetchError } = await supabase
        .from('characters')
        .select('id, user_id, anonymous_id')
        .eq('id', characterId)
        .single()

      if (fetchError || !character) {
        console.error('❌ 角色不存在或無權限刪除:', fetchError)
        return false
      }

      // 刪除角色（ON DELETE CASCADE 會自動刪除所有關聯資料）
      const { error: deleteError } = await supabase
        .from('characters')
        .delete()
        .eq('id', characterId)

      if (deleteError) {
        console.error('❌ 刪除角色失敗:', deleteError)
        return false
      }

      // 清除緩存
      this.clearCharacterCache(characterId)
      console.log('✅ 角色刪除成功:', characterId)
      
      return true
    } catch (error) {
      console.error('❌ 刪除角色時發生錯誤:', error)
      return false
    }
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

  // 創建預設戰鬥項目
  private static async createDefaultCombatActions(characterId: string): Promise<void> {
    const defaultActions = [
      // 動作 (Action)
      { name: '攻擊', icon: '⚔️', category: 'action', recovery_type: 'turn' },
      { name: '疾跑', icon: '🏃', category: 'action', recovery_type: 'turn' },
      { name: '撤離', icon: '💨', category: 'action', recovery_type: 'turn' },
      { name: '閃避', icon: '🛡️', category: 'action', recovery_type: 'turn' },
      { name: '幫助', icon: '🤝', category: 'action', recovery_type: 'turn' },
      { name: '躲藏', icon: '👤', category: 'action', recovery_type: 'turn' },
      { name: '搜尋', icon: '🔍', category: 'action', recovery_type: 'turn' },
      { name: '準備動作', icon: '⏳', category: 'action', recovery_type: 'turn' },
      { name: '使用物品', icon: '🎒', category: 'action', recovery_type: 'turn' },
      // 附贈動作 (Bonus Action)
      { name: '副手攻擊', icon: '🗡️', category: 'bonus_action', recovery_type: 'turn' },
      { name: '藥水', icon: '🧪', category: 'bonus_action', recovery_type: 'turn' },
      // 反應 (Reaction)
      { name: '藉機攻擊', icon: '❗', category: 'reaction', recovery_type: 'turn' }
    ]

    try {
      const insertData = defaultActions.map(action => ({
        character_id: characterId,
        name: action.name,
        icon: action.icon,
        category: action.category,
        current_uses: 1,
        max_uses: 1,
        recovery_type: action.recovery_type,
        is_default: true,
        is_custom: false
      }))

      const { error } = await supabase
        .from('character_combat_actions')
        .insert(insertData)

      if (error) {
        console.error('創建預設戰鬥項目失敗:', error)
      } else {
        console.log(`✅ 成功創建 ${defaultActions.length} 個預設戰鬥項目`)
      }
    } catch (error) {
      console.error('創建預設戰鬥項目時發生錯誤:', error)
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