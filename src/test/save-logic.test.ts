import { describe, it, expect, vi, beforeEach } from 'vitest'

// 測試保存邏輯的純函數版本
export class CharacterDataSaver {
  static async saveCharacterBasicInfo(
    saveFunction: (name: string, characterClass: string, level: number) => Promise<boolean>,
    name: string,
    characterClass: string,
    level: number
  ): Promise<boolean> {
    // 驗證等級
    if (!level || level < 1 || level > 20) {
      return false
    }
    
    // 驗證名稱
    if (!name || name.trim() === '') {
      return false
    }
    
    // 驗證職業
    if (!characterClass || characterClass.trim() === '') {
      return false
    }
    
    return await saveFunction(name.trim(), characterClass.trim(), level)
  }
  
  static async saveAbilityScores(
    saveFunction: (abilityScores: any) => Promise<boolean>,
    abilityScores: { str: number, dex: number, con: number, int: number, wis: number, cha: number }
  ): Promise<boolean> {
    // 驗證所有能力值
    for (const [key, value] of Object.entries(abilityScores)) {
      if (!Number.isInteger(value) || value < 1 || value > 30) {
        console.warn(`無效的能力值 ${key}: ${value}`)
        return false
      }
    }
    
    return await saveFunction(abilityScores)
  }
  
  static async saveCurrencyAndExp(
    saveFunction: (gp: number, exp: number) => Promise<boolean>,
    gp: number,
    exp: number
  ): Promise<boolean> {
    // 驗證貨幣值
    if (!Number.isInteger(gp) || gp < 0) {
      return false
    }
    
    // 驗證經驗值
    if (!Number.isInteger(exp) || exp < 0) {
      return false
    }
    
    return await saveFunction(gp, exp)
  }
  
  static async saveExtraData(
    saveFunction: (extraData: any) => Promise<boolean>,
    extraData: {
      downtime?: number,
      renown?: { used: number, total: number },
      customRecords?: Array<{ id: string, name: string, value: string, note?: string }>,
      prestige?: any,
      attacks?: any[]
    }
  ): Promise<boolean> {
    // 驗證修整期
    if (extraData.downtime !== undefined && (extraData.downtime < 0 || !Number.isInteger(extraData.downtime))) {
      return false
    }
    
    // 驗證名聲
    if (extraData.renown) {
      if (extraData.renown.used < 0 || extraData.renown.total < 0 || 
          !Number.isInteger(extraData.renown.used) || !Number.isInteger(extraData.renown.total)) {
        return false
      }
    }
    
    // 驗證自定義記錄
    if (extraData.customRecords) {
      for (const record of extraData.customRecords) {
        if (!record.id || !record.name || !record.value || 
            record.name.trim() === '' || record.value.trim() === '') {
          return false
        }
      }
    }
    
    return await saveFunction(extraData)
  }
  
  static async saveSkillProficiency(
    saveFunction: (skillName: string, level: number) => Promise<boolean>,
    skillName: string,
    level: number
  ): Promise<boolean> {
    // 驗證技能名稱
    if (!skillName || skillName.trim() === '') {
      return false
    }
    
    // 驗證熟練度等級 (0=無熟練, 1=熟練, 2=專精)
    if (!Number.isInteger(level) || level < 0 || level > 2) {
      return false
    }
    
    return await saveFunction(skillName, level)
  }
}

describe('CharacterDataSaver - 保存邏輯測試', () => {
  const mockSaveFunction = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockSaveFunction.mockResolvedValue(true)
  })

  describe('saveCharacterBasicInfo', () => {
    it('應該保存有效的角色基本信息', async () => {
      const result = await CharacterDataSaver.saveCharacterBasicInfo(
        mockSaveFunction,
        '測試角色',
        '戰士',
        5
      )

      expect(result).toBe(true)
      expect(mockSaveFunction).toHaveBeenCalledWith('測試角色', '戰士', 5)
    })

    it('應該拒絕無效的等級', async () => {
      const invalidLevels = [0, -1, 21, 100, NaN, Infinity]

      for (const level of invalidLevels) {
        const result = await CharacterDataSaver.saveCharacterBasicInfo(
          mockSaveFunction,
          '測試角色',
          '戰士',
          level
        )

        expect(result).toBe(false)
      }

      expect(mockSaveFunction).not.toHaveBeenCalled()
    })

    it('應該拒絕空的角色名稱', async () => {
      const invalidNames = ['', '   ', null, undefined]

      for (const name of invalidNames) {
        const result = await CharacterDataSaver.saveCharacterBasicInfo(
          mockSaveFunction,
          name as any,
          '戰士',
          5
        )

        expect(result).toBe(false)
      }

      expect(mockSaveFunction).not.toHaveBeenCalled()
    })

    it('應該拒絕空的職業', async () => {
      const invalidClasses = ['', '   ', null, undefined]

      for (const characterClass of invalidClasses) {
        const result = await CharacterDataSaver.saveCharacterBasicInfo(
          mockSaveFunction,
          '測試角色',
          characterClass as any,
          5
        )

        expect(result).toBe(false)
      }

      expect(mockSaveFunction).not.toHaveBeenCalled()
    })

    it('應該修剪空白字符', async () => {
      const result = await CharacterDataSaver.saveCharacterBasicInfo(
        mockSaveFunction,
        '  測試角色  ',
        '  戰士  ',
        5
      )

      expect(result).toBe(true)
      expect(mockSaveFunction).toHaveBeenCalledWith('測試角色', '戰士', 5)
    })
  })

  describe('saveAbilityScores', () => {
    it('應該保存有效的能力值', async () => {
      const abilityScores = {
        str: 16, dex: 14, con: 15, int: 10, wis: 12, cha: 8
      }

      const result = await CharacterDataSaver.saveAbilityScores(
        mockSaveFunction,
        abilityScores
      )

      expect(result).toBe(true)
      expect(mockSaveFunction).toHaveBeenCalledWith(abilityScores)
    })

    it('應該拒絕超出範圍的能力值', async () => {
      const invalidScores = [
        { str: 0, dex: 14, con: 15, int: 10, wis: 12, cha: 8 },   // str too low
        { str: 31, dex: 14, con: 15, int: 10, wis: 12, cha: 8 },  // str too high
        { str: 16, dex: 14, con: 15, int: 10, wis: 12, cha: NaN }, // cha invalid
      ]

      for (const scores of invalidScores) {
        const result = await CharacterDataSaver.saveAbilityScores(mockSaveFunction, scores)
        expect(result).toBe(false)
      }

      expect(mockSaveFunction).not.toHaveBeenCalled()
    })
  })

  describe('saveCurrencyAndExp', () => {
    it('應該保存有效的貨幣和經驗值', async () => {
      const result = await CharacterDataSaver.saveCurrencyAndExp(
        mockSaveFunction,
        150,
        6500
      )

      expect(result).toBe(true)
      expect(mockSaveFunction).toHaveBeenCalledWith(150, 6500)
    })

    it('應該允許零值', async () => {
      const result = await CharacterDataSaver.saveCurrencyAndExp(
        mockSaveFunction,
        0,
        0
      )

      expect(result).toBe(true)
      expect(mockSaveFunction).toHaveBeenCalledWith(0, 0)
    })

    it('應該拒絕負值', async () => {
      const result1 = await CharacterDataSaver.saveCurrencyAndExp(mockSaveFunction, -1, 6500)
      const result2 = await CharacterDataSaver.saveCurrencyAndExp(mockSaveFunction, 150, -1)

      expect(result1).toBe(false)
      expect(result2).toBe(false)
      expect(mockSaveFunction).not.toHaveBeenCalled()
    })
  })

  describe('saveExtraData', () => {
    it('應該保存有效的額外數據', async () => {
      const extraData = {
        downtime: 5,
        renown: { used: 2, total: 8 },
        customRecords: [
          { id: "1", name: "完成任務", value: "救援村民", note: "獲得村長感謝" }
        ]
      }

      const result = await CharacterDataSaver.saveExtraData(mockSaveFunction, extraData)

      expect(result).toBe(true)
      expect(mockSaveFunction).toHaveBeenCalledWith(extraData)
    })

    it('應該拒絕無效的修整期', async () => {
      const invalidData = { downtime: -1 }
      const result = await CharacterDataSaver.saveExtraData(mockSaveFunction, invalidData)

      expect(result).toBe(false)
      expect(mockSaveFunction).not.toHaveBeenCalled()
    })

    it('應該拒絕無效的名聲數據', async () => {
      const invalidData = { renown: { used: -1, total: 8 } }
      const result = await CharacterDataSaver.saveExtraData(mockSaveFunction, invalidData)

      expect(result).toBe(false)
      expect(mockSaveFunction).not.toHaveBeenCalled()
    })

    it('應該拒絕無效的自定義記錄', async () => {
      const invalidData = {
        customRecords: [
          { id: "1", name: "", value: "test", note: "" } // empty name
        ]
      }

      const result = await CharacterDataSaver.saveExtraData(mockSaveFunction, invalidData)

      expect(result).toBe(false)
      expect(mockSaveFunction).not.toHaveBeenCalled()
    })

    it('應該處理空的額外數據', async () => {
      const result = await CharacterDataSaver.saveExtraData(mockSaveFunction, {})

      expect(result).toBe(true)
      expect(mockSaveFunction).toHaveBeenCalledWith({})
    })
  })

  describe('saveSkillProficiency', () => {
    it('應該保存有效的技能熟練度', async () => {
      const result = await CharacterDataSaver.saveSkillProficiency(
        mockSaveFunction,
        '運動',
        1
      )

      expect(result).toBe(true)
      expect(mockSaveFunction).toHaveBeenCalledWith('運動', 1)
    })

    it('應該允許所有有效的熟練度等級', async () => {
      const validLevels = [0, 1, 2] // 0=無熟練, 1=熟練, 2=專精

      for (const level of validLevels) {
        mockSaveFunction.mockClear()
        const result = await CharacterDataSaver.saveSkillProficiency(
          mockSaveFunction,
          '運動',
          level
        )

        expect(result).toBe(true)
        expect(mockSaveFunction).toHaveBeenCalledWith('運動', level)
      }
    })

    it('應該拒絕無效的技能名稱', async () => {
      const invalidNames = ['', '   ', null, undefined]

      for (const name of invalidNames) {
        const result = await CharacterDataSaver.saveSkillProficiency(
          mockSaveFunction,
          name as any,
          1
        )

        expect(result).toBe(false)
      }

      expect(mockSaveFunction).not.toHaveBeenCalled()
    })

    it('應該拒絕無效的熟練度等級', async () => {
      const invalidLevels = [-1, 3, 100, NaN, Infinity]

      for (const level of invalidLevels) {
        const result = await CharacterDataSaver.saveSkillProficiency(
          mockSaveFunction,
          '運動',
          level
        )

        expect(result).toBe(false)
      }

      expect(mockSaveFunction).not.toHaveBeenCalled()
    })
  })

  describe('錯誤處理', () => {
    it('應該處理保存函數返回 false', async () => {
      mockSaveFunction.mockResolvedValue(false)

      const result = await CharacterDataSaver.saveCharacterBasicInfo(
        mockSaveFunction,
        '測試角色',
        '戰士',
        5
      )

      expect(result).toBe(false)
      expect(mockSaveFunction).toHaveBeenCalled()
    })

    it('應該處理保存函數拋出異常', async () => {
      mockSaveFunction.mockRejectedValue(new Error('Database error'))

      try {
        await CharacterDataSaver.saveCharacterBasicInfo(
          mockSaveFunction,
          '測試角色',
          '戰士',
          5
        )
      } catch (error) {
        expect(error.message).toBe('Database error')
      }

      expect(mockSaveFunction).toHaveBeenCalled()
    })
  })
})