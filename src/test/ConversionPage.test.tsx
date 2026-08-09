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
 * 用 `advanceTimersByTimeAsync(1)`：
 * - 純 microtask 的等待其實 `await act(async ...)` 收尾就會排乾，不需要特別處理；
 * - 但服務層若是「經過計時器才回覆」（debounce、退避重試、逾時包裝），
 *   就必須真的推進假計時器，而且要推進到足以帶動**串接的下一代計時器**——
 *   `advanceTimersByTimeAsync(0)` 只推得動第一代。
 *
 * 推進 1ms 遠小於畫面自動跳轉的 1500/2000ms，不會誤觸那些計時器。
 * 下方「服務層經過計時器才回覆」那支測試就是在守這件事。
 */
const flush = async () => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1)
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

  // 迴歸保護：服務層之後若改成經過計時器才回覆（例如加了 debounce、
  // 退避重試或逾時包裝），這裡的等待方式仍必須成立。
  //
  // 刻意用 setTimeout 而非 `await Promise.resolve()`：假計時器啟用時，
  // setTimeout 只有在計時器被推進後才會解析，所以這支測試只有在 flush()
  // 真的會推進計時器時才會過。若把 flush() 換成單純的 act(async () => {})
  // 或數次 await Promise.resolve()，這支就會紅——那才叫有守住東西。
  const resolveAfterTimer = <T,>(value: T) => async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
    return value
  }

  it('服務層經過計時器才回覆時也要能正確等到結果', async () => {
    dataManagerMocks.hasAnonymousCharactersToConvert.mockImplementation(resolveAfterTimer(true))
    dataManagerMocks.convertAnonymousCharactersToUser.mockImplementation(resolveAfterTimer(true))
    const onComplete = vi.fn()

    render(<ConversionPage userId={USER_ID} onComplete={onComplete} />)
    await flush()

    expect(screen.getByText('轉換完成！')).toBeInTheDocument()

    await advance(2000)
    expect(onComplete).toHaveBeenCalledWith(true)
  })
})
