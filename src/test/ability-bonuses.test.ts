import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getModifier } from '../../utils/helpers'

/**
 * 屬性加成系統測試
 * 
 * 功能說明：
 * - 支援裝備/魔法效果對屬性值的加成
 * - 支援對調整值的額外加成
 * - 計算邏輯：
 *   最終屬性值 = 基礎值 + 屬性加成
 *   最終調整值 = floor((最終值-10)/2) + 調整值額外加成
 */

// 模擬能力值計算邏輯
export class AbilityBonusCalculator {
  /**
   * 計算最終屬性值
   * @param baseValue 基礎屬性值
   * @param bonus 裝備/魔法效果加成
   * @returns 最終屬性值
   */
  static calculateFinalAbility(baseValue: number, bonus: number = 0): number {
    return baseValue + bonus
  }

  /**
   * 計算最終調整值
   * @param baseValue 基礎屬性值
   * @param abilityBonus 屬性值加成
   * @param modifierBonus 調整值額外加成
   * @returns 最終調整值
   */
  static calculateFinalModifier(
    baseValue: number, 
    abilityBonus: number = 0, 
    modifierBonus: number = 0
  ): number {
    const finalAbility = this.calculateFinalAbility(baseValue, abilityBonus)
    const baseModifier = getModifier(finalAbility)
    return baseModifier + modifierBonus
  }

  /**
   * 計算技能檢定調整值
   * @param baseValue 基礎屬性值
   * @param abilityBonus 屬性值加成
   * @param modifierBonus 調整值額外加成
   * @param proficiencyLevel 熟練等級 (0=無, 1=熟練, 2=專精)
   * @param proficiencyBonus 熟練加值
   * @returns 技能檢定總調整值
   */
  static calculateSkillBonus(
    baseValue: number,
    abilityBonus: number = 0,
    modifierBonus: number = 0,
    proficiencyLevel: number = 0,
    proficiencyBonus: number = 2
  ): number {
    const finalModifier = this.calculateFinalModifier(baseValue, abilityBonus, modifierBonus)
    return finalModifier + (proficiencyLevel * proficiencyBonus)
  }

  /**
   * 驗證屬性值範圍
   * @param value 屬性值
   * @returns 是否有效
   */
  static validateAbilityValue(value: number): boolean {
    return Number.isInteger(value) && value >= -99 && value <= 99
  }
}

describe('屬性加成系統 - 基礎計算', () => {
  describe('最終屬性值計算', () => {
    it('應該正確計算無加成的屬性值', () => {
      expect(AbilityBonusCalculator.calculateFinalAbility(16, 0)).toBe(16)
      expect(AbilityBonusCalculator.calculateFinalAbility(10, 0)).toBe(10)
    })

    it('應該正確計算有正加成的屬性值', () => {
      expect(AbilityBonusCalculator.calculateFinalAbility(16, 2)).toBe(18)
      expect(AbilityBonusCalculator.calculateFinalAbility(10, 5)).toBe(15)
    })

    it('應該正確計算有負加成的屬性值', () => {
      expect(AbilityBonusCalculator.calculateFinalAbility(16, -2)).toBe(14)
      expect(AbilityBonusCalculator.calculateFinalAbility(10, -5)).toBe(5)
    })

    it('應該支援極端值', () => {
      expect(AbilityBonusCalculator.calculateFinalAbility(99, 0)).toBe(99)
      expect(AbilityBonusCalculator.calculateFinalAbility(-99, 0)).toBe(-99)
      expect(AbilityBonusCalculator.calculateFinalAbility(10, 89)).toBe(99)
      expect(AbilityBonusCalculator.calculateFinalAbility(10, -109)).toBe(-99)
    })
  })

  describe('最終調整值計算', () => {
    it('應該正確計算無加成的調整值', () => {
      expect(AbilityBonusCalculator.calculateFinalModifier(10, 0, 0)).toBe(0)
      expect(AbilityBonusCalculator.calculateFinalModifier(16, 0, 0)).toBe(3)
      expect(AbilityBonusCalculator.calculateFinalModifier(8, 0, 0)).toBe(-1)
    })

    it('應該正確計算有屬性加成的調整值', () => {
      // 16 + 2 = 18 → MOD = +4
      expect(AbilityBonusCalculator.calculateFinalModifier(16, 2, 0)).toBe(4)
      // 10 + 4 = 14 → MOD = +2
      expect(AbilityBonusCalculator.calculateFinalModifier(10, 4, 0)).toBe(2)
    })

    it('應該正確計算有調整值額外加成', () => {
      // 16 → MOD = +3, +1額外 = +4
      expect(AbilityBonusCalculator.calculateFinalModifier(16, 0, 1)).toBe(4)
      // 10 → MOD = 0, +2額外 = +2
      expect(AbilityBonusCalculator.calculateFinalModifier(10, 0, 2)).toBe(2)
    })

    it('應該正確計算同時有兩種加成', () => {
      // 16 + 2 = 18 → MOD = +4, +1額外 = +5
      expect(AbilityBonusCalculator.calculateFinalModifier(16, 2, 1)).toBe(5)
      // 10 + 4 = 14 → MOD = +2, +1額外 = +3
      expect(AbilityBonusCalculator.calculateFinalModifier(10, 4, 1)).toBe(3)
    })

    it('應該正確處理負值加成', () => {
      // 16 - 4 = 12 → MOD = +1
      expect(AbilityBonusCalculator.calculateFinalModifier(16, -4, 0)).toBe(1)
      // 10 → MOD = 0, -2額外 = -2
      expect(AbilityBonusCalculator.calculateFinalModifier(10, 0, -2)).toBe(-2)
      // 16 - 6 = 10 → MOD = 0, -1額外 = -1
      expect(AbilityBonusCalculator.calculateFinalModifier(16, -6, -1)).toBe(-1)
    })
  })
})

describe('屬性加成系統 - 技能檢定整合', () => {
  it('應該正確計算無熟練技能的調整值', () => {
    // 力量 16, 無加成, 無熟練 → +3
    expect(AbilityBonusCalculator.calculateSkillBonus(16, 0, 0, 0, 2)).toBe(3)
  })

  it('應該正確計算熟練技能的調整值', () => {
    // 力量 16, 無加成, 熟練 → +3 + 2 = +5
    expect(AbilityBonusCalculator.calculateSkillBonus(16, 0, 0, 1, 2)).toBe(5)
  })

  it('應該正確計算專精技能的調整值', () => {
    // 力量 16, 無加成, 專精 → +3 + 4 = +7
    expect(AbilityBonusCalculator.calculateSkillBonus(16, 0, 0, 2, 2)).toBe(7)
  })

  it('應該在有屬性加成時重新計算技能調整值', () => {
    // 力量 16 + 2 = 18 → MOD = +4, 熟練 → +4 + 2 = +6
    expect(AbilityBonusCalculator.calculateSkillBonus(16, 2, 0, 1, 2)).toBe(6)
  })

  it('應該在有調整值加成時重新計算技能調整值', () => {
    // 力量 16 → MOD = +3, +1額外 = +4, 熟練 → +4 + 2 = +6
    expect(AbilityBonusCalculator.calculateSkillBonus(16, 0, 1, 1, 2)).toBe(6)
  })

  it('應該在有兩種加成時重新計算技能調整值', () => {
    // 力量 16 + 2 = 18 → MOD = +4, +1額外 = +5, 熟練 → +5 + 2 = +7
    expect(AbilityBonusCalculator.calculateSkillBonus(16, 2, 1, 1, 2)).toBe(7)
  })

  it('應該支援不同的熟練加值', () => {
    // 高等級角色 (LV13-16, 熟練加值 +5)
    // 力量 20, 無加成, 熟練 → +5 + 5 = +10
    expect(AbilityBonusCalculator.calculateSkillBonus(20, 0, 0, 1, 5)).toBe(10)
  })
})

describe('屬性加成系統 - 數值驗證', () => {
  it('應該接受有效的屬性值範圍', () => {
    expect(AbilityBonusCalculator.validateAbilityValue(10)).toBe(true)
    expect(AbilityBonusCalculator.validateAbilityValue(1)).toBe(true)
    expect(AbilityBonusCalculator.validateAbilityValue(20)).toBe(true)
    expect(AbilityBonusCalculator.validateAbilityValue(99)).toBe(true)
    expect(AbilityBonusCalculator.validateAbilityValue(-99)).toBe(true)
    expect(AbilityBonusCalculator.validateAbilityValue(0)).toBe(true)
    expect(AbilityBonusCalculator.validateAbilityValue(-1)).toBe(true)
  })

  it('應該拒絕超出範圍的屬性值', () => {
    expect(AbilityBonusCalculator.validateAbilityValue(100)).toBe(false)
    expect(AbilityBonusCalculator.validateAbilityValue(-100)).toBe(false)
    expect(AbilityBonusCalculator.validateAbilityValue(999)).toBe(false)
  })

  it('應該拒絕非整數的屬性值', () => {
    expect(AbilityBonusCalculator.validateAbilityValue(10.5)).toBe(false)
    expect(AbilityBonusCalculator.validateAbilityValue(NaN)).toBe(false)
  })
})

describe('屬性加成系統 - D&D 5E 實際案例', () => {
  it('案例1: 力量腰帶 (Belt of Giant Strength)', () => {
    // 角色原本力量 12，穿戴巨人腰帶後設為 21
    // 這裡用 +9 加成模擬
    const baseStr = 12
    const bonus = 9
    const finalStr = AbilityBonusCalculator.calculateFinalAbility(baseStr, bonus)
    const finalMod = AbilityBonusCalculator.calculateFinalModifier(baseStr, bonus, 0)
    
    expect(finalStr).toBe(21)
    expect(finalMod).toBe(5) // floor((21-10)/2) = 5
  })

  it('案例2: 牛之力量術 (Bull\'s Strength)', () => {
    // 提升力量 2點，持續時間內
    const baseStr = 14
    const bonus = 2
    const finalMod = AbilityBonusCalculator.calculateFinalModifier(baseStr, bonus, 0)
    
    expect(finalMod).toBe(3) // floor((16-10)/2) = 3
  })

  it('案例3: 虛弱詛咒 (Ray of Enfeeblement)', () => {
    // 力量檢定有劣勢，實際效果建模為 -2 MOD加成
    const baseStr = 16
    const modBonus = -2
    const finalMod = AbilityBonusCalculator.calculateFinalModifier(baseStr, 0, modBonus)
    
    expect(finalMod).toBe(1) // floor((16-10)/2) - 2 = 1
  })

  it('案例4: 野蠻人狂暴 (Barbarian Rage) - 力量檢定+2', () => {
    // 某些特性給予力量檢定額外+2
    const baseStr = 18
    const modBonus = 2
    const skillBonus = AbilityBonusCalculator.calculateSkillBonus(baseStr, 0, modBonus, 1, 3)
    
    // 力量18 → MOD+4, +2狂暴加成 = +6, 熟練+3 = +9
    expect(skillBonus).toBe(9)
  })

  it('案例5: 多重效果疊加', () => {
    // 角色施放 Enhance Ability (Bull's Strength) + 穿戴手套 (+1 力量)
    const baseStr = 14
    const abilityBonus = 3 // 法術+2, 手套+1
    const finalStr = AbilityBonusCalculator.calculateFinalAbility(baseStr, abilityBonus)
    const finalMod = AbilityBonusCalculator.calculateFinalModifier(baseStr, abilityBonus, 0)
    
    expect(finalStr).toBe(17)
    expect(finalMod).toBe(3) // floor((17-10)/2) = 3
  })
})

describe('屬性加成系統 - 邊界條件與防禦性測試', () => {
  it('應該處理極低屬性值', () => {
    // 某些詛咒或疾病可能導致屬性降至極低
    expect(AbilityBonusCalculator.calculateFinalModifier(1, 0, 0)).toBe(-5)
    expect(AbilityBonusCalculator.calculateFinalModifier(3, 0, 0)).toBe(-4)
  })

  it('應該處理極高屬性值', () => {
    // 史詩級角色或神器
    expect(AbilityBonusCalculator.calculateFinalModifier(30, 0, 0)).toBe(10)
    expect(AbilityBonusCalculator.calculateFinalModifier(40, 0, 0)).toBe(15)
  })

  it('應該正確處理屬性值為負數的情況', () => {
    // 極端負面效果
    expect(AbilityBonusCalculator.calculateFinalAbility(10, -20)).toBe(-10)
    expect(AbilityBonusCalculator.calculateFinalModifier(10, -20, 0)).toBe(-10) // floor((-10-10)/2) = -10
  })

  it('應該在加成疊加後維持正確的數學關係', () => {
    // 驗證 MOD = floor((ABILITY - 10) / 2) 的數學關係
    for (let base = 1; base <= 20; base++) {
      for (let bonus = -5; bonus <= 5; bonus++) {
        const finalAbility = AbilityBonusCalculator.calculateFinalAbility(base, bonus)
        const expectedMod = Math.floor((finalAbility - 10) / 2)
        const actualMod = AbilityBonusCalculator.calculateFinalModifier(base, bonus, 0)
        expect(actualMod).toBe(expectedMod)
      }
    }
  })
})
