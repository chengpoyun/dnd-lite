import { CombatItemService, CacheService } from './database'
import { DetailedCharacterService } from './detailedCharacter'
import { supabase } from '../lib/supabase'
import type { CharacterStats, CombatItem as LocalCombatItem } from '../types'

// 從 localStorage 遷移到 Supabase 的工具
export class MigrationService {
  
  // 遷移現有的角色資料
  static async migrateCharacterData(characterName: string = '我的角色'): Promise<string | null> {
    try {
      // 從 localStorage 讀取現有資料
      const existingStats = this.getExistingCharacterStats()
      
      if (!existingStats) {
        console.log('沒有找到現有的角色資料')
        return null
      }

      // 建立新角色（使用新的詳細資料庫結構）
      const fullCharacter = await DetailedCharacterService.createCharacter({
        name: characterName,
        class: existingStats.class,
        level: existingStats.level,
        stats: existingStats
      })

      if (!fullCharacter) {
        throw new Error('建立角色失敗')
      }

      console.log(`角色 "${characterName}" 遷移成功，ID: ${fullCharacter.character.id}`)
      
      // 遷移戰鬥項目
      await this.migrateCombatItems(fullCharacter.character.id)
      
      return fullCharacter.character.id
    } catch (error) {
      console.error('角色資料遷移失敗:', error)
      return null
    }
  }

  // 遷移所有舊格式角色資料到新結構
  static async migrateAllCharacters(): Promise<{ success: number; failed: number }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.warn('用戶未登入')
        return { success: 0, failed: 0 }
      }

      // 獲取舊格式的角色
      const { data: oldCharacters } = await supabase
        .from('characters')
        .select('*')
        .eq('user_id', user.id)
        .not('stats', 'is', null)

      let success = 0
      let failed = 0

      for (const oldCharacter of oldCharacters || []) {
        try {
          // 由於 stats 欄位已被移除，使用預設值進行遷移
          await this.migrateCharacterToDetailedStructure(oldCharacter.id, null)
          success++
        } catch (error) {
          console.error(`遷移角色 ${oldCharacter.id} 失敗:`, error)
          failed++
        }
      }

      return { success, failed }
    } catch (error) {
      console.error('批量遷移失敗:', error)
      return { success: 0, failed: 0 }
    }
  }

  // 遷移單個角色到詳細結構
  static async migrateCharacterToDetailedStructure(characterId: string, stats: CharacterStats | null): Promise<boolean> {
    try {
      // 如果沒有 stats 資料，使用預設值
      const defaultStats = {
        name: "角色",
        class: "戰士", 
        level: 1,
        exp: 0,
        hp: { current: 10, max: 10, temp: 0 },
        hitDice: { current: 1, total: 1, die: "d8" },
        ac: 10,
        initiative: 0,
        speed: 30,
        abilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
        proficiencies: {},
        savingThrows: {},
        currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 }
      }
      
      const characterStats = stats || defaultStats

      // 更新角色基本資料
      await supabase
        .from('characters')
        .update({
          name: characterStats.name,
          character_class: characterStats.class,
          level: characterStats.level,
          experience: characterStats.exp
        })
        .eq('id', characterId)

      // 創建屬性分數
      await supabase
        .from('character_ability_scores')
        .upsert({
          character_id: characterId,
          strength: characterStats.abilityScores.str,
          dexterity: characterStats.abilityScores.dex,
          constitution: characterStats.abilityScores.con,
          intelligence: characterStats.abilityScores.int,
          wisdom: characterStats.abilityScores.wis,
          charisma: characterStats.abilityScores.cha
        })

      // 創建豁免骰資料
      if (characterStats.savingThrows) {
        const savingThrows = Object.entries(characterStats.savingThrows).map(([ability, isProficient]) => ({
          character_id: characterId,
          ability,
          is_proficient: isProficient
        }))
        
        await supabase
          .from('character_saving_throws')
          .upsert(savingThrows)
      }

      // 創建技能熟練度
      if (characterStats.proficiencies) {
        const skills = Object.entries(characterStats.proficiencies).map(([skillName, level]) => ({
          character_id: characterId,
          skill_name: skillName,
          proficiency_level: level
        }))
        
        await supabase
          .from('character_skill_proficiencies')
          .upsert(skills)
      }

      // 創建當前狀態
      await supabase
        .from('character_current_stats')
        .upsert({
          character_id: characterId,
          current_hp: characterStats.hp.current,
          max_hp: characterStats.hp.max,
          temporary_hp: characterStats.hp.temp,
          current_hit_dice: characterStats.hitDice.current,
          total_hit_dice: characterStats.hitDice.total,
          hit_die_type: characterStats.hitDice.die,
          armor_class: characterStats.ac,
          initiative_bonus: characterStats.initiative,
          speed: characterStats.speed
        })

      // 創建貨幣
      if (characterStats.currency) {
        await supabase
          .from('character_currency')
          .upsert({
            character_id: characterId,
            copper: characterStats.currency.cp,
            silver: characterStats.currency.sp,
            electrum: characterStats.currency.ep,
            gp: characterStats.currency.gp,
            platinum: characterStats.currency.pp
          })
      }

      // 遷移完成後清除舊的 stats 欄位
      await supabase
        .from('characters')
        .update({ stats: null })
        .eq('id', characterId)

      console.log(`角色 ${characterId} 遷移到詳細結構成功`)
      return true
    } catch (error) {
      console.error(`遷移角色 ${characterId} 到詳細結構失敗:`, error)
      return false
    }
  }

  // 檢查是否需要遷移到詳細結構
  static async needsDetailedMigration(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false

      const { data } = await supabase
        .from('characters')
        .select('id')
        .eq('user_id', user.id)
        .not('stats', 'is', null)
        .limit(1)

      return (data && data.length > 0) || false
    } catch (error) {
      console.error('檢查詳細遷移狀態失敗:', error)
      return false
    }
  }

  // 備份舊資料
  static async backupOldData(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false

      const { data: oldCharacters } = await supabase
        .from('characters')
        .select('*')
        .eq('user_id', user.id)
        .not('stats', 'is', null)

      // 存儲到 localStorage 作為備份
      if (oldCharacters && oldCharacters.length > 0) {
        localStorage.setItem('dnd_backup_old_characters', JSON.stringify(oldCharacters))
        console.log(`已備份 ${oldCharacters.length} 個角色的舊資料`)
      }

      return true
    } catch (error) {
      console.error('備份舊資料失敗:', error)
      return false
    }
  }

  // 遷移戰鬥項目
  static async migrateCombatItems(characterId: string): Promise<void> {
    try {
      const combatData = this.getExistingCombatData()
      
      if (!combatData) {
        console.log('沒有找到現有的戰鬥項目')
        return
      }

      const allItems = [
        ...combatData.actions.map(item => ({ ...item, category: 'action' as const })),
        ...combatData.bonusActions.map(item => ({ ...item, category: 'bonus_action' as const })),
        ...combatData.reactions.map(item => ({ ...item, category: 'reaction' as const })),
        ...combatData.resources.map(item => ({ ...item, category: 'resource' as const }))
      ]

      // 過濾掉預設項目，只遷移自定義項目
      const customItems = allItems.filter(item => !this.isDefaultItem(item))

      console.log(`找到 ${customItems.length} 個自定義戰鬥項目`)

      // 批量建立戰鬥項目
      for (const item of customItems) {
        const newItem = await CombatItemService.createCombatItem({
          character_id: characterId,
          category: item.category,
          name: item.name,
          icon: item.icon,
          max_uses: item.max,
          current_uses: item.current,
          recovery_type: this.mapRecoveryToDb(item.recovery),
          is_default: false
        })

        if (newItem) {
          console.log(`戰鬥項目 "${item.name}" 遷移成功`)
        }
      }

      console.log('戰鬥項目遷移完成')
    } catch (error) {
      console.error('戰鬥項目遷移失敗:', error)
    }
  }

  // 恢復類型映射
  private static mapRecoveryToDb(recovery: string): string {
    const mapping = {
      'round': 'turn',
      'short': 'short_rest', 
      'long': 'long_rest'
    };
    return mapping[recovery] || 'long_rest';
  }

  // 從 localStorage 取得現有角色數據
  private static getExistingCharacterStats(): CharacterStats | null {
    try {
      const statsString = localStorage.getItem('dnd_character_stats')
      return statsString ? JSON.parse(statsString) : null
    } catch {
      return null
    }
  }

  // 從 localStorage 取得現有戰鬥資料
  private static getExistingCombatData(): {
    actions: LocalCombatItem[]
    bonusActions: LocalCombatItem[]
    reactions: LocalCombatItem[]
    resources: LocalCombatItem[]
  } | null {
    try {
      const actions = JSON.parse(localStorage.getItem('dnd_actions_v6') || '[]')
      const bonusActions = JSON.parse(localStorage.getItem('dnd_bonus_v7') || '[]')
      const reactions = JSON.parse(localStorage.getItem('dnd_reactions_v6') || '[]')
      const resources = JSON.parse(localStorage.getItem('dnd_resources_v6') || '[]')

      return { actions, bonusActions, reactions, resources }
    } catch {
      return null
    }
  }

  // 檢查是否為預設項目
  private static isDefaultItem(item: LocalCombatItem & { category: string }): boolean {
    const defaultIds = {
      action: ['attack', 'dash', 'disengage', 'dodge', 'help', 'hide', 'search', 'ready', 'use_object'],
      bonus: ['offhand_attack', 'healing_potion'],
      reaction: ['opportunity']
    }

    return defaultIds[item.category]?.includes(item.id) || false
  }

  // 清除舊的 localStorage 資料 (請謹慎使用)
  static clearLegacyData(): void {
    const legacyKeys = [
      'dnd_character_stats',
      'dnd_actions_v6',
      'dnd_bonus_v7', 
      'dnd_reactions_v6',
      'dnd_resources_v6',
      'dnd_combat_state_v4'
    ]

    legacyKeys.forEach(key => {
      localStorage.removeItem(key)
    })

    console.log('舊版本資料已清除')
  }

  // 檢查是否需要遷移
  static needsMigration(): boolean {
    const hasLegacyData = localStorage.getItem('dnd_character_stats') !== null
    const hasNewData = localStorage.getItem('dnd_cache_character') !== null // 檢查是否有任何快取的角色
    
    return hasLegacyData && !hasNewData
  }
}