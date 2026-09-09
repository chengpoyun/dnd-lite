import { supabase } from '../lib/supabase'
import {
  getSpecialEffectId,
  getSpecialEffectBonus,
  type SpecialEffectContext,
} from '../utils/specialEffects'
import { computeSaveAndSkillAdvantageDisadvantage } from '../utils/advantageDisadvantage'
import { isDiceNotation } from '../utils/characterAttributes'
/** 能力／物品 stat_bonuses 聚合結果（供 buildCharacterStats / 前端顯示用） */
export interface AggregatedStatBonuses {
  /** 來自能力／物品的「屬性值」加成（力量、敏捷等） */
  abilityScores: Record<string, number>;
  abilityModifiers: Record<string, number>;
  savingThrows: Record<string, number>;
  skills: Record<string, number>;
  /**
   * 純數字為一般加值總計；bySource 各筆的 combatStats 可為骰子記法字串（如 "1d8"），
   * 但 totals 這邊的加總永遠只會是數字（骰子字串不計入數字加總，見 mergeCombatStats）
   */
  combatStats: {
    ac?: number | string;
    initiative?: number | string;
    maxHp?: number | string;
    speed?: number | string;
    attackHit?: number | string;
    attackDamage?: number | string;
    spellHit?: number | string;
    spellDc?: number | string;
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
    /** 此來源的「其他效果」自由文字說明 */
    other?: string;
  }[];
  /** 依 bySource 結算後的豁免優劣勢 */
  saveAdvantageDisadvantage?: Record<string, 'advantage' | 'normal' | 'disadvantage'>;
  /** 依 bySource 結算後的技能優劣勢 */
  skillAdvantageDisadvantage?: Record<string, 'advantage' | 'normal' | 'disadvantage'>;
}

/**
 * 能力／物品的 stat_bonuses 聚合。
 *
 * 從 detailedCharacter.ts 拆出：這段邏輯原本是該檔案裡最長的單一方法（約 450 行），
 * 與角色 CRUD 沒有共用狀態，獨立成一個模組後兩邊都好讀得多。
 * 對外仍可透過 DetailedCharacterService.collectSourceBonusesForCharacter 呼叫。
 */
export class CharacterBonusAggregationService {
  // === 能力／物品數值加成統計（stat_bonuses 聚合） ===

  /**
   * 從角色擁有的能力與物品上，聚合所有 stat_bonuses。
   * - abilities.stat_bonuses：透過 character_abilities -> abilities 關聯取得
   * - character_items.stat_bonuses：每筆角色物品自帶的數值加成（不再有共用的 global_items 可關聯）
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
        const existing = target[key]
        target[key] = (typeof existing === 'number' ? existing : 0) + num
      }
    }

    // 骰子記法字串（如 "1d8"）原樣複製到 target，不計入數字加總；供攻擊傷害等額外骰子加成使用
    const copyDiceCombatStats = (target: AggregatedStatBonuses['combatStats'], src: any) => {
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
        if (typeof v === 'string' && isDiceNotation(v)) {
          target[key] = v
        }
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
      // 屬性值「下限」效果（如食人魔力量手套）需在彙總所有其他加值後才套用，
      // 因此先收集，待能力／物品兩個迴圈跑完再依「base + 其他加值」計算補足差額。
      const pendingFloors: { perSource: any; ability: string; floor: number }[] = []

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
          const abilityScoreFloors = hasBonuses ? bonuses.abilityScoreFloors : undefined
          const savingThrows = hasBonuses ? bonuses.savingThrows : undefined
          const skills = hasBonuses ? bonuses.skills : undefined
          const combatStats = hasBonuses ? bonuses.combatStats : undefined
          const savingThrowAdvantage = hasBonuses && Array.isArray(bonuses.savingThrowAdvantage) ? bonuses.savingThrowAdvantage : undefined
          const savingThrowDisadvantage = hasBonuses && Array.isArray(bonuses.savingThrowDisadvantage) ? bonuses.savingThrowDisadvantage : undefined
          const skillAdvantage = hasBonuses && Array.isArray(bonuses.skillAdvantage) ? bonuses.skillAdvantage : undefined
          const skillDisadvantage = hasBonuses && Array.isArray(bonuses.skillDisadvantage) ? bonuses.skillDisadvantage : undefined
          const otherNote = hasBonuses && typeof bonuses.other === 'string' ? bonuses.other.trim() : ''

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
            other?: string
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
            copyDiceCombatStats(cs, combatStats)
            if (Object.keys(cs).length) {
              perSource.combatStats = cs
              mergeCombatStats(totals.combatStats, cs)
            }
          }

          if (otherNote) perSource.other = otherNote

          // 屬性值「設為 X」效果（如食人魔力量手套），直接來自一般 stat_bonuses.abilityScoreFloors
          // （UI 於 StatBonusEditor 輸入 =19 語法），延後到所有加值彙總後再套用（見下方 pendingFloors 迴圈）
          if (abilityScoreFloors && typeof abilityScoreFloors === 'object') {
            for (const [ab, floor] of Object.entries(abilityScoreFloors)) {
              if (typeof floor === 'number') pendingFloors.push({ perSource, ability: ab, floor })
            }
          }

          if (isSpecial && context && effectId) {
            const special = getSpecialEffectBonus(effectId, context)
            if (special.abilityScores && Object.keys(special.abilityScores).length) {
              if (!perSource.abilityScores) perSource.abilityScores = {}
              mergeNumberMap(perSource.abilityScores, special.abilityScores)
              mergeNumberMap(totals.abilityScores, special.abilityScores)
            }
            for (const [ab, floor] of Object.entries(special.abilityScoreFloors ?? {})) {
              if (typeof floor === 'number') pendingFloors.push({ perSource, ability: ab, floor })
            }
            const { abilityScores: _sa, abilityScoreFloors: _sf, ...specialCombat } = special
            if (Object.keys(specialCombat).length) {
              if (!perSource.combatStats) perSource.combatStats = {}
              mergeCombatStats(perSource.combatStats, specialCombat)
              mergeCombatStats(totals.combatStats, specialCombat)
            }
          }

          if (savingThrowAdvantage?.length) perSource.savingThrowAdvantage = savingThrowAdvantage
          if (savingThrowDisadvantage?.length) perSource.savingThrowDisadvantage = savingThrowDisadvantage
          if (skillAdvantage?.length) perSource.skillAdvantage = skillAdvantage
          if (skillDisadvantage?.length) perSource.skillDisadvantage = skillDisadvantage

          if (perSource.abilityScores || perSource.abilityModifiers || perSource.savingThrows || perSource.skills || perSource.combatStats ||
              perSource.savingThrowAdvantage || perSource.savingThrowDisadvantage || perSource.skillAdvantage || perSource.skillDisadvantage ||
              perSource.other) {
            totals.bySource.push(perSource)
          }
        }
      }

      // 共用：套用單一來源（裝備本身、或裝備插槽中鑲嵌的素材）的 stat_bonuses 到 totals / bySource
      // 插槽素材與裝備本身的 affects_stats 無關，只要有鑲嵌就會呼叫本函式套用效果
      const applyItemBonusSource = (id: string, name: string, bonuses: any) => {
        if (!bonuses || typeof bonuses !== 'object') return

        const abilityScores = bonuses.abilityScores
        const abilityModifiers = bonuses.abilityModifiers
        const abilityScoreFloors = bonuses.abilityScoreFloors
        const savingThrows = bonuses.savingThrows
        const skills = bonuses.skills
        const combatStats = bonuses.combatStats
        const savingThrowAdvantage = Array.isArray(bonuses.savingThrowAdvantage) ? bonuses.savingThrowAdvantage : undefined
        const savingThrowDisadvantage = Array.isArray(bonuses.savingThrowDisadvantage) ? bonuses.savingThrowDisadvantage : undefined
        const skillAdvantage = Array.isArray(bonuses.skillAdvantage) ? bonuses.skillAdvantage : undefined
        const skillDisadvantage = Array.isArray(bonuses.skillDisadvantage) ? bonuses.skillDisadvantage : undefined
        const otherNote = typeof bonuses.other === 'string' ? bonuses.other.trim() : ''

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
          other?: string
        } = {
          id,
          type: 'item',
          name
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
          copyDiceCombatStats(cs, combatStats)
          if (Object.keys(cs).length) {
            perSource.combatStats = cs
            mergeCombatStats(totals.combatStats, cs)
          }
        }

        if (otherNote) perSource.other = otherNote

        // 屬性值「設為 X」效果（如食人魔力量手套），直接來自一般 stat_bonuses.abilityScoreFloors
        // （UI 於 StatBonusEditor 輸入 =19 語法），延後到所有加值彙總後再套用（見下方 pendingFloors 迴圈）
        if (abilityScoreFloors && typeof abilityScoreFloors === 'object') {
          for (const [ab, floor] of Object.entries(abilityScoreFloors)) {
            if (typeof floor === 'number') pendingFloors.push({ perSource, ability: ab, floor })
          }
        }

        // 特殊效果（如健壯：依等級動態計算的公式型效果）
        const itemEffectId = getSpecialEffectId(bonuses)
        if (itemEffectId && context) {
          const special = getSpecialEffectBonus(itemEffectId, context)
          if (special.abilityScores && Object.keys(special.abilityScores).length) {
            if (!perSource.abilityScores) perSource.abilityScores = {}
            mergeNumberMap(perSource.abilityScores, special.abilityScores)
            mergeNumberMap(totals.abilityScores, special.abilityScores)
          }
          // 屬性值下限（如食人魔力量手套）延後到所有加值彙總後再套用
          for (const [ab, floor] of Object.entries(special.abilityScoreFloors ?? {})) {
            if (typeof floor === 'number') pendingFloors.push({ perSource, ability: ab, floor })
          }
          const { abilityScores: _specialAbilityScores, abilityScoreFloors: _specialFloors, ...specialCombat } = special
          if (Object.keys(specialCombat).length) {
            if (!perSource.combatStats) perSource.combatStats = {}
            mergeCombatStats(perSource.combatStats, specialCombat)
            mergeCombatStats(totals.combatStats, specialCombat)
          }
        }

        if (savingThrowAdvantage?.length) perSource.savingThrowAdvantage = savingThrowAdvantage
        if (savingThrowDisadvantage?.length) perSource.savingThrowDisadvantage = savingThrowDisadvantage
        if (skillAdvantage?.length) perSource.skillAdvantage = skillAdvantage
        if (skillDisadvantage?.length) perSource.skillDisadvantage = skillDisadvantage

        if (perSource.abilityScores || perSource.abilityModifiers || perSource.savingThrows || perSource.skills || perSource.combatStats ||
            perSource.savingThrowAdvantage || perSource.savingThrowDisadvantage || perSource.skillAdvantage || perSource.skillDisadvantage ||
            perSource.other) {
          totals.bySource.push(perSource)
        }
      }

      // 2. 角色物品（僅「穿戴中」is_equipped 的裝備計入數值；每筆物品都是角色自己的獨立資料，
      //    不再有共用的 global_items 可以關聯或覆寫）
      //    插槽鑲嵌素材的效果獨立於裝備本身是否有 affects_stats，只要裝備穿戴中且插槽有鑲嵌就套用
      const { data: characterItems, error: ciError } = await supabase
        .from('character_items')
        .select(`
          id,
          character_id,
          name_override,
          category_override,
          affects_stats,
          stat_bonuses,
          applies_unequipped,
          is_equipped,
          sockets
        `)
        .eq('character_id', characterId)

      if (ciError) {
        console.error('collectSourceBonusesForCharacter: 讀取角色物品失敗:', ciError)
      } else if (Array.isArray(characterItems)) {
        for (const row of characterItems as any[]) {
          // 裝備類物品預設需穿戴中才生效；applies_unequipped 為 true 時例外，即使未裝備也套用。
          // 非裝備類物品（藥水、雜項）本來就沒有裝備概念，一律不受此限制。
          const effectiveCategory = row.category_override
          const appliesUnequipped = row.applies_unequipped ?? false
          const requiresEquip = effectiveCategory === '裝備' && !appliesUnequipped
          if (requiresEquip && row.is_equipped !== true) continue
          const itemName = (row.name_override || '').toString()

          if (row.affects_stats) {
            applyItemBonusSource(row.id, itemName, row.stat_bonuses as any)
          }

          const sockets = Array.isArray(row.sockets) ? row.sockets : []
          sockets.forEach((socket: any, idx: number) => {
            if (!socket || typeof socket !== 'object') return
            const decoName = typeof socket.decoration_name === 'string' ? socket.decoration_name : '素材'
            // 插槽效果的「其他」文字：鑲嵌時填的 note 讓純敘述效果不需要另外勾選數值加成也能出現在
            // 戰鬥頁「其他效果」；stat_bonuses.other 若也有填（刻意額外補充），兩者一併顯示，note 在前。
            // 兩者文字完全相同時（沿用舊流程重複填寫的資料）只顯示一次，不重複疊加。
            const explicitOther = typeof socket.stat_bonuses?.other === 'string' ? socket.stat_bonuses.other.trim() : ''
            const noteText = typeof socket.note === 'string' ? socket.note.trim() : ''
            const other = [noteText, explicitOther].filter((t, i, arr) => t && arr.indexOf(t) === i).join('\n')
            const bonuses = other ? { ...(socket.stat_bonuses ?? {}), other } : socket.stat_bonuses
            applyItemBonusSource(`${row.id}-socket-${idx}`, `${itemName}［${decoName}］`, bonuses)
          })
        }
      }

      // 套用屬性值「下限」效果（如食人魔力量手套）：
      // 以「基礎值 + 其他所有加值」為最終屬性值，若低於下限才補足差額至下限。
      for (const f of pendingFloors) {
        const base = (context?.abilityScores as Record<string, number> | undefined)?.[f.ability] ?? 10
        const finalWithoutFloor = base + (totals.abilityScores[f.ability] ?? 0)
        const delta = Math.max(0, f.floor - finalWithoutFloor)
        if (delta > 0) {
          totals.abilityScores[f.ability] = (totals.abilityScores[f.ability] ?? 0) + delta
          if (!f.perSource.abilityScores) f.perSource.abilityScores = {}
          f.perSource.abilityScores[f.ability] = (f.perSource.abilityScores[f.ability] ?? 0) + delta
          if (!totals.bySource.includes(f.perSource)) totals.bySource.push(f.perSource)
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
}
