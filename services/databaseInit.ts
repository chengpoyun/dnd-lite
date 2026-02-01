import { supabase } from '../lib/supabase'

/**
 * 確保資料庫表結構正確的初始化服務
 */
export class DatabaseInitService {
  private static isInitialized: boolean = false // 添加初始化標記
  
  /**
   * 初始化資料庫表結構
   */
  static async initializeTables(): Promise<boolean> {
    try {
      // 如果已經初始化過，直接返回成功
      if (this.isInitialized) {
        return true
      }

      // 使用重試機制檢查資料庫表結構
      const maxRetries = 3 // 增加到3次重試
      let lastError: any = null
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          if (attempt > 1) {
            console.log(`🔄 資料庫初始化重試第 ${attempt} 次...`)
            // 冷啟動可能需要更長時間，逐漸增加等待時間
            const waitTime = attempt === 2 ? 2000 : 3000
            await new Promise(resolve => setTimeout(resolve, waitTime))
          }
          
          await this.ensureCharactersTable()
          this.isInitialized = true
          return true
          
        } catch (error) {
          lastError = error
          const errorMessage = error?.message || ''
          // 檢測值得重試的錯誤（網路問題、伺服器錯誤、冷啟動）
          if (attempt < maxRetries && (
            errorMessage.includes('CORS') || 
            errorMessage.includes('520') || 
            errorMessage.includes('502') || 
            errorMessage.includes('503') ||
            errorMessage.includes('Failed to fetch') ||
            errorMessage.includes('連接超時') ||
            errorMessage.includes('timeout')
          )) {
            console.warn(`⚠️ 資料庫初始化失敗，將重試: ${errorMessage}`)
            continue
          }
        }
      }
      
      console.error('❌ 資料庫初始化失敗（已重試）:', lastError)
      return false
      
    } catch (error) {
      console.error('資料庫初始化失敗:', error)
      return false
    }
  }
  
  /**
   * 確保 characters 表存在並有正確結構
   */
  private static async ensureCharactersTable(): Promise<void> {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('資料庫連接超時')), 15000) // 增加到15秒
      })
      
      const checkPromise = supabase
        .from('characters')
        .select('id')
        .limit(1)
      
      const { error } = await Promise.race([checkPromise, timeoutPromise])
      
      if (error && error.message !== 'No rows found') {
        console.error('Characters 表檢查失敗:', error.message)
        throw error
      }
    } catch (error) {
      console.error('無法存取 characters 表:', error?.message || error)
      throw error
    }
  }
}