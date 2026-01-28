import { describe, it, expect } from 'vitest'
import { migrateLegacyCharacterStats, needsMulticlassMigration, validateMulticlassData, ensureDisplayClass } from '../../utils/migrationHelpers'
import type { CharacterStats } from '../../types'

describe('migrationHelpers', () => {
  const legacyCharacterStats: CharacterStats = {
    name: "測試戰士",
    class: "戰士",
    level: 5,
    exp: 6500,
    hp: { current: 45, max: 55, temp: 0 },
    hitDice: { current: 3, total: 5, die: "d10" },
    ac: 16,
    initiative: 2,
    speed: 30,
    abilityScores: { str: 16, dex: 14, con: 15, int: 10, wis: 12, cha: 8 },
    proficiencies: { "運動": 1, "威嚇": 1 },
    savingProficiencies: ["str", "con"],
    downtime: 10,
    renown: { used: 2, total: 8 },
    prestige: { org: "哈潑同盟", level: 1, rankName: "披風" },
    customRecords: [],
    attacks: [],
    currency: { cp: 0, sp: 0, ep: 0, gp: 100, pp: 0 }
    // 沒有 classes 和 hitDicePools
  }

  describe('needsMulticlassMigration', () => {
    it('應該檢測出需要移轉的傳統角色', () => {
      expect(needsMulticlassMigration(legacyCharacterStats)).toBe(true)
    })

    it('已有兼職資料的角色不需要移轉', () => {
      const modernStats: CharacterStats = {
        ...legacyCharacterStats,
        classes: [{ name: "戰士", level: 5, hitDie: "d10", isPrimary: true }],
        hitDicePools: {
          d12: { current: 0, total: 0 },
          d10: { current: 3, total: 5 },
          d8: { current: 0, total: 0 },
          d6: { current: 0, total: 0 }
        }
      }
      expect(needsMulticlassMigration(modernStats)).toBe(false)
    })
  })

  describe('migrateLegacyCharacterStats', () => {
    it('應該正確移轉傳統單職業角色', () => {
      const migrated = migrateLegacyCharacterStats(legacyCharacterStats)
      
      expect(migrated.classes).toEqual([{
        name: "戰士",
        level: 5,
        hitDie: "d10",
        isPrimary: true
      }])

      expect(migrated.hitDicePools).toEqual({
        d12: { current: 0, total: 0 },
        d10: { current: 3, total: 5 }, // 維持原有的生命骰
        d8: { current: 0, total: 0 },
        d6: { current: 0, total: 0 }
      })

      // 檢查原有資料保持不變
      expect(migrated.name).toBe("測試戰士")
      expect(migrated.level).toBe(5)
      expect(migrated.hp).toEqual({ current: 45, max: 55, temp: 0 })
    })

    it('不同職業應該有正確的生命骰類型', () => {
      const wizardStats: CharacterStats = {
        ...legacyCharacterStats,
        class: "法師",
        level: 3, // 更新等級以匹配 total 生命骰
        hitDice: { current: 2, total: 3, die: "d6" }
      }

      const migrated = migrateLegacyCharacterStats(wizardStats)
      
      expect(migrated.classes![0].hitDie).toBe("d6")
      expect(migrated.hitDicePools!.d6).toEqual({ current: 2, total: 3 })
    })

    it('已有兼職資料的角色應該保持不變', () => {
      const modernStats: CharacterStats = {
        ...legacyCharacterStats,
        classes: [{ name: "戰士", level: 5, hitDie: "d10", isPrimary: true }],
        hitDicePools: {
          d12: { current: 0, total: 0 },
          d10: { current: 5, total: 5 },
          d8: { current: 0, total: 0 },
          d6: { current: 0, total: 0 }
        }
      }

      const result = migrateLegacyCharacterStats(modernStats)
      expect(result).toBe(modernStats) // 應該返回原物件
    })
  })

  describe('validateMulticlassData', () => {
    it('有效的兼職資料應該通過驗證', () => {
      const validStats: CharacterStats = {
        ...legacyCharacterStats,
        level: 8,
        classes: [
          { name: "戰士", level: 5, hitDie: "d10", isPrimary: true },
          { name: "法師", level: 3, hitDie: "d6", isPrimary: false }
        ],
        hitDicePools: {
          d12: { current: 0, total: 0 },
          d10: { current: 3, total: 5 },
          d8: { current: 0, total: 0 },
          d6: { current: 2, total: 3 }
        }
      }

      const result = validateMulticlassData(validStats)
      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('應該檢測出沒有職業資料的問題', () => {
      const invalidStats: CharacterStats = {
        ...legacyCharacterStats,
        classes: undefined
      }

      const result = validateMulticlassData(invalidStats)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('No classes found')
    })

    it('應該檢測出主職業數量錯誤', () => {
      const invalidStats: CharacterStats = {
        ...legacyCharacterStats,
        classes: [
          { name: "戰士", level: 3, hitDie: "d10", isPrimary: true },
          { name: "法師", level: 2, hitDie: "d6", isPrimary: true } // 兩個主職業
        ],
        hitDicePools: {
          d12: { current: 0, total: 0 },
          d10: { current: 3, total: 3 },
          d8: { current: 0, total: 0 },
          d6: { current: 2, total: 2 }
        }
      }

      const result = validateMulticlassData(invalidStats)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Expected exactly 1 primary class, found 2')
    })

    it('應該檢測出等級不匹配問題', () => {
      const invalidStats: CharacterStats = {
        ...legacyCharacterStats,
        level: 10, // 不匹配的等級
        classes: [
          { name: "戰士", level: 5, hitDie: "d10", isPrimary: true },
          { name: "法師", level: 3, hitDie: "d6", isPrimary: false } // 總共 8 級
        ],
        hitDicePools: {
          d12: { current: 0, total: 0 },
          d10: { current: 5, total: 5 },
          d8: { current: 0, total: 0 },
          d6: { current: 3, total: 3 }
        }
      }

      const result = validateMulticlassData(invalidStats)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain("Total class levels (8) don't match character level (10)")
    })
  })

  describe('ensureDisplayClass', () => {
    it('應該設置主職業為顯示職業', () => {
      const stats: CharacterStats = {
        ...legacyCharacterStats,
        class: "舊職業", // 應該被覆蓋
        level: 5, // 應該被更新
        classes: [
          { name: "戰士", level: 3, hitDie: "d10", isPrimary: true },
          { name: "法師", level: 2, hitDie: "d6", isPrimary: false }
        ]
      }

      const result = ensureDisplayClass(stats)
      expect(result.class).toBe("戰士") // 主職業
      expect(result.level).toBe(5) // 總等級
    })

    it('沒有兼職資料時應該保持原樣', () => {
      const result = ensureDisplayClass(legacyCharacterStats)
      expect(result).toBe(legacyCharacterStats)
    })

    it('沒有主職業時應該使用第一個職業', () => {
      const stats: CharacterStats = {
        ...legacyCharacterStats,
        classes: [
          { name: "戰士", level: 3, hitDie: "d10", isPrimary: false },
          { name: "法師", level: 2, hitDie: "d6", isPrimary: false }
        ]
      }

      const result = ensureDisplayClass(stats)
      expect(result.class).toBe("戰士") // 第一個職業
    })
  })
})