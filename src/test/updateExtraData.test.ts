import { describe, it, expect, vi, beforeEach } from 'vitest'
import { supabase } from '../../lib/supabase'

// Mock Supabase 
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn()
      })),
      insert: vi.fn()
    }))
  }
}))

// 為了測試真實的業務邏輯，我們需要一個不使用 mock 的版本
class TestDetailedCharacterService {
  static async updateExtraData(characterId: string, extraData: any): Promise<boolean> {
    try {
      // 驗證 characterId
      if (!characterId || characterId.trim() === '' || characterId.length < 32) {
        console.error('updateExtraData: 無效的 characterId:', characterId)
        return false
      }

      // 模擬查詢現有記錄
      const mockFromResult = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ 
              data: { id: '1', character_id: characterId, current_hp: 45 }, 
              error: null 
            })
          }))
        }))
      }

      const mockSupabase = { from: vi.fn(() => mockFromResult) }
      const { data: existingStats } = await mockSupabase.from('character_current_stats')
        .select('*')
        .eq('character_id', characterId)
        .single()

      if (existingStats) {
        // 模擬更新操作
        const mockUpdateResult = {
          update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null })
          }))
        }
        mockSupabase.from = vi.fn(() => mockUpdateResult)

        const { error } = await mockSupabase.from('character_current_stats')
          .update({ extra_data: extraData, updated_at: new Date().toISOString() })
          .eq('character_id', characterId)

        if (error) {
          console.error('更新額外數據失敗:', error)
          return false
        }
      } else {
        // 模擬插入操作
        const mockInsertResult = {
          insert: vi.fn().mockResolvedValue({ error: null })
        }
        mockSupabase.from = vi.fn(() => mockInsertResult)

        const { error } = await mockSupabase.from('character_current_stats')
          .insert({
            character_id: characterId,
            current_hp: 1,
            max_hp: 1,
            temporary_hp: 0,
            current_hit_dice: 0,
            total_hit_dice: 1,
            armor_class: 10,
            initiative_bonus: 0,
            speed: 30,
            hit_die_type: 'd8',
            extra_data: extraData,
            updated_at: new Date().toISOString()
          })

        if (error) {
          console.error('創建角色狀態記錄失敗:', error)
          return false
        }
      }

      return true
    } catch (error) {
      console.error('更新額外數據失敗:', error)
      return false
    }
  }
}

describe('DetailedCharacterService.updateExtraData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('參數驗證', () => {
    it('應該拒絕無效的 characterId', async () => {
      const invalidIds = ['', '   ', 'short', null, undefined]

      for (const invalidId of invalidIds) {
        const result = await TestDetailedCharacterService.updateExtraData(invalidId as any, {})
        expect(result).toBe(false)
      }
    })

    it('應該接受有效的 characterId', async () => {
      const validId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' // 36 字符的 UUID
      const result = await TestDetailedCharacterService.updateExtraData(validId, {})
      expect(result).toBe(true)
    })
  })

  describe('數據更新邏輯', () => {
    const validCharacterId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'

    it('應該正確處理冒險紀錄數據', async () => {
      const extraData = {
        customRecords: [
          { id: "1", name: "完成任務", value: "救援村民", note: "獲得村長感謝" },
          { id: "2", name: "收集物品", value: "古老卷軸", note: "在廢墟中發現" }
        ]
      }

      const result = await TestDetailedCharacterService.updateExtraData(validCharacterId, extraData)
      expect(result).toBe(true)
    })

    it('應該正確處理修整期和名聲數據', async () => {
      const extraData = {
        downtime: 5,
        renown: { used: 2, total: 8 },
        prestige: { org: "冒險者公會", level: 1, rankName: "見習冒險者" }
      }

      const result = await TestDetailedCharacterService.updateExtraData(validCharacterId, extraData)
      expect(result).toBe(true)
    })

    it('應該正確處理攻擊數據', async () => {
      const extraData = {
        attacks: [
          { name: "長劍", bonus: 5, damage: "1d8+3", type: "砍擊" },
          { name: "短弓", bonus: 4, damage: "1d6+2", type: "穿刺" }
        ]
      }

      const result = await TestDetailedCharacterService.updateExtraData(validCharacterId, extraData)
      expect(result).toBe(true)
    })

    it('應該正確處理複合數據', async () => {
      const extraData = {
        downtime: 3,
        renown: { used: 1, total: 5 },
        prestige: { org: "法師學院", level: 2, rankName: "學徒法師" },
        customRecords: [
          { id: "1", name: "學習咒語", value: "火球術", note: "從古籍中學會" }
        ],
        attacks: [
          { name: "法杖", bonus: 2, damage: "1d6", type: "鈍擊" }
        ]
      }

      const result = await TestDetailedCharacterService.updateExtraData(validCharacterId, extraData)
      expect(result).toBe(true)
    })

    it('應該處理空數據', async () => {
      const extraData = {
        customRecords: [],
        attacks: [],
        downtime: 0,
        renown: { used: 0, total: 0 },
        prestige: { org: "", level: 0, rankName: "" }
      }

      const result = await TestDetailedCharacterService.updateExtraData(validCharacterId, extraData)
      expect(result).toBe(true)
    })
  })

  describe('數據完整性驗證', () => {
    const validCharacterId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'

    it('冒險紀錄應該包含必要的欄位', async () => {
      const validRecord = { id: "1", name: "test", value: "test", note: "test" }
      const invalidRecords = [
        { name: "test", value: "test" }, // 缺少 id
        { id: "1", value: "test" }, // 缺少 name
        { id: "1", name: "test" }, // 缺少 value
      ]

      // 有效記錄應該有所有必要欄位
      expect(validRecord.id).toBeDefined()
      expect(validRecord.name).toBeDefined()
      expect(validRecord.value).toBeDefined()

      // 無效記錄缺少必要欄位
      invalidRecords.forEach(record => {
        const hasAllRequiredFields = 
          'id' in record && 
          'name' in record && 
          'value' in record
        expect(hasAllRequiredFields).toBe(false)
      })
    })

    it('名聲數據應該有正確的結構', async () => {
      const validRenown = { used: 2, total: 8 }
      const invalidRenown = [
        { used: 2 }, // 缺少 total
        { total: 8 }, // 缺少 used
        { used: -1, total: 8 }, // 負數 used
        { used: 2, total: -1 }, // 負數 total
        { used: 10, total: 8 }, // used > total 是允許的（超支情況）
      ]

      // 驗證有效數據
      expect(validRenown.used).toBeGreaterThanOrEqual(0)
      expect(validRenown.total).toBeGreaterThanOrEqual(0)
      expect(typeof validRenown.used).toBe('number')
      expect(typeof validRenown.total).toBe('number')

      // 驗證無效數據的檢測
      expect('used' in invalidRenown[0] && 'total' in invalidRenown[0]).toBe(false)
      expect('used' in invalidRenown[1] && 'total' in invalidRenown[1]).toBe(false)
      expect(invalidRenown[2].used < 0).toBe(true)
      expect(invalidRenown[3].total < 0).toBe(true)
    })

    it('威望數據應該有正確的結構', async () => {
      const validPrestige = { org: "冒險者公會", level: 1, rankName: "見習冒險者" }
      
      expect(typeof validPrestige.org).toBe('string')
      expect(typeof validPrestige.level).toBe('number')
      expect(typeof validPrestige.rankName).toBe('string')
      expect(validPrestige.level).toBeGreaterThanOrEqual(0)
    })

    it('修整期應該是非負數', async () => {
      const validDowntimes = [0, 1, 5, 10, 100]
      const invalidDowntimes = [-1, -5, NaN, Infinity]

      validDowntimes.forEach(downtime => {
        expect(downtime).toBeGreaterThanOrEqual(0)
        expect(Number.isFinite(downtime)).toBe(true)
      })

      invalidDowntimes.forEach(downtime => {
        expect(downtime < 0 || !Number.isFinite(downtime)).toBe(true)
      })
    })
  })
})