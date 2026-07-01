/**
 * CharacterSheet - 角色頭部職業/子職業顯示
 * 修正 bug：子職業名稱過長時，職業列缺少 min-w-0 導致 truncate 失效而爆版。
 * 改為：單一職業時子職業另起一行；多職業時每個職業各自一行，避免同一行塞入過多文字。
 */
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { CharacterSheet } from '../../components/CharacterSheet'
import { CharacterStats, ClassInfo } from '../../types'

const baseStats: CharacterStats = {
  name: '測試角色',
  class: '奇械師',
  level: 5,
  exp: 0,
  hp: { current: 30, max: 30, temp: 0 },
  hitDice: { current: 5, total: 5, die: 'd8' },
  ac: 15,
  initiative: 1,
  speed: 30,
  abilityScores: { str: 10, dex: 12, con: 14, int: 16, wis: 10, cha: 8 },
  proficiencies: {},
  savingProficiencies: [],
  downtime: 0,
  renown: { used: 0, total: 0 },
  prestige: { org: '', level: 0, rankName: '' },
  attacks: [],
  currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
  avatarUrl: undefined,
  customRecords: [],
}

const noopProps = {
  setStats: vi.fn(),
  onSaveSkillProficiency: vi.fn().mockResolvedValue(true),
  onSaveSavingThrowProficiencies: vi.fn().mockResolvedValue(true),
  onSaveCharacterBasicInfo: vi.fn().mockResolvedValue(true),
  onSaveAbilityScores: vi.fn().mockResolvedValue(true),
  onSaveCurrencyAndExp: vi.fn().mockResolvedValue(true),
  onSaveExtraData: vi.fn().mockResolvedValue(true),
}

describe('CharacterSheet - 角色頭部職業顯示', () => {
  it('單一職業有子職業時，子職業另起一行且該行仍可截斷（truncate + min-w-0）', () => {
    const classes: ClassInfo[] = [
      { name: '奇械師', level: 5, hitDie: 'd8', isPrimary: true, subclassName: '火砲師' },
    ]
    const { getByText } = render(
      <CharacterSheet stats={{ ...baseStats, classes }} {...noopProps} />
    )

    const levelLine = getByText(/LV.*5.*奇械師/)
    expect(levelLine).toBeInTheDocument()

    const subclassLine = getByText('（火砲師）')
    expect(subclassLine).toBeInTheDocument()
    expect(subclassLine.className).toContain('truncate')
    expect(subclassLine.className).toContain('min-w-0')
  })

  it('單一職業沒有子職業時，只顯示一行', () => {
    const classes: ClassInfo[] = [
      { name: '戰士', level: 5, hitDie: 'd10', isPrimary: true },
    ]
    const { getByText, queryByText } = render(
      <CharacterSheet stats={{ ...baseStats, classes }} {...noopProps} />
    )

    expect(getByText(/LV.*5.*戰士/)).toBeInTheDocument()
    expect(queryByText('（undefined）')).not.toBeInTheDocument()
  })

  it('多職業時，總等級單獨一行，每個職業各自一行且都可截斷', () => {
    const classes: ClassInfo[] = [
      { name: '法師', level: 3, hitDie: 'd6', isPrimary: false },
      { name: '戰士', level: 5, hitDie: 'd10', isPrimary: true, subclassName: '冠軍' },
    ]
    const { getByText } = render(
      <CharacterSheet stats={{ ...baseStats, level: 8, classes }} {...noopProps} />
    )

    const totalLevelLine = getByText('LV 8')
    expect(totalLevelLine).toBeInTheDocument()
    expect(totalLevelLine.className).toContain('truncate')
    expect(totalLevelLine.className).toContain('min-w-0')

    const warriorLine = getByText('戰士（冠軍） Lv5')
    expect(warriorLine.className).toContain('truncate')
    expect(warriorLine.className).toContain('min-w-0')

    expect(getByText('法師 Lv3')).toBeInTheDocument()
  })
})
