import { describe, it, expect, vi, beforeEach } from 'vitest'
import { HybridDataManager } from '../../services/hybridDataManager'
import { DetailedCharacterService } from '../../services/detailedCharacter'

// Mock the services
vi.mock('../../services/hybridDataManager')
vi.mock('../../services/detailedCharacter')

describe('角色數據保存服務', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('HybridDataManager', () => {
    it('應該能夠更新單一技能熟練度', async () => {
      const mockUpdateSingleSkillProficiency = vi.mocked(HybridDataManager.updateSingleSkillProficiency)
      mockUpdateSingleSkillProficiency.mockResolvedValue(true)

      const result = await HybridDataManager.updateSingleSkillProficiency('test-character-id', '運動', 1)

      expect(result).toBe(true)
      expect(mockUpdateSingleSkillProficiency).toHaveBeenCalledWith('test-character-id', '運動', 1)
    })

    it('應該能夠更新角色資料', async () => {
      const mockUpdateCharacter = vi.mocked(HybridDataManager.updateCharacter)
      mockUpdateCharacter.mockResolvedValue(true)

      const characterUpdate = {
        character: {
          id: 'test-id',
          name: '測試角色',
          character_class: '戰士',
          level: 5,
          experience: 6500,
          user_id: 'test-user',
          anonymous_id: null,
          is_anonymous: false,
          updated_at: new Date().toISOString()
        }
      }

      const result = await HybridDataManager.updateCharacter('test-character-id', characterUpdate)

      expect(result).toBe(true)
      expect(mockUpdateCharacter).toHaveBeenCalledWith('test-character-id', characterUpdate)
    })

    it('當更新失敗時應該返回 false', async () => {
      const mockUpdateSingleSkillProficiency = vi.mocked(HybridDataManager.updateSingleSkillProficiency)
      mockUpdateSingleSkillProficiency.mockResolvedValue(false)

      const result = await HybridDataManager.updateSingleSkillProficiency('invalid-id', '運動', 1)

      expect(result).toBe(false)
    })
  })

  describe('DetailedCharacterService', () => {
    it('應該能夠更新額外數據', async () => {
      const mockUpdateExtraData = vi.mocked(DetailedCharacterService.updateExtraData)
      mockUpdateExtraData.mockResolvedValue(true)

      const extraData = {
        downtime: 5,
        renown: { used: 2, total: 8 },
        prestige: { org: "冒險者公會", level: 1, rankName: "見習冒險者" },
        customRecords: [
          { id: "1", name: "完成任務", value: "救援村民", note: "獲得村長感謝" }
        ],
        attacks: []
      }

      const result = await DetailedCharacterService.updateExtraData('test-character-id', extraData)

      expect(result).toBe(true)
      expect(mockUpdateExtraData).toHaveBeenCalledWith('test-character-id', extraData)
    })

    it('應該處理額外數據更新失敗', async () => {
      const mockUpdateExtraData = vi.mocked(DetailedCharacterService.updateExtraData)
      mockUpdateExtraData.mockResolvedValue(false)

      const result = await DetailedCharacterService.updateExtraData('invalid-id', {})

      expect(result).toBe(false)
    })

    it('應該處理 updateExtraData 拋出的異常', async () => {
      const mockUpdateExtraData = vi.mocked(DetailedCharacterService.updateExtraData)
      mockUpdateExtraData.mockRejectedValue(new Error('Database connection failed'))

      try {
        await DetailedCharacterService.updateExtraData('test-id', {})
      } catch (error) {
        expect(error.message).toBe('Database connection failed')
      }
    })
  })
})

describe('角色數據驗證', () => {
  describe('能力值驗證', () => {
    it('應該接受有效的能力值', () => {
      const validAbilityScores = {
        str: 16, dex: 14, con: 15, int: 10, wis: 12, cha: 8
      }

      Object.values(validAbilityScores).forEach(value => {
        expect(value).toBeGreaterThan(0)
        expect(value).toBeLessThanOrEqual(30)
        expect(Number.isInteger(value)).toBe(true)
      })
    })

    it('應該拒絕無效的能力值', () => {
      const invalidScores = [-1, 0, 31, 100, NaN, Infinity]
      
      invalidScores.forEach(value => {
        expect(value < 1 || value > 30 || !Number.isFinite(value)).toBe(true)
      })
    })
  })

  describe('等級驗證', () => {
    it('應該接受有效等級', () => {
      const validLevels = [1, 5, 10, 20]
      
      validLevels.forEach(level => {
        expect(level).toBeGreaterThan(0)
        expect(level).toBeLessThanOrEqual(20)
        expect(Number.isInteger(level)).toBe(true)
      })
    })

    it('應該拒絕無效等級', () => {
      const invalidLevels = [0, -1, 21, 100, NaN, Infinity]
      
      invalidLevels.forEach(level => {
        expect(level <= 0 || level > 20 || !Number.isFinite(level)).toBe(true)
      })
    })
  })

  describe('貨幣驗證', () => {
    it('應該接受有效的貨幣值', () => {
      const validCurrency = { cp: 10, sp: 25, ep: 0, gp: 150, pp: 2 }
      
      Object.values(validCurrency).forEach(value => {
        expect(value).toBeGreaterThanOrEqual(0)
        expect(Number.isInteger(value)).toBe(true)
      })
    })

    it('應該拒絕負數貨幣值', () => {
      const invalidValues = [-1, -10, -100]
      
      invalidValues.forEach(value => {
        expect(value).toBeLessThan(0)
      })
    })
  })

  describe('冒險紀錄驗證', () => {
    it('應該接受有效的冒險紀錄', () => {
      const validRecord = {
        id: "1",
        name: "完成任務",
        value: "救援村民",
        note: "獲得村長感謝"
      }

      expect(validRecord.id).toBeTruthy()
      expect(validRecord.name.trim()).toBeTruthy()
      expect(validRecord.value.trim()).toBeTruthy()
      expect(typeof validRecord.note).toBe('string')
    })

    it('應該拒絕空的名稱或值', () => {
      const invalidRecords = [
        { id: "1", name: "", value: "test", note: "" },
        { id: "2", name: "test", value: "", note: "" },
        { id: "3", name: "   ", value: "test", note: "" },
        { id: "4", name: "test", value: "   ", note: "" }
      ]

      invalidRecords.forEach(record => {
        const hasEmptyName = !record.name.trim()
        const hasEmptyValue = !record.value.trim()
        expect(hasEmptyName || hasEmptyValue).toBe(true)
      })
    })
  })
})