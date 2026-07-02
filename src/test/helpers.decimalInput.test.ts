// 經驗值/修整期/名聲/金幣 支援小數與負數的驗證邏輯測試
import { describe, it, expect } from 'vitest'
import { evaluateDecimalValue, handleDecimalInput, formatDecimal } from '../../utils/helpers'

describe('evaluateDecimalValue - allowNegative 與不限小數位數', () => {
  it('預設（allowNegative=false）負數結果仍會被夾在 0', () => {
    expect(evaluateDecimalValue('-50', 10)).toBe(0)
  })

  it('allowNegative=true 時，負數結果應保留', () => {
    expect(evaluateDecimalValue('-50', 10, undefined, undefined, true)).toBe(-40)
  })

  it('未指定 decimalPlaces 時不四捨五入，保留完整小數', () => {
    expect(evaluateDecimalValue('+0.123456', 10, undefined, undefined, true)).toBeCloseTo(10.123456, 6)
  })

  it('指定 decimalPlaces 時仍會四捨五入到指定位數', () => {
    expect(evaluateDecimalValue('+0.126', 10, undefined, 2, true)).toBe(10.13)
  })

  it('allowNegative=true 搭配 max 仍會限制上限', () => {
    expect(evaluateDecimalValue('+100', 10, 50, undefined, true)).toBe(50)
  })
})

describe('handleDecimalInput - allowNegative 與不限小數位數', () => {
  it('allowNegative=true 且 minValue=-Infinity 時，負數輸入應為合法值', () => {
    const result = handleDecimalInput('-123.5', 0, { minValue: -Infinity, allowZero: true, allowNegative: true })
    expect(result.isValid).toBe(true)
    expect(result.numericValue).toBe(-123.5)
  })

  it('未設定 allowNegative 時，負數運算結果仍會被夾在 0（維持既有行為，不受本次修改影響）', () => {
    const result = handleDecimalInput('-123.5', 0, { minValue: 0, allowZero: true })
    expect(result.isValid).toBe(true)
    expect(result.numericValue).toBe(0)
  })

  it('未指定 decimalPlaces 時，直接輸入應保留完整小數位數', () => {
    const result = handleDecimalInput('3.14159', 0, { minValue: -Infinity, allowZero: true, allowNegative: true })
    expect(result.isValid).toBe(true)
    expect(result.numericValue).toBe(3.14159)
  })

  it('"+/-" 快速加減運算式搭配 allowNegative 時，可計算出負數結果（目前值100，扣500）', () => {
    const result = handleDecimalInput('-500', 100, { minValue: -Infinity, allowZero: true, allowNegative: true })
    expect(result.isValid).toBe(true)
    expect(result.numericValue).toBe(-400)
  })
})

describe('formatDecimal - 預設不應過度截斷小數', () => {
  it('預設應顯示超過 2 位的小數（不強制只留 2 位）', () => {
    expect(formatDecimal(3.14159)).toBe('3.14159')
  })

  it('整數不顯示多餘小數', () => {
    expect(formatDecimal(150)).toBe('150')
  })

  it('尾隨零應被移除', () => {
    expect(formatDecimal(150.1)).toBe('150.1')
  })
})
