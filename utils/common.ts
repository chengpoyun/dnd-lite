// 常用的工具函數

/**
 * 把 catch 到的東西轉成可讀訊息。
 *
 * strict 模式下 catch 變數是 unknown，不能直接寫 `error.message`；
 * 而 Supabase 丟回來的錯誤又常常只是 `{ message, code, details }` 這種
 * 純物件而非 Error 實例，所以兩種都要處理。找不到 message 時回傳 JSON，
 * 保留原本 `console.error('...', error)` 的診斷價值。
 */
export const getErrorMessage = (error: unknown, defaultValue = '未知錯誤'): string => {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (error === null || error === undefined) return defaultValue

  if (typeof error === 'object' && 'message' in error) {
    const { message } = error as { message: unknown }
    if (typeof message === 'string') return message
  }

  try {
    return JSON.stringify(error) ?? defaultValue
  } catch {
    return String(error)
  }
}

// 格式化日期
export const formatDate = (date: string | Date, locale = 'zh-TW'): string => {
  try {
    return new Date(date).toLocaleDateString(locale)
  } catch {
    return '未知日期'
  }
}

// 格式化日期時間
export const formatDateTime = (date: string | Date, locale = 'zh-TW'): string => {
  try {
    return new Date(date).toLocaleString(locale)
  } catch {
    return '未知時間'
  }
}

// 安全的字符串截取
export const truncateString = (str: string, maxLength: number): string => {
  if (!str) return ''
  return str.length > maxLength ? `${str.slice(0, maxLength)}...` : str
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

// 節流函數
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// 安全的數字轉換
export const safeNumber = (value: any, defaultValue = 0): number => {
  const num = Number(value)
  return isNaN(num) ? defaultValue : num
}

// 安全的字符串轉換
export const safeString = (value: any, defaultValue = ''): string => {
  return value?.toString() || defaultValue
}

// 生成隨機ID
export const generateId = (length = 8): string => {
  return Math.random().toString(36).substring(2, length + 2)
}

// 驗證郵箱格式
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// 首字母大寫
export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// 深度複製
export const deepClone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') return obj
  if (obj instanceof Date) return new Date(obj.getTime()) as T
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as T
  if (typeof obj === 'object') {
    const clonedObj = {} as T
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key])
      }
    }
    return clonedObj
  }
  return obj
}

// 等待指定時間
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// 安全的JSON解析
export const safeJsonParse = <T>(jsonString: string, defaultValue: T): T => {
  try {
    return JSON.parse(jsonString)
  } catch {
    return defaultValue
  }
}

// 檢查是否為空值
export const isEmpty = (value: any): boolean => {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}

// 移除對象中的空值
export const removeEmpty = (obj: Record<string, any>): Record<string, any> => {
  const result: Record<string, any> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (!isEmpty(value)) {
      result[key] = value
    }
  }
  return result
}

// 數組去重
export const unique = <T>(array: T[]): T[] => {
  return [...new Set(array)]
}

// 數組分組
export const groupBy = <T>(array: T[], key: keyof T): Record<string, T[]> => {
  return array.reduce((groups, item) => {
    const group = String(item[key])
    groups[group] = groups[group] || []
    groups[group].push(item)
    return groups
  }, {} as Record<string, T[]>)
}