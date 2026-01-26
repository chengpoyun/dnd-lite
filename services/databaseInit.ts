import { supabase } from '../lib/supabase'

/**
 * 確保資料庫表結構正確的初始化服務
 */
export class DatabaseInitService {
  
  /**
   * 初始化資料庫表結構
   */
  static async initializeTables(): Promise<boolean> {
    try {
      console.log('開始檢查資料庫表結構...')
      
      // 檢查 characters 表是否存在並有正確的欄位
      await this.ensureCharactersTable()
      
      console.log('資料庫表結構檢查完成')
      return true
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
      // 嘗試查詢表結構（包括 avatar_url 欄位）
      const { error } = await supabase
        .from('characters')
        .select('id, name, character_class, level, avatar_url')
        .limit(0)
      
      if (error) {
        console.log('Characters 表可能不存在或結構不正確，嘗試創建...')
        throw error
      }
      
      console.log('Characters 表結構正確')
    } catch (error) {
      console.log('嘗試使用舊的表結構...')
      
      try {
        // 嘗試舊的欄位名稱
        const { error: oldError } = await supabase
          .from('characters')
          .select('id, name, class, level')
          .limit(0)
        
        if (oldError) {
          throw oldError
        }
        
        console.log('檢測到舊的表結構，使用 class 欄位')
        // 這裡我們可以記錄使用舊結構的標記
        localStorage.setItem('dnd_use_old_schema', 'true')
      } catch (finalError) {
        console.error('無法存取 characters 表:', finalError)
        throw finalError
      }
    }
  }
  
  /**
   * 檢查是否使用舊的表結構
   */
  static usesOldSchema(): boolean {
    return localStorage.getItem('dnd_use_old_schema') === 'true'
  }
  
  /**
   * 清除舊結構標記
   */
  static clearOldSchemaFlag(): void {
    localStorage.removeItem('dnd_use_old_schema')
  }
}