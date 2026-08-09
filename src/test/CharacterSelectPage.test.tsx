import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import { CharacterSelectPage } from '../../components/CharacterSelectPage'
import type { Character } from '../../lib/supabase'

// setup.ts 的全域 HybridDataManager 替身缺 deleteCharacter / createCharacter。
const dataManagerMocks = vi.hoisted(() => ({
  getUserCharacters: vi.fn(),
  createCharacter: vi.fn(),
  deleteCharacter: vi.fn(),
}))
vi.mock('../../services/hybridDataManager', () => ({
  HybridDataManager: dataManagerMocks,
}))

const authMocks = vi.hoisted(() => ({
  signOut: vi.fn(() => Promise.resolve()),
  signInWithGoogle: vi.fn(() => Promise.resolve({ success: true })),
  isAuthenticated: vi.fn(() => Promise.resolve(true)),
}))
vi.mock('../../services/auth', () => ({ AuthService: authMocks }))

const makeCharacter = (overrides: Partial<Character> = {}): Character => ({
  id: 'char-1',
  user_id: 'user-1',
  anonymous_id: null,
  name: '貝瑞',
  character_class: '法師',
  level: 5,
  experience: 0,
  is_anonymous: false,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-02T00:00:00.000Z',
  ...overrides,
})

const renderPage = (props: Partial<React.ComponentProps<typeof CharacterSelectPage>> = {}) =>
  render(
    <CharacterSelectPage
      userMode="authenticated"
      onCharacterSelect={vi.fn()}
      onBack={vi.fn()}
      {...props}
    />
  )

describe('CharacterSelectPage - 角色列表', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    dataManagerMocks.getUserCharacters.mockResolvedValue([])
  })

  it('載入完成後應列出角色', async () => {
    dataManagerMocks.getUserCharacters.mockResolvedValue([
      makeCharacter(),
      makeCharacter({ id: 'char-2', name: '新' }),
    ])

    renderPage()

    expect(await screen.findByText('貝瑞')).toBeInTheDocument()
    expect(screen.getByText('新')).toBeInTheDocument()
  })

  it('點「選擇」應把該角色交給呼叫端', async () => {
    const character = makeCharacter()
    dataManagerMocks.getUserCharacters.mockResolvedValue([character])
    const onCharacterSelect = vi.fn()

    renderPage({ onCharacterSelect })
    await screen.findByText('貝瑞')

    fireEvent.click(screen.getByText('選擇'))

    expect(onCharacterSelect).toHaveBeenCalledWith(character)
  })

  it('匿名模式且沒有角色時應直接展開建立表單', async () => {
    renderPage({ userMode: 'anonymous' })

    expect(await screen.findByPlaceholderText('輸入角色名稱')).toBeInTheDocument()
  })

  it('匿名模式已有角色時不提供刪除鈕（僅限一個角色）', async () => {
    dataManagerMocks.getUserCharacters.mockResolvedValue([makeCharacter()])

    renderPage({ userMode: 'anonymous' })
    await screen.findByText('貝瑞')

    expect(screen.getByText(/匿名模式下僅限一個角色/)).toBeInTheDocument()
    expect(screen.queryByText('確認刪除')).not.toBeInTheDocument()
  })
})

describe('CharacterSelectPage - 刪除角色（不可復原，須有防誤刪）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    dataManagerMocks.getUserCharacters.mockResolvedValue([makeCharacter()])
    dataManagerMocks.deleteCharacter.mockResolvedValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const openDeleteConfirm = async () => {
    await screen.findByText('貝瑞')
    // 刪除鈕只有圖示，取角色卡片內最後一顆按鈕
    const card = screen.getByText('貝瑞').closest('div.group') as HTMLElement
    const buttons = within(card).getAllByRole('button')
    fireEvent.click(buttons[buttons.length - 1])
  }

  it('點刪除只會跳確認框，在確認前絕不可真的刪除', async () => {
    renderPage()
    await openDeleteConfirm()

    expect(await screen.findByText('確認刪除角色')).toBeInTheDocument()
    expect(screen.getByText('貝瑞', { selector: 'span' })).toBeInTheDocument()
    expect(dataManagerMocks.deleteCharacter).not.toHaveBeenCalled()
  })

  it('確認後才呼叫刪除，並把角色從列表移除', async () => {
    renderPage()
    await openDeleteConfirm()
    fireEvent.click(await screen.findByText('確認刪除'))

    await waitFor(() => {
      expect(dataManagerMocks.deleteCharacter).toHaveBeenCalledWith('char-1')
    })
    await waitFor(() => {
      expect(screen.queryByText('貝瑞')).not.toBeInTheDocument()
    })
  })

  it('在確認框按取消不應刪除任何東西', async () => {
    renderPage()
    await openDeleteConfirm()
    fireEvent.click(await screen.findByText('取消'))

    expect(dataManagerMocks.deleteCharacter).not.toHaveBeenCalled()
    expect(screen.getByText('貝瑞')).toBeInTheDocument()
  })

  it('刪除失敗時角色必須留在列表上，不可樂觀移除', async () => {
    vi.spyOn(window, 'alert').mockImplementation(() => {})
    dataManagerMocks.deleteCharacter.mockRejectedValue(new Error('DB down'))

    renderPage()
    await openDeleteConfirm()
    fireEvent.click(await screen.findByText('確認刪除'))

    await waitFor(() => {
      expect(dataManagerMocks.deleteCharacter).toHaveBeenCalled()
    })
    // 用 h3 限定「角色卡片上的名字」：刪除失敗時確認框會留在畫面上，
    // 框內也有一份角色名，不限定選擇器會抓到兩個。
    expect(screen.getByText('貝瑞', { selector: 'h3' })).toBeInTheDocument()
  })
})

describe('CharacterSelectPage - 登出', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    dataManagerMocks.getUserCharacters.mockResolvedValue([makeCharacter()])
  })

  it('登出需要二次確認，確認後才登出並返回', async () => {
    const onBack = vi.fn()
    renderPage({ onBack })
    await screen.findByText('貝瑞')

    fireEvent.click(screen.getByText('登出'))
    expect(authMocks.signOut).not.toHaveBeenCalled()

    fireEvent.click(await screen.findByText('確定登出'))

    await waitFor(() => {
      expect(authMocks.signOut).toHaveBeenCalled()
      expect(onBack).toHaveBeenCalled()
    })
  })

  it('匿名模式不應出現登出鈕', async () => {
    renderPage({ userMode: 'anonymous' })
    await screen.findByText('貝瑞')

    expect(screen.queryByText('登出')).not.toBeInTheDocument()
  })
})
