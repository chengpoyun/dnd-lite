import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Mock } from 'vitest'

// src/test/setup.ts 全域把 services/detailedCharacter mock 成一個永遠回傳 true 的替身，
// 這裡要測的正是 updateExtraData 真正的驗證/合併邏輯，所以要先取消這個全域 mock。
vi.unmock('../../services/detailedCharacter')

import { supabase } from '../../lib/supabase'
import { DetailedCharacterService } from '../../services/detailedCharacter'

function createChainable(finalResult: { data?: any; error: any }) {
  const builder: any = {
    select: vi.fn(() => builder),
    update: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    maybeSingle: vi.fn(() => Promise.resolve(finalResult)),
    single: vi.fn(() => Promise.resolve(finalResult)),
  }
  return builder
}

describe('DetailedCharacterService.updateExtraData', () => {
  const mockedSupabase = supabase as unknown as { from: Mock }
  const validCharacterId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('characterId 驗證', () => {
    it.each(['', '   ', 'short', null, undefined])(
      '無效的 characterId（%s）應該直接回傳 false，不查詢 DB',
      async (invalidId) => {
        const result = await DetailedCharacterService.updateExtraData(invalidId as any, {})
        expect(result).toBe(false)
        expect(mockedSupabase.from).not.toHaveBeenCalled()
      }
    )
  })

  describe('已有記錄時的合併邏輯', () => {
    it('傳入的欄位會覆蓋既有值，未傳入的欄位保留 DB 既有值', async () => {
      const fetchBuilder = createChainable({
        data: {
          id: 'row-1',
          extra_data: {
            downtime: 5,
            renown: { used: 2, total: 8 },
            attacks: [{ name: '長劍', bonus: 5, damage: '1d8+3', type: '砍擊' }],
          },
        },
        error: null,
      })
      const updateBuilder = createChainable({ data: { id: 'row-1', extra_data: {} }, error: null })
      mockedSupabase.from
        .mockImplementationOnce(() => fetchBuilder)
        .mockImplementationOnce(() => updateBuilder)

      const result = await DetailedCharacterService.updateExtraData(validCharacterId, {
        customRecords: [{ id: '1', name: '完成任務', value: '救援村民', note: '獲得村長感謝' }],
      })

      expect(result).toBe(true)
      expect(updateBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          extra_data: expect.objectContaining({
            // 有傳入的欄位
            customRecords: [{ id: '1', name: '完成任務', value: '救援村民', note: '獲得村長感謝' }],
            // 未傳入的欄位應保留既有值，而不是被重置成預設值
            downtime: 5,
            renown: { used: 2, total: 8 },
            attacks: [{ name: '長劍', bonus: 5, damage: '1d8+3', type: '砍擊' }],
          }),
        })
      )
    })

    it('renown 缺少 total 欄位時，會被強制轉型並補 0（而非拒絕寫入）', async () => {
      const fetchBuilder = createChainable({ data: { id: 'row-1', extra_data: {} }, error: null })
      const updateBuilder = createChainable({ data: { id: 'row-1', extra_data: {} }, error: null })
      mockedSupabase.from
        .mockImplementationOnce(() => fetchBuilder)
        .mockImplementationOnce(() => updateBuilder)

      await DetailedCharacterService.updateExtraData(validCharacterId, { renown: { used: 3 } })

      expect(updateBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          extra_data: expect.objectContaining({ renown: { used: 3, total: 0 } }),
        })
      )
    })

    it('customRecords 傳入非陣列時，會忽略並保留既有陣列', async () => {
      const existingRecords = [{ id: '1', name: '既有紀錄', value: 'x', note: '' }]
      const fetchBuilder = createChainable({
        data: { id: 'row-1', extra_data: { customRecords: existingRecords } },
        error: null,
      })
      const updateBuilder = createChainable({ data: { id: 'row-1', extra_data: {} }, error: null })
      mockedSupabase.from
        .mockImplementationOnce(() => fetchBuilder)
        .mockImplementationOnce(() => updateBuilder)

      await DetailedCharacterService.updateExtraData(validCharacterId, { customRecords: 'not-an-array' as any })

      expect(updateBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          extra_data: expect.objectContaining({ customRecords: existingRecords }),
        })
      )
    })

    it('DB 更新回傳 error 時應回傳 false', async () => {
      const fetchBuilder = createChainable({ data: { id: 'row-1', extra_data: {} }, error: null })
      const updateBuilder = createChainable({ data: null, error: { message: 'update failed' } })
      mockedSupabase.from
        .mockImplementationOnce(() => fetchBuilder)
        .mockImplementationOnce(() => updateBuilder)

      const result = await DetailedCharacterService.updateExtraData(validCharacterId, { downtime: 3 })
      expect(result).toBe(false)
    })
  })

  describe('無既有記錄時建立新記錄', () => {
    it('會用預設欄位值 insert 新記錄，並帶入傳入的 extra_data', async () => {
      const fetchBuilder = createChainable({ data: null, error: null })
      const insertBuilder = createChainable({ data: { id: 'row-new', extra_data: {} }, error: null })
      mockedSupabase.from
        .mockImplementationOnce(() => fetchBuilder)
        .mockImplementationOnce(() => insertBuilder)

      const result = await DetailedCharacterService.updateExtraData(validCharacterId, { downtime: 2 })

      expect(result).toBe(true)
      expect(insertBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          character_id: validCharacterId,
          extra_data: expect.objectContaining({ downtime: 2, renown: { used: 0, total: 0 } }),
        })
      )
    })

    it('DB insert 回傳 error 時應回傳 false', async () => {
      const fetchBuilder = createChainable({ data: null, error: null })
      const insertBuilder = createChainable({ data: null, error: { message: 'insert failed' } })
      mockedSupabase.from
        .mockImplementationOnce(() => fetchBuilder)
        .mockImplementationOnce(() => insertBuilder)

      const result = await DetailedCharacterService.updateExtraData(validCharacterId, {})
      expect(result).toBe(false)
    })
  })
})
