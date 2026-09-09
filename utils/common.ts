// 常用的工具函數

/**
 * 只取「真正的錯誤訊息」，取不到就回空字串。
 *
 * 給**拿訊息做決策**的場景用（例如判斷該不該重試：`msg.includes('503')`）。
 * 刻意不做 JSON fallback——否則整個錯誤物件的內容都會被丟進比對，
 * 像 `{ code: 503 }` 這種「數字剛好長得像 HTTP 狀態碼」的東西會被誤判成
 * 值得重試的網路錯誤。要印給人看請改用 [getErrorMessage]。
 */
export const getRawErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const { message } = error as { message: unknown }
    if (typeof message === 'string') return message
  }

  return ''
}

/**
 * 把 catch 到的東西轉成可讀訊息。
 *
 * strict 模式下 catch 變數是 unknown，不能直接寫 `error.message`；
 * 而 Supabase 丟回來的錯誤又常常只是 `{ message, code, details }` 這種
 * 純物件而非 Error 實例，所以兩種都要處理。找不到 message 時回傳 JSON，
 * 保留原本 `console.error('...', error)` 的診斷價值。
 *
 * message 為**空字串**時同樣視為「沒有訊息」而退回 JSON：空訊息顯示給
 * 使用者等於什麼都沒說，不如把 code 之類的線索留下來。
 *
 * **只適合用來顯示或寫 log。** 若要拿訊息做判斷（例如比對是否為可重試的
 * 網路錯誤），請改用 [getRawErrorMessage]，避免 JSON fallback 造成誤判。
 */
export const getErrorMessage = (error: unknown, defaultValue = '未知錯誤'): string => {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (error === null || error === undefined) return defaultValue

  const message = getRawErrorMessage(error)
  if (message) return message

  try {
    return JSON.stringify(error) ?? defaultValue
  } catch {
    return String(error)
  }
}

/**
 * 判斷錯誤訊息是否為「值得重試」的網路/伺服器錯誤（CORS、520/502/503、逾時、Failed to fetch）。
 * 供帶重試邏輯的服務呼叫共用（處理 Supabase 冷啟動問題），避免各處各自重寫一次同樣的字串比對。
 * 訊息請用 [getRawErrorMessage] 取得（不可用會退回 JSON 的 [getErrorMessage]，
 * 否則「數字剛好長得像狀態碼」的錯誤物件會被誤判成值得重試）。
 */
export const isRetryableNetworkError = (message: string): boolean => {
  return (
    message.includes('CORS') ||
    message.includes('520') ||
    message.includes('502') ||
    message.includes('503') ||
    message.includes('Failed to fetch') ||
    message.includes('timeout') ||
    message.includes('連接超時')
  )
}

// 格式化日期
export const formatDate = (date: string | Date, locale = 'zh-TW'): string => {
  try {
    return new Date(date).toLocaleDateString(locale)
  } catch {
    return '未知日期'
  }
}

/**
 * 搜尋比對：query 為空（含只有空白）時一律視為符合，不做篩選；
 * 否則只要任一欄位（忽略 undefined/null/空字串）包含 query 即符合，大小寫不分。
 * 供筆記／道具／能力頁的搜尋欄共用。
 */
export const matchesSearch = (query: string, ...fields: (string | undefined | null)[]): boolean => {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return fields.some((field) => !!field && field.toLowerCase().includes(q))
}

// 防抖函數
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// 等待指定時間
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms))
}
