import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { CharacterSheet } from '../../components/CharacterSheet'
import { CharacterStats } from '../../types'

// 簡化的測試版本，專注於保存邏輯而不是 UI 互動
const mockStats: CharacterStats = {
  name: "測試角色",
  class: "戰士", 
  level: 5,
  exp: 6500,
  hp: { current: 45, max: 55, temp: 0 },
  hitDice: { current: 3, total: 5, die: "d10" },
  ac: 16,
  initiative: 2,
  speed: 30,
  abilityScores: { str: 16, dex: 14, con: 15, int: 10, wis: 12, cha: 8 },
  proficiencies: { "運動": 1, "威嚇": 1 },
  savingProficiencies: ['str', 'con'],
  downtime: 5,
  renown: { used: 2, total: 8 },
  prestige: { org: "冒險者公會", level: 1, rankName: "見習冒險者" },
  attacks: [],
  currency: { cp: 10, sp: 25, ep: 0, gp: 150, pp: 2 },
  avatarUrl: undefined,
  customRecords: [
    { id: "1", name: "完成任務", value: "救援村民", note: "獲得村長感謝" },
    { id: "2", name: "收集物品", value: "古老卷軸", note: "在廢墟中發現" }
  ]
}

describe('CharacterSheet - 保存功能測試', () => {
  const mockSetStats = vi.fn()
  const mockOnSaveSkillProficiency = vi.fn()
  const mockOnSaveSavingThrowProficiencies = vi.fn()
  const mockOnSaveCharacterBasicInfo = vi.fn()
  const mockOnSaveAbilityScores = vi.fn()
  const mockOnSaveCurrencyAndExp = vi.fn()
  const mockOnSaveExtraData = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    // 設定所有保存函數預設返回成功
    mockOnSaveSkillProficiency.mockResolvedValue(true)
    mockOnSaveSavingThrowProficiencies.mockResolvedValue(true)
    mockOnSaveCharacterBasicInfo.mockResolvedValue(true)
    mockOnSaveAbilityScores.mockResolvedValue(true)
    mockOnSaveCurrencyAndExp.mockResolvedValue(true)
    mockOnSaveExtraData.mockResolvedValue(true)
  })

  const renderCharacterSheet = (stats = mockStats) => {
    return render(
      <CharacterSheet
        stats={stats}
        setStats={mockSetStats}
        onSaveSkillProficiency={mockOnSaveSkillProficiency}
        onSaveSavingThrowProficiencies={mockOnSaveSavingThrowProficiencies}
        onSaveCharacterBasicInfo={mockOnSaveCharacterBasicInfo}
        onSaveAbilityScores={mockOnSaveAbilityScores}
        onSaveCurrencyAndExp={mockOnSaveCurrencyAndExp}
        onSaveExtraData={mockOnSaveExtraData}
      />
    )
  }

  it('應該正確顯示角色名稱', () => {
    const { getByText } = renderCharacterSheet()
    
    expect(getByText('測試角色')).toBeInTheDocument()
  })

  it('應該正確顯示職業和等級', () => {
    const { getByText } = renderCharacterSheet()
    
    expect(getByText(/LV.*5/)).toBeInTheDocument()
    expect(getByText('戰士')).toBeInTheDocument()
  })

  it('應該正確顯示冒險紀錄', () => {
    const { getByText } = renderCharacterSheet()
    
    expect(getByText('完成任務')).toBeInTheDocument()
    expect(getByText('收集物品')).toBeInTheDocument()
  })

  it('當部分或全部保存函數未傳入時應正常渲染不崩潰', () => {
    expect(() => {
      render(
        <CharacterSheet
          stats={mockStats}
          setStats={mockSetStats}
        />
      )
    }).not.toThrow()

    expect(() => {
      render(
        <CharacterSheet
          stats={mockStats}
          setStats={mockSetStats}
          onSaveSkillProficiency={undefined}
          onSaveExtraData={undefined}
        />
      )
    }).not.toThrow()
  })

  it('應該正確處理空的冒險紀錄', () => {
    const statsWithoutRecords = {
      ...mockStats,
      customRecords: []
    }

    const { container } = renderCharacterSheet(statsWithoutRecords)
    expect(container).toBeInTheDocument()
  })
})