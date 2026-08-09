import { supabase } from '../lib/supabase'

/**
 * 角色技能／豁免熟練度的讀寫。
 *
 * 從 detailedCharacter.ts 拆出，該檔原本同時扛角色 CRUD、stats 聚合與熟練度，
 * 這一段與其餘部分沒有共用狀態。對外仍可透過 DetailedCharacterService 的同名方法呼叫。
 */
export class CharacterProficiencyService {
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
}
