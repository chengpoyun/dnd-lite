// 職業系統工具函數的單元測試
// 測試 utils/classUtils.ts 中的所有函數

import { describe, it, expect } from 'vitest'
import {
  getAvailableClasses,
  getClassHitDie,
  getPrimaryClass,
  getTotalLevel,
  formatClassDisplay,
  calculateHitDiceTotals,
  isValidClassName,
  getClassInfo,
  recoverHitDiceOnLongRest,
  useHitDie,
  formatHitDicePools,
  getTotalCurrentHitDice,
  getTotalMaxHitDice
} from '../../utils/classUtils'
import type { ClassInfo, HitDicePools } from '../../types'

describe('classUtils - D&D 5E 職業工具函數', () => {
  
  describe('getAvailableClasses', () => {
    it('應該返回所有可用的 D&D 職業', () => {
      const classes = getAvailableClasses()
      expect(classes).toContain('戰士')
      expect(classes).toContain('法師')
      expect(classes).toContain('野蠻人')
      expect(classes.length).toBeGreaterThan(10)
    })
  })

  describe('getClassHitDie', () => {
    it('應該為每個職業返回正確的生命骰', () => {
      expect(getClassHitDie('野蠻人')).toBe('d12')
      expect(getClassHitDie('戰士')).toBe('d10')
      expect(getClassHitDie('聖騎士')).toBe('d10')
      expect(getClassHitDie('法師')).toBe('d6')
      expect(getClassHitDie('盜賊')).toBe('d8')
    })
    
    it('無效職業應該返回預設 d8', () => {
      expect(getClassHitDie('無效職業')).toBe('d8')
      expect(getClassHitDie('')).toBe('d8')
    })
  })

  describe('getPrimaryClass', () => {
    it('應該返回等級最高的職業', () => {
      const classes: ClassInfo[] = [
        { name: '法師', level: 3, hitDie: 'd6', isPrimary: false },
        { name: '戰士', level: 5, hitDie: 'd10', isPrimary: true }
      ]
      
      const primary = getPrimaryClass(classes)
      expect(primary?.name).toBe('戰士')
      expect(primary?.level).toBe(5)
    })
    
    it('等級相同時應該返回第一個', () => {
      const classes: ClassInfo[] = [
        { name: '戰士', level: 3, hitDie: 'd10', isPrimary: true },
        { name: '法師', level: 3, hitDie: 'd6', isPrimary: false }
      ]
      
      const primary = getPrimaryClass(classes)
      expect(primary?.name).toBe('戰士')
    })
    
    it('空陣列應該返回 null', () => {
      expect(getPrimaryClass([])).toBeNull()
    })
  })

  describe('getTotalLevel', () => {
    it('應該正確計算總等級', () => {
      const classes: ClassInfo[] = [
        { name: '戰士', level: 5, hitDie: 'd10', isPrimary: true },
        { name: '法師', level: 3, hitDie: 'd6', isPrimary: false }
      ]
      
      expect(getTotalLevel(classes)).toBe(8)
    })
    
    it('單職業應該返回該職業等級', () => {
      const classes: ClassInfo[] = [
        { name: '戰士', level: 7, hitDie: 'd10', isPrimary: true }
      ]
      
      expect(getTotalLevel(classes)).toBe(7)
    })
    
    it('空陣列應該返回 0', () => {
      expect(getTotalLevel([])).toBe(0)
    })
  })

  describe('formatClassDisplay', () => {
    const classes: ClassInfo[] = [
      { name: '戰士', level: 5, hitDie: 'd10', isPrimary: true },
      { name: '法師', level: 3, hitDie: 'd6', isPrimary: false }
    ]
    
    it('full 格式應該顯示完整資訊', () => {
      expect(formatClassDisplay(classes, 'full')).toBe('戰士 Lv5 / 法師 Lv3')
    })
    
    it('primary 格式應該只顯示主職業', () => {
      expect(formatClassDisplay(classes, 'primary')).toBe('戰士')
    })
    
    it('simple 格式應該不顯示等級', () => {
      expect(formatClassDisplay(classes, 'simple')).toBe('戰士/法師')
    })
    
    it('空陣列應該返回無職業', () => {
      expect(formatClassDisplay([], 'full')).toBe('無職業')
      expect(formatClassDisplay([], 'primary')).toBe('無職業')
    })
  })

  describe('calculateHitDiceTotals', () => {
    it('應該正確計算各類型生命骰總數', () => {
      const classes: ClassInfo[] = [
        { name: '戰士', level: 5, hitDie: 'd10', isPrimary: true },
        { name: '法師', level: 3, hitDie: 'd6', isPrimary: false }
      ]
      
      const pools = calculateHitDiceTotals(classes)
      
      expect(pools.d10.total).toBe(5)
      expect(pools.d10.current).toBe(5)
      expect(pools.d6.total).toBe(3)
      expect(pools.d6.current).toBe(3)
      expect(pools.d12.total).toBe(0)
      expect(pools.d8.total).toBe(0)
    })
    
    it('相同類型生命骰應該累加', () => {
      const classes: ClassInfo[] = [
        { name: '盜賊', level: 4, hitDie: 'd8', isPrimary: true },
        { name: '遊俠', level: 2, hitDie: 'd8', isPrimary: false }
      ]
      
      const pools = calculateHitDiceTotals(classes)
      expect(pools.d8.total).toBe(6) // 4 + 2
      expect(pools.d8.current).toBe(6)
    })
  })

  describe('isValidClassName', () => {
    it('有效職業名稱應該返回 true', () => {
      expect(isValidClassName('戰士')).toBe(true)
      expect(isValidClassName('法師')).toBe(true)
      expect(isValidClassName('野蠻人')).toBe(true)
    })
    
    it('無效職業名稱應該返回 false', () => {
      expect(isValidClassName('無效職業')).toBe(false)
      expect(isValidClassName('')).toBe(false)
      expect(isValidClassName('123')).toBe(false)
    })
  })

  describe('getClassInfo', () => {
    it('有效職業應該返回正確資訊', () => {
      const info = getClassInfo('戰士')
      expect(info.name).toBe('戰士')
      expect(info.hitDie).toBe('d10')
      expect(info.isValid).toBe(true)
    })
    
    it('無效職業應該返回預設資訊', () => {
      const info = getClassInfo('無效職業')
      expect(info.name).toBe('無效職業')
      expect(info.hitDie).toBe('d8')
      expect(info.isValid).toBe(false)
    })
  })

  describe('recoverHitDiceOnLongRest', () => {
    it('應該恢復一半生命骰（向上取整）', () => {
      const pools: HitDicePools = {
        d12: { current: 0, total: 5 },
        d10: { current: 1, total: 4 },
        d8: { current: 0, total: 3 },
        d6: { current: 2, total: 7 }
      }
      
      const recovered = recoverHitDiceOnLongRest(pools)
      
      expect(recovered.d12.current).toBe(3) // 0 + ceil(5/2) = 3
      expect(recovered.d10.current).toBe(3) // 1 + ceil(4/2) = 3  
      expect(recovered.d8.current).toBe(2) // 0 + ceil(3/2) = 2
      expect(recovered.d6.current).toBe(6) // 2 + ceil(7/2) = 6
    })
    
    it('不應該超過最大值', () => {
      const pools: HitDicePools = {
        d10: { current: 3, total: 4 },
        d8: { current: 0, total: 0 },
        d6: { current: 0, total: 0 },
        d12: { current: 0, total: 0 }
      }
      
      const recovered = recoverHitDiceOnLongRest(pools)
      expect(recovered.d10.current).toBe(4) // 不超過 total
    })
  })

  describe('useHitDie', () => {
    it('應該正確消耗生命骰', () => {
      const pools: HitDicePools = {
        d10: { current: 3, total: 5 },
        d8: { current: 0, total: 0 },
        d6: { current: 0, total: 0 },
        d12: { current: 0, total: 0 }
      }
      
      const result = useHitDie(pools, 'd10', 1)
      expect(result.d10.current).toBe(2)
      expect(result.d10.total).toBe(5) // total 不變
    })
    
    it('消耗多個生命骰', () => {
      const pools: HitDicePools = {
        d8: { current: 4, total: 6 },
        d10: { current: 0, total: 0 },
        d6: { current: 0, total: 0 },
        d12: { current: 0, total: 0 }
      }
      
      const result = useHitDie(pools, 'd8', 2)
      expect(result.d8.current).toBe(2)
    })
    
    it('沒有足夠生命骰時應該拋出錯誤', () => {
      const pools: HitDicePools = {
        d6: { current: 1, total: 3 },
        d10: { current: 0, total: 0 },
        d8: { current: 0, total: 0 },
        d12: { current: 0, total: 0 }
      }
      
      expect(() => useHitDie(pools, 'd6', 2)).toThrow('沒有足夠的d6生命骰')
    })
  })

  describe('formatHitDicePools', () => {
    const samplePools: HitDicePools = {
      d12: { current: 2, total: 3 },
      d10: { current: 0, total: 5 },
      d8: { current: 4, total: 4 },
      d6: { current: 1, total: 2 }
    }

    it('狀態格式應該顯示當前/總數', () => {
      expect(formatHitDicePools(samplePools, 'status')).toBe('2/3d12 + 0/5d10 + 4/4d8 + 1/2d6')
    })

    it('當前格式應該只顯示有的生命骰', () => {
      expect(formatHitDicePools(samplePools, 'current')).toBe('2d12 + 4d8 + 1d6')
    })

    it('總數格式應該顯示所有類型的總數', () => {
      expect(formatHitDicePools(samplePools, 'total')).toBe('3d12 + 5d10 + 4d8 + 2d6')
    })

    it('空的生命骰池應該返回無生命骰', () => {
      const emptyPools: HitDicePools = {
        d12: { current: 0, total: 0 },
        d10: { current: 0, total: 0 },
        d8: { current: 0, total: 0 },
        d6: { current: 0, total: 0 }
      }
      
      expect(formatHitDicePools(emptyPools, 'status')).toBe('無生命骰')
      expect(formatHitDicePools(emptyPools, 'current')).toBe('無生命骰')
      expect(formatHitDicePools(emptyPools, 'total')).toBe('無生命骰')
    })

    it('只有一種类型的生命骰', () => {
      const singlePools: HitDicePools = {
        d12: { current: 0, total: 0 },
        d10: { current: 3, total: 5 },
        d8: { current: 0, total: 0 },
        d6: { current: 0, total: 0 }
      }
      
      expect(formatHitDicePools(singlePools, 'status')).toBe('3/5d10')
    })
  })

  describe('getTotalCurrentHitDice', () => {
    it('應該正確計算當前生命骰總數', () => {
      const pools: HitDicePools = {
        d12: { current: 2, total: 3 },
        d10: { current: 0, total: 5 },
        d8: { current: 4, total: 4 },
        d6: { current: 1, total: 2 }
      }
      
      expect(getTotalCurrentHitDice(pools)).toBe(7) // 2 + 0 + 4 + 1
    })

    it('空的生命骰池應該返回 0', () => {
      const emptyPools: HitDicePools = {
        d12: { current: 0, total: 0 },
        d10: { current: 0, total: 0 },
        d8: { current: 0, total: 0 },
        d6: { current: 0, total: 0 }
      }
      
      expect(getTotalCurrentHitDice(emptyPools)).toBe(0)
    })
  })

  describe('getTotalMaxHitDice', () => {
    it('應該正確計算總生命骰数量', () => {
      const pools: HitDicePools = {
        d12: { current: 2, total: 3 },
        d10: { current: 0, total: 5 },
        d8: { current: 4, total: 4 },
        d6: { current: 1, total: 2 }
      }
      
      expect(getTotalMaxHitDice(pools)).toBe(14) // 3 + 5 + 4 + 2
    })

    it('空的生命骰池應該返回 0', () => {
      const emptyPools: HitDicePools = {
        d12: { current: 0, total: 0 },
        d10: { current: 0, total: 0 },
        d8: { current: 0, total: 0 },
        d6: { current: 0, total: 0 }
      }
      
      expect(getTotalMaxHitDice(emptyPools)).toBe(0)
    })
  })
})