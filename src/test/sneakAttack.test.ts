// 遊蕩者偷襲傷害查表工具的單元測試（utils/sneakAttack.ts）
import { describe, it, expect } from 'vitest'
import { getRogueLevel, getSneakAttackDice, ROGUE_CLASS_NAME } from '../../utils/sneakAttack'
import type { CharacterStats } from '../../types'

describe('sneakAttack - 遊蕩者偷襲傷害查表', () => {
  describe('getSneakAttackDice', () => {
    it('0等（無遊蕩者職業）沒有偷襲傷害', () => {
      expect(getSneakAttackDice(0)).toBe(0)
    })

    it('依官方表格逐級查表（1等1d6，每2等+1d6）', () => {
      expect(getSneakAttackDice(1)).toBe(1)
      expect(getSneakAttackDice(2)).toBe(1)
      expect(getSneakAttackDice(3)).toBe(2)
      expect(getSneakAttackDice(4)).toBe(2)
      expect(getSneakAttackDice(5)).toBe(3)
      expect(getSneakAttackDice(9)).toBe(5)
      expect(getSneakAttackDice(19)).toBe(10)
      expect(getSneakAttackDice(20)).toBe(10)
    })

    it('超過20等時應限制在表格範圍內', () => {
      expect(getSneakAttackDice(25)).toBe(10)
    })

    it('負數等級應視為0', () => {
      expect(getSneakAttackDice(-1)).toBe(0)
    })
  })

  describe('getRogueLevel', () => {
    it('單職遊蕩者：直接回傳等級', () => {
      const stats = { class: ROGUE_CLASS_NAME, level: 5 } as unknown as CharacterStats
      expect(getRogueLevel(stats)).toBe(5)
    })

    it('非遊蕩者單職：回傳0', () => {
      const stats = { class: '戰士', level: 5 } as unknown as CharacterStats
      expect(getRogueLevel(stats)).toBe(0)
    })

    it('多職：只計算遊蕩者職業等級，不含其他職業', () => {
      const stats = {
        classes: [
          { name: ROGUE_CLASS_NAME, level: 4, hitDie: 'd8', isPrimary: true },
          { name: '戰士', level: 3, hitDie: 'd10', isPrimary: false },
        ],
      } as unknown as CharacterStats
      expect(getRogueLevel(stats)).toBe(4)
    })

    it('沒有職業資料時回傳0', () => {
      const stats = {} as unknown as CharacterStats
      expect(getRogueLevel(stats)).toBe(0)
    })
  })
})
