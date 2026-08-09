import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Mock } from 'vitest'

// setup.ts 全域把 services/detailedCharacter mock 成只有 updateExtraData 的簡化替身，
// 這裡要測的是真正的轉換邏輯，所以取消全域 mock（同 updateExtraData.portentDice.test.ts 的作法）。
vi.unmock('../../services/detailedCharacter')

// 全域的 AnonymousService 替身沒有 clearAnonymousId，補上才能驗證「何時該／不該清匿名 ID」。
const anonymousMocks = vi.hoisted(() => ({
  clearAnonymousId: vi.fn(),
  getAnonymousId: vi.fn(() => 'anon_test'),
  init: vi.fn(),
}))
vi.mock('../../services/anonymous', () => ({ AnonymousService: anonymousMocks }))

import { supabase } from '../../lib/supabase'
import { DetailedCharacterService } from '../../services/detailedCharacter'

const ANON_KEY = 'dnd_anonymous_user_id'
const ANON_ID = 'anon_abc123'
const USER_ID = 'user-uuid-0001'

/**
 * Supabase query builder 替身。
 * 真實用法是 `await supabase.from(x).select().eq().eq()`，鏈的尾端直接被 await，
 * 所以 builder 本身要是 thenable。
 */
function createQuery(result: { data?: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    update: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    then: (onFulfilled: (v: unknown) => unknown, onRejected: (e: unknown) => unknown) =>
      Promise.resolve(result).then(onFulfilled, onRejected),
  }
  return builder as {
    select: Mock
    update: Mock
    eq: Mock
    limit: Mock
  }
}

describe('DetailedCharacterService.convertAnonymousCharactersToUser', () => {
  const mockedSupabase = supabase as unknown as { from: Mock }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.setItem(ANON_KEY, ANON_ID)
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('沒有匿名 ID 時直接回傳 true，不應該打 DB', async () => {
    localStorage.removeItem(ANON_KEY)

    const result = await DetailedCharacterService.convertAnonymousCharactersToUser(USER_ID)

    expect(result).toBe(true)
    expect(mockedSupabase.from).not.toHaveBeenCalled()
  })

  it('有匿名角色時，應把 user_id 寫入並清掉匿名標記', async () => {
    const fetchQuery = createQuery({ data: [{ id: 'char-1' }, { id: 'char-2' }], error: null })
    const updateQuery = createQuery({ data: null, error: null })
    mockedSupabase.from
      .mockImplementationOnce(() => fetchQuery)
      .mockImplementationOnce(() => updateQuery)

    const result = await DetailedCharacterService.convertAnonymousCharactersToUser(USER_ID)

    expect(result).toBe(true)
    expect(updateQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: USER_ID,
        is_anonymous: false,
        anonymous_id: null,
      })
    )
  })

  it('更新時必須同時用 anonymous_id 與 is_anonymous 過濾，避免動到別人的角色', async () => {
    const fetchQuery = createQuery({ data: [{ id: 'char-1' }], error: null })
    const updateQuery = createQuery({ data: null, error: null })
    mockedSupabase.from
      .mockImplementationOnce(() => fetchQuery)
      .mockImplementationOnce(() => updateQuery)

    await DetailedCharacterService.convertAnonymousCharactersToUser(USER_ID)

    expect(updateQuery.eq).toHaveBeenCalledWith('anonymous_id', ANON_ID)
    expect(updateQuery.eq).toHaveBeenCalledWith('is_anonymous', true)
  })

  it('轉換成功後才可以清除本機的匿名 ID', async () => {
    const fetchQuery = createQuery({ data: [{ id: 'char-1' }], error: null })
    const updateQuery = createQuery({ data: null, error: null })
    mockedSupabase.from
      .mockImplementationOnce(() => fetchQuery)
      .mockImplementationOnce(() => updateQuery)

    await DetailedCharacterService.convertAnonymousCharactersToUser(USER_ID)

    expect(anonymousMocks.clearAnonymousId).toHaveBeenCalled()
  })

  // 以下兩個是「資料遺失」防線：一旦轉換失敗卻把匿名 ID 清掉，
  // 使用者的角色就再也對應不回來了。
  it('更新失敗時應回傳 false，且絕不可清除匿名 ID', async () => {
    const fetchQuery = createQuery({ data: [{ id: 'char-1' }], error: null })
    const updateQuery = createQuery({ data: null, error: { message: 'update failed' } })
    mockedSupabase.from
      .mockImplementationOnce(() => fetchQuery)
      .mockImplementationOnce(() => updateQuery)

    const result = await DetailedCharacterService.convertAnonymousCharactersToUser(USER_ID)

    expect(result).toBe(false)
    expect(anonymousMocks.clearAnonymousId).not.toHaveBeenCalled()
    expect(localStorage.getItem(ANON_KEY)).toBe(ANON_ID)
  })

  it('查詢匿名角色失敗時應回傳 false，且絕不可清除匿名 ID', async () => {
    const fetchQuery = createQuery({ data: null, error: { message: 'fetch failed' } })
    mockedSupabase.from.mockImplementationOnce(() => fetchQuery)

    const result = await DetailedCharacterService.convertAnonymousCharactersToUser(USER_ID)

    expect(result).toBe(false)
    expect(anonymousMocks.clearAnonymousId).not.toHaveBeenCalled()
    expect(localStorage.getItem(ANON_KEY)).toBe(ANON_ID)
  })

  it('查無匿名角色時不應發出 update，但仍要清掉殘留的匿名 ID', async () => {
    const fetchQuery = createQuery({ data: [], error: null })
    mockedSupabase.from.mockImplementationOnce(() => fetchQuery)

    const result = await DetailedCharacterService.convertAnonymousCharactersToUser(USER_ID)

    expect(result).toBe(true)
    expect(mockedSupabase.from).toHaveBeenCalledTimes(1)
    expect(anonymousMocks.clearAnonymousId).toHaveBeenCalled()
  })
})

describe('DetailedCharacterService.hasAnonymousCharactersToConvert', () => {
  const mockedSupabase = supabase as unknown as { from: Mock }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.setItem(ANON_KEY, ANON_ID)
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('沒有匿名 ID 時回傳 false，不應打 DB', async () => {
    localStorage.removeItem(ANON_KEY)

    await expect(DetailedCharacterService.hasAnonymousCharactersToConvert()).resolves.toBe(false)
    expect(mockedSupabase.from).not.toHaveBeenCalled()
  })

  it('查到匿名角色時回傳 true', async () => {
    mockedSupabase.from.mockImplementationOnce(() =>
      createQuery({ data: [{ id: 'char-1' }], error: null })
    )

    await expect(DetailedCharacterService.hasAnonymousCharactersToConvert()).resolves.toBe(true)
  })

  it('查無匿名角色時回傳 false', async () => {
    mockedSupabase.from.mockImplementationOnce(() => createQuery({ data: [], error: null }))

    await expect(DetailedCharacterService.hasAnonymousCharactersToConvert()).resolves.toBe(false)
  })

  it('查詢出錯時吞掉例外並回傳 false，不能讓登入流程卡住', async () => {
    mockedSupabase.from.mockImplementationOnce(() =>
      createQuery({ data: null, error: { message: 'boom' } })
    )

    await expect(DetailedCharacterService.hasAnonymousCharactersToConvert()).resolves.toBe(false)
  })
})
