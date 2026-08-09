import { describe, it, expect } from 'vitest'
import {
  mapCategoryToDb,
  mapCategoryFromDb,
  mapRecoveryToDb,
  mapRecoveryFromDb,
  convertDbItemToLocal,
} from '../../utils/combatItemMapping'
import type { CharacterCombatAction as DatabaseCombatItem } from '../../lib/supabase'

/**
 * 這幾支對照表原本寫在 CombatView.tsx 內部（無法單獨測），
 * 拆到 utils 後補上測試。前端與 DB 的字彙不同（bonus vs bonus_action、
 * round vs turn），對錯了就會存錯分類或恢復時機。
 */
describe('戰鬥項目分類對照', () => {
  it('前端分類轉 DB', () => {
    expect(mapCategoryToDb('action')).toBe('action')
    expect(mapCategoryToDb('bonus')).toBe('bonus_action')
    expect(mapCategoryToDb('reaction')).toBe('reaction')
    expect(mapCategoryToDb('resource')).toBe('resource')
  })

  it('DB 分類轉前端', () => {
    expect(mapCategoryFromDb('action')).toBe('action')
    expect(mapCategoryFromDb('bonus_action')).toBe('bonus')
    expect(mapCategoryFromDb('reaction')).toBe('reaction')
    expect(mapCategoryFromDb('resource')).toBe('resource')
  })

  it('未知的 DB 分類退回 resource', () => {
    expect(mapCategoryFromDb('something_new')).toBe('resource')
    expect(mapCategoryFromDb('')).toBe('resource')
  })

  it('分類來回轉換應保持一致', () => {
    for (const category of ['action', 'bonus', 'reaction', 'resource'] as const) {
      expect(mapCategoryFromDb(mapCategoryToDb(category))).toBe(category)
    }
  })
})

describe('恢復時機對照', () => {
  it('前端恢復時機轉 DB', () => {
    expect(mapRecoveryToDb('round')).toBe('turn')
    expect(mapRecoveryToDb('short')).toBe('short_rest')
    expect(mapRecoveryToDb('long')).toBe('long_rest')
  })

  it('DB 恢復時機轉前端', () => {
    expect(mapRecoveryFromDb('turn')).toBe('round')
    expect(mapRecoveryFromDb('short_rest')).toBe('short')
    expect(mapRecoveryFromDb('long_rest')).toBe('long')
  })

  it('manual（手動管理）視為長休', () => {
    expect(mapRecoveryFromDb('manual')).toBe('long')
  })

  it('未知的恢復時機退回 long', () => {
    expect(mapRecoveryFromDb('weird')).toBe('long')
  })

  it('恢復時機來回轉換應保持一致', () => {
    for (const recovery of ['round', 'short', 'long'] as const) {
      expect(mapRecoveryFromDb(mapRecoveryToDb(recovery))).toBe(recovery)
    }
  })
})

describe('convertDbItemToLocal', () => {
  const baseDbItem: DatabaseCombatItem = {
    id: 'db-row-1',
    character_id: 'char-1',
    category: 'bonus_action',
    name: '副手攻擊',
    icon: '🗡️',
    max_uses: 1,
    current_uses: 1,
    recovery_type: 'turn',
    is_default: false,
    is_custom: true,
    created_at: '2026-01-01T00:00:00.000Z',
  }

  it('沒有 default_item_id 時，id 用資料列本身的 id', () => {
    const local = convertDbItemToLocal(baseDbItem)

    expect(local.id).toBe('db-row-1')
    expect(local.item_id).toBe('db-row-1')
    expect(local.is_default).toBe(false)
  })

  it('有 default_item_id 時 id 改用它，且一律視為預設項目', () => {
    const local = convertDbItemToLocal({ ...baseDbItem, default_item_id: 'tpl-attack' })

    expect(local.id).toBe('tpl-attack')
    // item_id 仍保留資料列 id，寫回 DB 時要用它
    expect(local.item_id).toBe('db-row-1')
    expect(local.is_default).toBe(true)
  })

  it('is_default 為 true 時即使沒有 default_item_id 也是預設項目', () => {
    const local = convertDbItemToLocal({ ...baseDbItem, is_default: true })

    expect(local.is_default).toBe(true)
  })

  it('分類與恢復時機應轉成前端字彙', () => {
    const local = convertDbItemToLocal(baseDbItem)

    expect(local.category).toBe('bonus')
    expect(local.recovery).toBe('round')
  })

  it('max_uses_basic 為 null 時應轉成 undefined（0 要保留）', () => {
    expect(convertDbItemToLocal({ ...baseDbItem, max_uses_basic: null }).maxUsesBasic).toBeUndefined()
    expect(convertDbItemToLocal({ ...baseDbItem, max_uses_basic: 0 }).maxUsesBasic).toBe(0)
    expect(convertDbItemToLocal({ ...baseDbItem, max_uses_basic: 4 }).maxUsesBasic).toBe(4)
  })

  it('次數與名稱等欄位應原樣帶過來', () => {
    const local = convertDbItemToLocal({ ...baseDbItem, current_uses: 2, max_uses: 5 })

    expect(local.name).toBe('副手攻擊')
    expect(local.icon).toBe('🗡️')
    expect(local.current).toBe(2)
    expect(local.max).toBe(5)
    expect(local.character_id).toBe('char-1')
  })
})
