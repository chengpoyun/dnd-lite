// 法術位（全施法者職業資源）計算的單元測試
import { describe, it, expect } from 'vitest'
import {
  calculateCasterLevelForSpellSlots,
  getSpellSlotsForCasterLevel,
} from '../../utils/spellSlots'
import type { ClassInfo } from '../../types'

const classInfo = (name: string, level: number, subclassName?: string): ClassInfo => ({
  name,
  level,
  hitDie: 'd6',
  isPrimary: true,
  subclassName,
})

describe('getSpellSlotsForCasterLevel - 官方全施法者法術位表', () => {
  it.each([
    [0, [0, 0, 0, 0, 0, 0, 0, 0, 0]],
    [1, [2, 0, 0, 0, 0, 0, 0, 0, 0]],
    [2, [3, 0, 0, 0, 0, 0, 0, 0, 0]],
    [3, [4, 2, 0, 0, 0, 0, 0, 0, 0]],
    [5, [4, 3, 2, 0, 0, 0, 0, 0, 0]],
    [6, [4, 3, 3, 0, 0, 0, 0, 0, 0]],
    [9, [4, 3, 3, 3, 1, 0, 0, 0, 0]],
    [11, [4, 3, 3, 3, 3, 1, 0, 0, 0]],
    [13, [4, 3, 3, 3, 3, 1, 1, 0, 0]],
    [17, [4, 3, 3, 3, 3, 1, 1, 1, 1]],
    [19, [4, 3, 3, 3, 3, 2, 1, 1, 1]],
    [20, [4, 3, 3, 3, 3, 2, 2, 1, 1]],
  ])('等級 %i 對應 %j', (level, expected) => {
    expect(getSpellSlotsForCasterLevel(level)).toEqual(expected)
  })

  it('超過 20 級時應鉗制在 20 級的表現值', () => {
    expect(getSpellSlotsForCasterLevel(25)).toEqual(getSpellSlotsForCasterLevel(20))
  })

  it('負數等級應鉗制為 0', () => {
    expect(getSpellSlotsForCasterLevel(-3)).toEqual(getSpellSlotsForCasterLevel(0))
  })
})

describe('calculateCasterLevelForSpellSlots - 施法者等級合併規則', () => {
  it('單一全施法者職業直接採用該等級', () => {
    expect(calculateCasterLevelForSpellSlots([classInfo('法師', 5)])).toBe(5)
  })

  it('多個全施法者職業直接加總', () => {
    expect(calculateCasterLevelForSpellSlots([classInfo('法師', 3), classInfo('牧師', 2)])).toBe(5)
  })

  it('半施法者（聖騎士/遊俠）等級加總後除以2無條件捨去', () => {
    expect(calculateCasterLevelForSpellSlots([classInfo('聖騎士', 3)])).toBe(1) // floor(3/2)
    expect(calculateCasterLevelForSpellSlots([classInfo('聖騎士', 1), classInfo('遊俠', 1)])).toBe(1) // floor(2/2)
  })

  it('奇械師等級除以2無條件進位', () => {
    expect(calculateCasterLevelForSpellSlots([classInfo('奇械師', 1)])).toBe(1) // ceil(1/2)
    expect(calculateCasterLevelForSpellSlots([classInfo('奇械師', 4)])).toBe(2) // ceil(4/2)
  })

  it('1/3施法者需符合對應子職業才計入，等級加總後除以3無條件捨去', () => {
    expect(calculateCasterLevelForSpellSlots([classInfo('戰士', 6, '奧術騎士')])).toBe(2) // floor(6/3)
    expect(calculateCasterLevelForSpellSlots([classInfo('戰士', 6, '冠軍')])).toBe(0) // 非神秘騎士子職業，不計入
    expect(calculateCasterLevelForSpellSlots([classInfo('遊蕩者', 3, '奧術詭術師')])).toBe(1)
  })

  it('混合多職業時各類別分別計算後加總', () => {
    // 法師3 + 聖騎士2 + 戰士(奧術騎士)3 => 3 + floor(2/2) + floor(3/3) = 3+1+1=5
    const classes = [
      classInfo('法師', 3),
      classInfo('聖騎士', 2),
      classInfo('戰士', 3, '奧術騎士'),
    ]
    expect(calculateCasterLevelForSpellSlots(classes)).toBe(5)
  })

  it('非施法職業不計入', () => {
    expect(calculateCasterLevelForSpellSlots([classInfo('野蠻人', 10)])).toBe(0)
  })

  it('沒有職業資料時回傳0', () => {
    expect(calculateCasterLevelForSpellSlots([])).toBe(0)
  })

  it('總施法者等級鉗制在20', () => {
    expect(calculateCasterLevelForSpellSlots([classInfo('法師', 20), classInfo('牧師', 5)])).toBe(20)
  })
})
