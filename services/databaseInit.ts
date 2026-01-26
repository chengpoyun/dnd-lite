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
      // 檢查新的資料庫結構
      const { error } = await supabase
        .from('characters')
        .select('id, name, character_class, level, avatar_url')
        .limit(0)
      
      if (error) {
        console.error('Characters 表不存在或結構不正確:', error)
        throw error
      }
      
      console.log('Characters 表結構正確')
    } catch (error) {
      console.error('無法存取 characters 表:', error)
      throw error
    }
  }
}