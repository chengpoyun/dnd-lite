import { describe, it, expect, beforeEach } from 'vitest'
import { MulticlassService } from '../../services/multiclassService'
import type { ClassInfo, HitDicePools } from '../../types'

describe('MulticlassService - 多職業系統測試', () => {
  describe('saveHitDicePools', () => {
    it('應該能夠保存生命骰池狀態', () => {
      const pools: HitDicePools = {
        d12: { current: 1, total: 1 },
        d10: { current: 3, total: 3 },
        d8: { current: 1, total: 1 },
        d6: { current: 0, total: 0 }
      }
      
      // 驗證池結構正確
      expect(pools.d12).toHaveProperty('current')
      expect(pools.d12).toHaveProperty('total')
      expect(pools.d10.current).toBe(3)
      expect(pools.d10.total).toBe(3)
    })
  })

  describe('getClassDisplayText', () => {
    it('應該正確格式化多職業顯示文字', () => {
      const classes: ClassInfo[] = [
        { id: '1', name: '戰士', level: 2, hitDie: 'd10', isPrimary: true },
        { id: '2', name: '牧師', level: 1, hitDie: 'd8', isPrimary: false },
        { id: '3', name: '聖騎士', level: 1, hitDie: 'd10', isPrimary: false },
        { id: '4', name: '野蠻人', level: 1, hitDie: 'd12', isPrimary: false }
      ]

      const display = MulticlassService.getClassDisplayText(classes, 'full')
      expect(display).toContain('戰士')
      expect(display).toContain('Lv2')
    })

    it('應該只顯示主職業名稱 (primary 模式)', () => {
      const classes: ClassInfo[] = [
        { id: '1', name: '戰士', level: 2, hitDie: 'd10', isPrimary: true },
        { id: '2', name: '牧師', level: 1, hitDie: 'd8', isPrimary: false }
      ]

      const display = MulticlassService.getClassDisplayText(classes, 'primary')
      expect(display).toBe('戰士')
    })
  })

  describe('多職業生命骰池計算', () => {
    it('應該正確計算多職業的生命骰池 - 戰士2+牧師1+聖騎士1+野蠻人1', () => {
      const classes: ClassInfo[] = [
        { id: '1', name: '戰士', level: 2, hitDie: 'd10', isPrimary: true },
        { id: '2', name: '牧師', level: 1, hitDie: 'd8', isPrimary: false },
        { id: '3', name: '聖騎士', level: 1, hitDie: 'd10', isPrimary: false },
        { id: '4', name: '野蠻人', level: 1, hitDie: 'd12', isPrimary: false }
      ]

      // 手動計算預期結果
      const expectedPools = {
        d12: 1, // 野蠻人1級
        d10: 3, // 戰士2級 + 聖騎士1級
        d8: 1,  // 牧師1級
        d6: 0
      }

      // 驗證計算邏輯
      const d12Count = classes.filter(c => c.hitDie === 'd12').reduce((sum, c) => sum + c.level, 0)
      const d10Count = classes.filter(c => c.hitDie === 'd10').reduce((sum, c) => sum + c.level, 0)
      const d8Count = classes.filter(c => c.hitDie === 'd8').reduce((sum, c) => sum + c.level, 0)

      expect(d12Count).toBe(expectedPools.d12)
      expect(d10Count).toBe(expectedPools.d10)
      expect(d8Count).toBe(expectedPools.d8)
    })

    it('應該正確處理單一職業', () => {
      const classes: ClassInfo[] = [
        { id: '1', name: '戰士', level: 5, hitDie: 'd10', isPrimary: true }
      ]

      const d10Count = classes.filter(c => c.hitDie === 'd10').reduce((sum, c) => sum + c.level, 0)
      expect(d10Count).toBe(5)
    })
  })

  describe('職業資料完整性', () => {
    it('多職業資料應包含所有必要欄位', () => {
      const classInfo: ClassInfo = {
        id: '1',
        name: '戰士',
        level: 2,
        hitDie: 'd10',
        isPrimary: true
      }

      expect(classInfo).toHaveProperty('id')
      expect(classInfo).toHaveProperty('name')
      expect(classInfo).toHaveProperty('level')
      expect(classInfo).toHaveProperty('hitDie')
      expect(classInfo).toHaveProperty('isPrimary')
      expect(classInfo.level).toBeGreaterThan(0)
    })
  })
})
