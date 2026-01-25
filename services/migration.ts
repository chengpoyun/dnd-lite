import { CharacterService, CombatItemService, CacheService } from './database'
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

      // 建立新角色
      const character = await CharacterService.createCharacter({
        name: characterName,
        stats: existingStats
      })

      if (!character) {
        throw new Error('建立角色失敗')
      }

      console.log(`角色 "${characterName}" 遷移成功，ID: ${character.id}`)
      
      // 快取新角色
      CacheService.cacheCharacter(character)
      
      // 遷移戰鬥項目
      await this.migrateCombatItems(character.id)
      
      return character.id
    } catch (error) {
      console.error('角色資料遷移失敗:', error)
      return null
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
        ...combatData.bonusActions.map(item => ({ ...item, category: 'bonus' as const })),
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
          recovery: item.recovery,
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