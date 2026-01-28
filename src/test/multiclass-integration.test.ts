import { describe, it, expect } from 'vitest'
import { 
  getAvailableClasses, 
  formatClassDisplay, 
  calculateHitDiceTotals,
  formatHitDicePools,
  getTotalCurrentHitDice 
} from '../../utils/classUtils'
import { migrateLegacyCharacterStats } from '../../utils/migrationHelpers'
import type { CharacterStats, ClassInfo } from '../../types'

describe('Multiclass System Integration', () => {
  describe('Complete Multiclass Workflow', () => {
    it('應該支持完整的兼職系統工作流程', () => {
      // 1. 創建戰士/法師兼職角色
      const multiclassCharacter: CharacterStats = {
        name: "艾瑞克·鋼法",
        class: "戰士", // 主職業（向下相容）
        level: 8, // 總等級
        exp: 34000,
        hp: { current: 65, max: 72, temp: 0 },
        hitDice: { current: 4, total: 8, die: "d10" }, // 傳統格式（向下相容）
        ac: 18,
        initiative: 2,
        speed: 30,
        abilityScores: { str: 16, dex: 14, con: 16, int: 14, wis: 12, cha: 10 },
        proficiencies: { "運動": 1, "奧秘": 1 },
        savingProficiencies: ["str", "con"],
        downtime: 15,
        renown: { used: 1, total: 5 },
        prestige: { org: "哈潑同盟", level: 1, rankName: "披風" },
        customRecords: [],
        attacks: [],
        currency: { cp: 0, sp: 0, ep: 0, gp: 250, pp: 1 },
        // 兼職系統資料
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

      // 2. 驗證職業顯示格式
      expect(formatClassDisplay(multiclassCharacter.classes!, 'full')).toBe('戰士 Lv5 / 法師 Lv3')
      expect(formatClassDisplay(multiclassCharacter.classes!, 'primary')).toBe('戰士') // primary 格式只顯示主職業名稱
      expect(formatClassDisplay(multiclassCharacter.classes!, 'simple')).toBe('戰士/法師')

      // 3. 驗證生命骰池格式化
      expect(formatHitDicePools(multiclassCharacter.hitDicePools!, 'status')).toBe('3/5d10 + 2/3d6')
      expect(formatHitDicePools(multiclassCharacter.hitDicePools!, 'current')).toBe('3d10 + 2d6')
      expect(formatHitDicePools(multiclassCharacter.hitDicePools!, 'total')).toBe('5d10 + 3d6')

      // 4. 驗證生命骰總數計算
      expect(getTotalCurrentHitDice(multiclassCharacter.hitDicePools!)).toBe(5) // 3 + 2

      // 5. 驗證向下相容性：主職業資訊
      expect(multiclassCharacter.class).toBe('戰士')
      expect(multiclassCharacter.level).toBe(8)
    })

    it('應該正確處理單職業到兼職的升級', () => {
      // 戰士 5 級升到戰士 5 / 法師 1
      const originalClasses: ClassInfo[] = [
        { name: "戰士", level: 5, hitDie: "d10", isPrimary: true }
      ]

      const upgradedClasses: ClassInfo[] = [
        { name: "戰士", level: 5, hitDie: "d10", isPrimary: true },
        { name: "法師", level: 1, hitDie: "d6", isPrimary: false }
      ]

      const originalPools = calculateHitDiceTotals(originalClasses)
      const upgradedPools = calculateHitDiceTotals(upgradedClasses)

      expect(originalPools.d10).toEqual({ current: 5, total: 5 })
      expect(originalPools.d6).toEqual({ current: 0, total: 0 })

      expect(upgradedPools.d10).toEqual({ current: 5, total: 5 })
      expect(upgradedPools.d6).toEqual({ current: 1, total: 1 })
    })

    it('應該支持多種職業組合', () => {
      // 測試三職業組合：野蠻人/戰士/盜賊
      const tripleClass: ClassInfo[] = [
        { name: "野蠻人", level: 3, hitDie: "d12", isPrimary: true },
        { name: "戰士", level: 2, hitDie: "d10", isPrimary: false },
        { name: "盜賊", level: 1, hitDie: "d8", isPrimary: false }
      ]

      const pools = calculateHitDiceTotals(tripleClass)
      
      expect(pools.d12).toEqual({ current: 3, total: 3 })
      expect(pools.d10).toEqual({ current: 2, total: 2 })
      expect(pools.d8).toEqual({ current: 1, total: 1 })
      expect(pools.d6).toEqual({ current: 0, total: 0 })

      expect(formatClassDisplay(tripleClass, 'full')).toBe('野蠻人 Lv3 / 戰士 Lv2 / 盜賊 Lv1')
    })

    it('應該支持相同生命骰類型的職業組合', () => {
      // 盜賊 + 遊俠（都是 d8）
      const sameHitDieClasses: ClassInfo[] = [
        { name: "盜賊", level: 4, hitDie: "d8", isPrimary: true },
        { name: "遊俠", level: 2, hitDie: "d8", isPrimary: false }
      ]

      const pools = calculateHitDiceTotals(sameHitDieClasses)
      
      expect(pools.d8).toEqual({ current: 6, total: 6 }) // 4 + 2
      expect(pools.d10).toEqual({ current: 0, total: 0 })
      expect(pools.d6).toEqual({ current: 0, total: 0 })
      expect(pools.d12).toEqual({ current: 0, total: 0 })
    })
  })

  describe('Legacy Character Migration', () => {
    it('應該無縫移轉傳統角色到兼職系統', () => {
      // 傳統戰士角色
      const legacyFighter: CharacterStats = {
        name: "老戰士",
        class: "戰士",
        level: 7,
        exp: 23000,
        hp: { current: 58, max: 65, temp: 0 },
        hitDice: { current: 4, total: 7, die: "d10" },
        ac: 17,
        initiative: 1,
        speed: 30,
        abilityScores: { str: 18, dex: 12, con: 16, int: 10, wis: 13, cha: 8 },
        proficiencies: { "運動": 1, "威嚇": 1 },
        savingProficiencies: ["str", "con"],
        downtime: 0,
        renown: { used: 0, total: 0 },
        prestige: { org: "", level: 0, rankName: "" },
        customRecords: [],
        attacks: [],
        currency: { cp: 0, sp: 0, ep: 0, gp: 150, pp: 0 }
        // 沒有 classes 和 hitDicePools
      }

      // 執行移轉
      const migratedFighter = migrateLegacyCharacterStats(legacyFighter)

      // 驗證移轉結果
      expect(migratedFighter.classes).toEqual([{
        name: "戰士",
        level: 7,
        hitDie: "d10",
        isPrimary: true
      }])

      expect(migratedFighter.hitDicePools).toEqual({
        d12: { current: 0, total: 0 },
        d10: { current: 4, total: 7 }, // 保留原有生命骰數據
        d8: { current: 0, total: 0 },
        d6: { current: 0, total: 0 }
      })

      // 原有資料保持不變
      expect(migratedFighter.name).toBe("老戰士")
      expect(migratedFighter.level).toBe(7)
      expect(migratedFighter.class).toBe("戰士")
      expect(migratedFighter.hp).toEqual({ current: 58, max: 65, temp: 0 })
    })
  })

  describe('D&D 5E Rules Compliance', () => {
    it('應該支持所有 D&D 5E 官方職業', () => {
      const allClasses = getAvailableClasses()
      
      // 驗證包含所有主要職業
      const expectedClasses = [
        '野蠻人', '戰士', '聖騎士', '騎兵', 
        '牧師', '德魯伊', '遊俠', '術士', 
        '邪術師', '盜賊', '吟遊詩人', '法師'
      ]
      
      expectedClasses.forEach(className => {
        expect(allClasses).toContain(className)
      })

      // 驗證總數（確保沒有遺漏或重複）
      expect(allClasses.length).toBe(12)
    })

    it('應該使用正確的生命骰類型', () => {
      const testCases = [
        { class: '野蠻人', hitDie: 'd12' },
        { class: '戰士', hitDie: 'd10' },
        { class: '聖騎士', hitDie: 'd10' },
        { class: '騎兵', hitDie: 'd10' },
        { class: '牧師', hitDie: 'd8' },
        { class: '德魯伊', hitDie: 'd8' },
        { class: '遊俠', hitDie: 'd8' },
        { class: '術士', hitDie: 'd8' },
        { class: '邪術師', hitDie: 'd8' },
        { class: '盜賊', hitDie: 'd8' },
        { class: '吟遊詩人', hitDie: 'd8' },
        { class: '法師', hitDie: 'd6' }
      ]

      testCases.forEach(({ class: className, hitDie }) => {
        const classes: ClassInfo[] = [{ 
          name: className, 
          level: 1, 
          hitDie: hitDie as any, 
          isPrimary: true 
        }]
        const pools = calculateHitDiceTotals(classes)
        expect(pools[hitDie as keyof typeof pools].total).toBe(1)
      })
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('應該處理空職業列表', () => {
      const emptyClassDisplay = formatClassDisplay([], 'full')
      expect(emptyClassDisplay).toBe('無職業')
    })

    it('應該處理空的生命骰池', () => {
      const emptyPools = {
        d12: { current: 0, total: 0 },
        d10: { current: 0, total: 0 },
        d8: { current: 0, total: 0 },
        d6: { current: 0, total: 0 }
      }

      expect(formatHitDicePools(emptyPools, 'status')).toBe('無生命骰')
      expect(getTotalCurrentHitDice(emptyPools)).toBe(0)
    })

    it('應該處理只有一種生命骰類型的情況', () => {
      const singleTypePools = {
        d12: { current: 0, total: 0 },
        d10: { current: 3, total: 5 },
        d8: { current: 0, total: 0 },
        d6: { current: 0, total: 0 }
      }

      expect(formatHitDicePools(singleTypePools, 'status')).toBe('3/5d10')
    })
  })
})