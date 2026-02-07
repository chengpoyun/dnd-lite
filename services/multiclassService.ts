// 兼職系統服務 - 處理角色職業資料
import { supabase } from '../lib/supabase'
import type { CharacterClass, CharacterHitDicePools } from '../lib/supabase'
import type { ClassInfo, HitDicePools } from '../types'
import { formatClassDisplay, getPrimaryClass, getTotalLevel, calculateHitDiceTotals, getClassHitDie } from '../utils/classUtils'

export class MulticlassService {
  
  /**
   * 載入角色的完整職業資訊
   */
  static async loadCharacterClasses(characterId: string): Promise<{
    classes: ClassInfo[]
    hitDicePools: HitDicePools | null
    primaryClass: string
    totalLevel: number
  }> {
    try {
      // 載入職業列表
      const { data: classesData, error: classesError } = await supabase
        .from('character_classes')
        .select('*')
        .eq('character_id', characterId)
        .order('class_level', { ascending: false })

      if (classesError) throw classesError

      // 載入生命骰池
      const { data: hitDiceData, error: hitDiceError } = await supabase
        .from('character_hit_dice_pools')
        .select('*')
        .eq('character_id', characterId)
        .single()

      if (hitDiceError && hitDiceError.code !== 'PGRST116') {
        console.warn('載入生命骰池失敗:', hitDiceError)
      }

      // 轉換資料格式
      const classes: ClassInfo[] = (classesData || []).map(dbClass => ({
        name: dbClass.class_name,
        level: dbClass.class_level,
        hitDie: dbClass.hit_die as any,
        isPrimary: dbClass.is_primary
      }))

      const hitDicePools: HitDicePools | null = hitDiceData ? {
        d12: { current: hitDiceData.d12_current, total: hitDiceData.d12_total },
        d10: { current: hitDiceData.d10_current, total: hitDiceData.d10_total },
        d8: { current: hitDiceData.d8_current, total: hitDiceData.d8_total },
        d6: { current: hitDiceData.d6_current, total: hitDiceData.d6_total }
      } : null

      const primaryClass = getPrimaryClass(classes)?.name || '戰士'
      const totalLevel = getTotalLevel(classes)

      return {
        classes,
        hitDicePools,
        primaryClass,
        totalLevel
      }

    } catch (error) {
      console.error('載入職業資訊失敗:', error)
      return {
        classes: [],
        hitDicePools: null,
        primaryClass: '戰士',
        totalLevel: 1
      }
    }
  }

  /**
   * 保存職業變更（當用戶修改職業時）
   */
  static async updateCharacterClass(
    characterId: string, 
    newClassName: string, 
    newLevel: number
  ): Promise<boolean> {
    try {
      // 檢查是否已有職業記錄
      const { data: existingClasses } = await supabase
        .from('character_classes')
        .select('*')
        .eq('character_id', characterId)

      if (!existingClasses || existingClasses.length === 0) {
        // 創建新的職業記錄（首次設定）
        return await this.createInitialClass(characterId, newClassName, newLevel)
      } else {
        // 更新現有主職業
        return await this.updatePrimaryClass(characterId, newClassName, newLevel)
      }

    } catch (error) {
      console.error('更新職業失敗:', error)
      return false
    }
  }

  /**
   * 創建角色的初始職業記錄
   */
  private static async createInitialClass(
    characterId: string, 
    className: string, 
    level: number
  ): Promise<boolean> {
    try {
      const hitDie = getClassHitDie(className)

      // 創建職業記錄
      const { error: classError } = await supabase
        .from('character_classes')
        .insert({
          character_id: characterId,
          class_name: className,
          class_level: level,
          hit_die: hitDie,
          is_primary: true
        })

      if (classError) throw classError

      // 創建對應的生命骰池
      const hitDicePools = calculateHitDiceTotals([{
        name: className,
        level: level,
        hitDie: hitDie as any,
        isPrimary: true
      }])

      const { error: hitDiceError } = await supabase
        .from('character_hit_dice_pools')
        .upsert({
          character_id: characterId,
          d12_current: hitDicePools.d12.current,
          d12_total: hitDicePools.d12.total,
          d10_current: hitDicePools.d10.current,
          d10_total: hitDicePools.d10.total,
          d8_current: hitDicePools.d8.current,
          d8_total: hitDicePools.d8.total,
          d6_current: hitDicePools.d6.current,
          d6_total: hitDicePools.d6.total
        })

      if (hitDiceError) throw hitDiceError

      return true

    } catch (error) {
      console.error('創建初始職業失敗:', error)
      return false
    }
  }

  /**
   * 更新主職業
   */
  private static async updatePrimaryClass(
    characterId: string, 
    newClassName: string, 
    newLevel: number
  ): Promise<boolean> {
    try {
      const newHitDie = getClassHitDie(newClassName)

      // 先將所有職業設為非主職業
      await supabase
        .from('character_classes')
        .update({ is_primary: false })
        .eq('character_id', characterId)

      // 檢查是否已存在該職業
      const { data: existingClass } = await supabase
        .from('character_classes')
        .select('*')
        .eq('character_id', characterId)
        .eq('class_name', newClassName)
        .single()

      if (existingClass) {
        // 更新現有職業
        const { error } = await supabase
          .from('character_classes')
          .update({
            class_level: newLevel,
            is_primary: true
          })
          .eq('id', existingClass.id)

        if (error) throw error
      } else {
        // 創建新職業記錄
        const { error } = await supabase
          .from('character_classes')
          .insert({
            character_id: characterId,
            class_name: newClassName,
            class_level: newLevel,
            hit_die: newHitDie,
            is_primary: true
          })

        if (error) throw error
      }

      // 重新計算生命骰池
      await this.recalculateHitDicePools(characterId)

      return true

    } catch (error) {
      console.error('更新主職業失敗:', error)
      return false
    }
  }

  /**
   * 重新計算角色的生命骰池
   */
  static async recalculateHitDicePools(characterId: string): Promise<void> {
    try {
      // 載入所有職業
      const { data: classes } = await supabase
        .from('character_classes')
        .select('*')
        .eq('character_id', characterId)

      if (!classes) return

      // 轉換格式並計算
      const classInfos: ClassInfo[] = classes.map(c => ({
        name: c.class_name,
        level: c.class_level,
        hitDie: c.hit_die as any,
        isPrimary: c.is_primary
      }))

      const newPools = calculateHitDiceTotals(classInfos)

      // 更新資料庫 - 使用 upsert 自動處理新增/更新
      const { error } = await supabase
        .from('character_hit_dice_pools')
        .upsert({
          character_id: characterId,
          d12_current: Math.min(newPools.d12.current, newPools.d12.total),
          d12_total: newPools.d12.total,
          d10_current: Math.min(newPools.d10.current, newPools.d10.total),
          d10_total: newPools.d10.total,
          d8_current: Math.min(newPools.d8.current, newPools.d8.total),
          d8_total: newPools.d8.total,
          d6_current: Math.min(newPools.d6.current, newPools.d6.total),
          d6_total: newPools.d6.total
        }, {
          onConflict: 'character_id'
        })
        
      if (error) {
        console.error('生命骰池更新失敗:', error)
      }

    } catch (error) {
      console.error('重新計算生命骰池失敗:', error)
    }
  }

  /**
   * 保存生命骰池狀態（短休使用生命骰後）
   */
  static async saveHitDicePools(
    characterId: string,
    pools: HitDicePools
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('character_hit_dice_pools')
        .update({
          d12_current: pools.d12.current,
          d10_current: pools.d10.current,
          d8_current: pools.d8.current,
          d6_current: pools.d6.current
        })
        .eq('character_id', characterId)

      if (error) {
        console.error('保存生命骰池失敗:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('保存生命骰池異常:', error)
      return false
    }
  }

  /**
   * 取得職業顯示格式
   */
  static getClassDisplayText(
    classes: ClassInfo[], 
    format: 'full' | 'primary' | 'simple' = 'primary'
  ): string {
    return formatClassDisplay(classes, format)
  }
}