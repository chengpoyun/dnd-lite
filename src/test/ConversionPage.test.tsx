import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import { ConversionPage } from '../../components/ConversionPage'

// setup.ts 的全域 HybridDataManager 替身沒有這兩支方法，這裡改用自己的版本。
const dataManagerMocks = vi.hoisted(() => ({
  hasAnonymousCharactersToConvert: vi.fn(),
  convertAnonymousCharactersToUser: vi.fn(),
}))
vi.mock('../../services/hybridDataManager', () => ({
  HybridDataManager: dataManagerMocks,
}))

const USER_ID = 'user-uuid-0001'

/**
 * 讓 useEffect 內的 async 轉換流程跑完。
 *
 * 寫成 `advanceTimersByTimeAsync(0)` 而不是數次 `await Promise.resolve()`，
 * 是為了讓意圖明確——「把待處理的工作排乾」，而不是「剛好 await 兩次」。
 * （實測兩種寫法都能正確等到結果，因為 `await act(async ...)` 本身在收尾時
 * 就會排乾 microtask queue；這裡純粹是可讀性選擇，不是修 bug。）
 */
const flush = async () => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0)
  })
}

/** 推進畫面上的自動跳轉計時器（同樣會順帶把 pending 的 promise 排乾） */
const advance = async (ms: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

describe('ConversionPage - 匿名角色轉換', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('沒有匿名角色需要轉換時，不應對 DB 發出轉換請求', async () => {
    dataManagerMocks.hasAnonymousCharactersToConvert.mockResolvedValue(false)
    const onComplete = vi.fn()

    render(<ConversionPage userId={USER_ID} onComplete={onComplete} />)
    await flush()

    expect(dataManagerMocks.convertAnonymousCharactersToUser).not.toHaveBeenCalled()
    expect(screen.getByText('轉換完成！')).toBeInTheDocument()

    await advance(1500)
    expect(onComplete).toHaveBeenCalledWith(true)
  })

  it('有匿名角色時應帶著 userId 執行轉換，成功後自動完成', async () => {
    dataManagerMocks.hasAnonymousCharactersToConvert.mockResolvedValue(true)
    dataManagerMocks.convertAnonymousCharactersToUser.mockResolvedValue(true)
    const onComplete = vi.fn()

    render(<ConversionPage userId={USER_ID} onComplete={onComplete} />)
    await flush()

    expect(dataManagerMocks.convertAnonymousCharactersToUser).toHaveBeenCalledWith(USER_ID)
    expect(screen.getByText('轉換完成！')).toBeInTheDocument()

    await advance(2000)
    expect(onComplete).toHaveBeenCalledWith(true)
  })

  it('轉換失敗時應停在失敗畫面，不可自動放行', async () => {
    dataManagerMocks.hasAnonymousCharactersToConvert.mockResolvedValue(true)
    dataManagerMocks.convertAnonymousCharactersToUser.mockResolvedValue(false)
    const onComplete = vi.fn()

    render(<ConversionPage userId={USER_ID} onComplete={onComplete} />)
    await flush()

    expect(screen.getByText('轉換失敗')).toBeInTheDocument()
    expect(screen.getByText('重新嘗試')).toBeInTheDocument()
    expect(screen.getByText('跳過轉換')).toBeInTheDocument()

    // 即使等再久也不能自己跳過去，否則使用者會以為角色不見了
    await advance(10000)
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('轉換過程拋出例外時也要停在失敗畫面', async () => {
    dataManagerMocks.hasAnonymousCharactersToConvert.mockRejectedValue(new Error('network down'))
    const onComplete = vi.fn()

    render(<ConversionPage userId={USER_ID} onComplete={onComplete} />)
    await flush()

    expect(screen.getByText('轉換失敗')).toBeInTheDocument()

    await advance(10000)
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('失敗後點「重新嘗試」應再跑一次轉換，成功則進入完成畫面', async () => {
    dataManagerMocks.hasAnonymousCharactersToConvert.mockResolvedValue(true)
    dataManagerMocks.convertAnonymousCharactersToUser.mockResolvedValueOnce(false)
    const onComplete = vi.fn()

    render(<ConversionPage userId={USER_ID} onComplete={onComplete} />)
    await flush()
    expect(screen.getByText('轉換失敗')).toBeInTheDocument()

    dataManagerMocks.convertAnonymousCharactersToUser.mockResolvedValueOnce(true)
    fireEvent.click(screen.getByText('重新嘗試'))
    await flush()

    expect(dataManagerMocks.convertAnonymousCharactersToUser).toHaveBeenCalledTimes(2)
    expect(screen.getByText('轉換完成！')).toBeInTheDocument()
  })

  it('失敗後點「跳過轉換」應完成流程，且不再嘗試轉換（匿名資料保留）', async () => {
    dataManagerMocks.hasAnonymousCharactersToConvert.mockResolvedValue(true)
    dataManagerMocks.convertAnonymousCharactersToUser.mockResolvedValue(false)
    const onComplete = vi.fn()

    render(<ConversionPage userId={USER_ID} onComplete={onComplete} />)
    await flush()

    fireEvent.click(screen.getByText('跳過轉換'))
    expect(dataManagerMocks.convertAnonymousCharactersToUser).toHaveBeenCalledTimes(1)

    await advance(1500)
    expect(onComplete).toHaveBeenCalledWith(true)
  })

  it('轉換進行中應提示使用者不要關閉瀏覽器', async () => {
    let resolveCheck: (value: boolean) => void = () => {}
    dataManagerMocks.hasAnonymousCharactersToConvert.mockReturnValue(
      new Promise<boolean>((resolve) => {
        resolveCheck = resolve
      })
    )

    render(<ConversionPage userId={USER_ID} onComplete={vi.fn()} />)

    expect(screen.getByText('正在處理中，請勿關閉瀏覽器')).toBeInTheDocument()
    expect(screen.getByText('檢查帳號資料')).toBeInTheDocument()

    // 收尾：讓 pending 的 promise 跑完，避免測試結束後才更新 state
    resolveCheck(false)
    await flush()
  })

  // 迴歸保護：服務層之後若在中間多插幾層 await（例如重試或快取查詢），
  // 這些測試的等待方式仍必須成立。
  it('轉換流程中間多幾層 await 也要能正確等到結果', async () => {
    dataManagerMocks.hasAnonymousCharactersToConvert.mockImplementation(async () => {
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
      return true
    })
    dataManagerMocks.convertAnonymousCharactersToUser.mockImplementation(async () => {
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
      return true
    })
    const onComplete = vi.fn()

    render(<ConversionPage userId={USER_ID} onComplete={onComplete} />)
    await flush()

    expect(screen.getByText('轉換完成！')).toBeInTheDocument()

    await advance(2000)
    expect(onComplete).toHaveBeenCalledWith(true)
  })
})
