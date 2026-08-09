import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { WelcomePage } from '../../components/WelcomePage'

const authMocks = vi.hoisted(() => ({
  signInWithGoogle: vi.fn(),
  isAuthenticated: vi.fn(() => Promise.resolve(false)),
}))
vi.mock('../../services/auth', () => ({ AuthService: authMocks }))

const anonymousMocks = vi.hoisted(() => ({
  init: vi.fn(),
  getAnonymousId: vi.fn(() => 'anon_test'),
}))
vi.mock('../../services/anonymous', () => ({ AnonymousService: anonymousMocks }))

describe('WelcomePage - 進入方式', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMocks.signInWithGoogle.mockResolvedValue({ success: true })
    anonymousMocks.init.mockResolvedValue(undefined)
  })

  it('點「匿名試用」應先初始化匿名身分，成功才進入 App', async () => {
    const onNext = vi.fn()
    render(<WelcomePage onNext={onNext} />)

    fireEvent.click(screen.getByText('匿名試用'))

    await waitFor(() => {
      expect(anonymousMocks.init).toHaveBeenCalled()
      expect(onNext).toHaveBeenCalledWith('anonymous')
    })
  })

  it('匿名初始化失敗時不可進入 App', async () => {
    anonymousMocks.init.mockRejectedValue(new Error('supabase down'))
    const onNext = vi.fn()
    render(<WelcomePage onNext={onNext} />)

    fireEvent.click(screen.getByText('匿名試用'))

    await waitFor(() => {
      expect(screen.getByText('初始化失敗，請稍後再試')).toBeInTheDocument()
    })
    expect(onNext).not.toHaveBeenCalled()
  })

  it('點「使用 Google 登入」應觸發 OAuth，不自行呼叫 onNext（由重新導向接手）', async () => {
    const onNext = vi.fn()
    render(<WelcomePage onNext={onNext} />)

    fireEvent.click(screen.getByText('使用 Google 登入'))

    await waitFor(() => {
      expect(authMocks.signInWithGoogle).toHaveBeenCalled()
    })
    expect(onNext).not.toHaveBeenCalled()
  })

  it('Google 登入失敗時應顯示後端回傳的原因', async () => {
    authMocks.signInWithGoogle.mockResolvedValue({ success: false, error: '帳號已停用' })
    render(<WelcomePage onNext={vi.fn()} />)

    fireEvent.click(screen.getByText('使用 Google 登入'))

    expect(await screen.findByText('帳號已停用')).toBeInTheDocument()
  })
})

describe('WelcomePage - 初始化錯誤', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('有初始化錯誤時應顯示訊息與重新載入鈕', () => {
    const onRetry = vi.fn()
    render(<WelcomePage onNext={vi.fn()} initError="無法連線到伺服器" onRetry={onRetry} />)

    expect(screen.getByText('無法連線到伺服器')).toBeInTheDocument()

    fireEvent.click(screen.getByText('🔄 重新載入'))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('沒有 onRetry 時不應顯示重新載入鈕', () => {
    render(<WelcomePage onNext={vi.fn()} initError="無法連線到伺服器" />)

    expect(screen.getByText('無法連線到伺服器')).toBeInTheDocument()
    expect(screen.queryByText('🔄 重新載入')).not.toBeInTheDocument()
  })

  it('沒有錯誤時不應顯示錯誤區塊', () => {
    render(<WelcomePage onNext={vi.fn()} />)

    expect(screen.queryByText('🔄 重新載入')).not.toBeInTheDocument()
  })
})
