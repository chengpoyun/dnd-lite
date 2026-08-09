import { describe, it, expect } from 'vitest'
import { getErrorMessage, getRawErrorMessage } from '../../utils/common'

/**
 * 開啟 TypeScript strict 後 catch 到的變數型別是 unknown，
 * 原本散在各處的 `error.message` / `error?.message || error` 都不再合法。
 * 這支共用函式負責把任意 catch 到的東西轉成可讀訊息。
 */
describe('getErrorMessage', () => {
  it('Error 實例應取出 message', () => {
    expect(getErrorMessage(new Error('資料庫連線失敗'))).toBe('資料庫連線失敗')
  })

  it('Supabase 那種只有 message 欄位的物件也要能取出', () => {
    expect(getErrorMessage({ message: 'duplicate key value' })).toBe('duplicate key value')
  })

  it('直接丟字串時就回傳該字串', () => {
    expect(getErrorMessage('something went wrong')).toBe('something went wrong')
  })

  it('message 不是字串時不可直接回傳，要退回可讀表示', () => {
    expect(getErrorMessage({ message: 42 })).toBe('{"message":42}')
  })

  it('沒有 message 的物件應轉成 JSON，保留原本 log 的診斷價值', () => {
    expect(getErrorMessage({ code: 'PGRST116', details: null })).toBe(
      '{"code":"PGRST116","details":null}'
    )
  })

  it('null / undefined 應回傳預設文字而不是 "null"', () => {
    expect(getErrorMessage(null)).toBe('未知錯誤')
    expect(getErrorMessage(undefined)).toBe('未知錯誤')
  })

  it('可自訂預設文字', () => {
    expect(getErrorMessage(null, '載入失敗')).toBe('載入失敗')
  })

  it('無法轉成 JSON 的值（如循環參考）也不可拋出例外', () => {
    const circular: Record<string, unknown> = {}
    circular.self = circular

    expect(() => getErrorMessage(circular)).not.toThrow()
    expect(typeof getErrorMessage(circular)).toBe('string')
  })
})

/**
 * getRawErrorMessage 是給「拿訊息做決策」用的版本（例如判斷該不該重試）。
 * 跟 getErrorMessage 的關鍵差別：找不到真正的 message 時回空字串，
 * 不會退回 JSON——否則整個錯誤物件的內容都會被丟進 includes('503') 這類
 * 比對，可能讓不該重試的錯誤被誤判成該重試。
 */
describe('getRawErrorMessage', () => {
  it('Error 實例與 { message } 純物件都要能取出訊息', () => {
    expect(getRawErrorMessage(new Error('Failed to fetch'))).toBe('Failed to fetch')
    expect(getRawErrorMessage({ message: 'CORS blocked' })).toBe('CORS blocked')
  })

  it('直接丟字串時就回傳該字串', () => {
    expect(getRawErrorMessage('503 Service Unavailable')).toBe('503 Service Unavailable')
  })

  it('沒有 message 的物件一律回空字串，不可退回 JSON', () => {
    expect(getRawErrorMessage({ code: 'PGRST116', details: null })).toBe('')
    // 關鍵案例：物件內容含 503，但那不是錯誤訊息，不該讓重試判斷命中
    expect(getRawErrorMessage({ code: 503 })).toBe('')
    expect(getRawErrorMessage({ status: 'CORS' })).toBe('')
  })

  it('message 不是字串時也回空字串', () => {
    expect(getRawErrorMessage({ message: 502 })).toBe('')
  })

  it('null / undefined 回空字串', () => {
    expect(getRawErrorMessage(null)).toBe('')
    expect(getRawErrorMessage(undefined)).toBe('')
  })

  it('循環參考不可拋出例外', () => {
    const circular: Record<string, unknown> = {}
    circular.self = circular

    expect(() => getRawErrorMessage(circular)).not.toThrow()
    expect(getRawErrorMessage(circular)).toBe('')
  })
})
