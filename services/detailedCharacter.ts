import { supabase } from '../lib/supabase'
import { AnonymousService } from './anonymous'
import { DatabaseInitService } from './databaseInit'
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
  
  // 檢查當前用戶狀態（認證或匿名）
  private static async getCurrentUserContext(): Promise<{
    isAuthenticated: boolean,
    userId?: string,
    anonymousId?: string
  }> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      return { isAuthenticated: true, userId: user.id }
    } else {
      const anonymousId = AnonymousService.getAnonymousId()
      return { isAuthenticated: false, anonymousId }
    }
  }

  // 獲取用戶的角色列表
  static async getUserCharacters(): Promise<Character[]> {
    try {
      const context = await this.getCurrentUserContext()
      
      let query = supabase.from('characters').select('*')
      
      if (context.isAuthenticated) {
        query = query.eq('user_id', context.userId)
      } else {
        query = query.eq('anonymous_id', context.anonymousId)
      }
      
      const { data, error } = await query
      if (error) throw error
      
      return data || []
    } catch (error) {
      console.error('獲取角色列表失敗:', error)
      return []
    }
  }

  // 獲取完整的角色資料
  static async getFullCharacter(characterId: string): Promise<FullCharacterData | null> {
    try {
      const context = await this.getCurrentUserContext()
      
      // 驗證角色所有權
      let ownerQuery = supabase.from('characters').select('*').eq('id', characterId)
      
      if (context.isAuthenticated) {
        ownerQuery = ownerQuery.eq('user_id', context.userId)
      } else {
        ownerQuery = ownerQuery.eq('anonymous_id', context.anonymousId)
      }
      
      const { data: ownerCheck, error: ownerError } = await ownerQuery.single()
      if (ownerError || !ownerCheck) {
        console.error('角色不存在或無權限訪問')
        return null
      }

      // 並行獲取所有資料
      const [
        characterResult,
        abilityScoresResult,
        savingThrowsResult,
        skillsResult,
        currentStatsResult,
        currencyResult,
        itemsResult,
        spellsResult,
        spellSlotsResult,
        combatActionsResult
      ] = await Promise.all([
        supabase.from('characters').select('*').eq('id', characterId).single(),
        supabase.from('character_ability_scores').select('*').eq('character_id', characterId).single(),
        supabase.from('character_saving_throws').select('*').eq('character_id', characterId),
        supabase.from('character_skill_proficiencies').select('*').eq('character_id', characterId),
        supabase.from('character_current_stats').select('*').eq('character_id', characterId).single(),
        supabase.from('character_currency').select('*').eq('character_id', characterId).single(),
        supabase.from('character_items').select('*').eq('character_id', characterId),
        supabase.from('character_spells').select('*').eq('character_id', characterId),
        supabase.from('character_spell_slots').select('*').eq('character_id', characterId),
        supabase.from('character_combat_actions').select('*').eq('character_id', characterId)
      ])

      if (characterResult.error) throw characterResult.error

      return {
        character: characterResult.data,
        abilityScores: abilityScoresResult.data || await this.createDefaultAbilityScores(characterId),
        savingThrows: savingThrowsResult.data || [],
        skillProficiencies: skillsResult.data || [],
        currentStats: currentStatsResult.data || await this.createDefaultCurrentStats(characterId),
        currency: currencyResult.data || await this.createDefaultCurrency(characterId),
        items: itemsResult.data || [],
        spells: spellsResult.data || [],
        spellSlots: spellSlotsResult.data || [],
        combatActions: combatActionsResult.data || []
      }
    } catch (error) {
      console.error('獲取完整角色資料失敗:', error)
      return null
    }
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
      
      // 根據資料庫結構選擇正確的欄位名稱
      if (DatabaseInitService.usesOldSchema()) {
        insertData.class = characterData.class
      } else {
        insertData.character_class = characterData.class
      }

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
      const { error } = await supabase
        .from('character_ability_scores')
        .update({ ...scores, updated_at: new Date().toISOString() })
        .eq('character_id', characterId)

      return !error
    } catch (error) {
      console.error('更新屬性分數失敗:', error)
      return false
    }
  }

  // 更新當前狀態（血量、護甲值等）
  static async updateCurrentStats(characterId: string, stats: Partial<CharacterCurrentStats>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('character_current_stats')
        .update({ ...stats, updated_at: new Date().toISOString() })
        .eq('character_id', characterId)

      return !error
    } catch (error) {
      console.error('更新當前狀態失敗:', error)
      return false
    }
  }

  // 更新貨幣
  static async updateCurrency(characterId: string, currency: Partial<CharacterCurrency>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('character_currency')
        .update({ ...currency, updated_at: new Date().toISOString() })
        .eq('character_id', characterId)

      return !error
    } catch (error) {
      console.error('更新貨幣失敗:', error)
      return false
    }
  }

  // 更新技能熟練度
  static async updateSkillProficiency(characterId: string, skillName: string, level: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('character_skill_proficiencies')
        .upsert({
          character_id: characterId,
          skill_name: skillName,
          proficiency_level: level,
          updated_at: new Date().toISOString()
        })

      return !error
    } catch (error) {
      console.error('更新技能熟練度失敗:', error)
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
        gp: fullData.currency.gold,
        pp: fullData.currency.platinum
      },
      customRecords: []
    }
  }

  // === 私有輔助方法 ===

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
        gold: currency?.gp || 150,
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
      const anonymousId = AnonymousService.getCurrentAnonymousId()
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
      const anonymousId = AnonymousService.getCurrentAnonymousId()
      if (!anonymousId) return false

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