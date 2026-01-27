import { supabase } from '../lib/supabase'

export interface UserSettings {
  id: string
  user_id: string
  last_character_id?: string | null
  supabase_test_completed?: boolean
  created_at: string
  updated_at: string
}

/**
 * 用戶設定服務 - 完全使用 Database 儲存用戶偏好設定
 * 取代原本的 localStorage 實作
 */
export class UserSettingsService {
  /**
   * 獲取用戶設定
   */
  static async getUserSettings(): Promise<UserSettings | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.warn('未找到已認證用戶')
        return null
      }

      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // 記錄不存在，創建預設設定
          return await this.createDefaultSettings(user.id)
        }
        console.error('獲取用戶設定失敗:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('getUserSettings 失敗:', error)
      return null
    }
  }

  /**
   * 更新用戶設定
   */
  static async updateUserSettings(updates: Partial<Pick<UserSettings, 'last_character_id' | 'supabase_test_completed'>>): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.warn('未找到已認證用戶，無法更新設定')
        return false
      }

      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          ...updates,
          updated_at: new Date().toISOString()
        })

      if (error) {
        console.error('更新用戶設定失敗:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('updateUserSettings 失敗:', error)
      return false
    }
  }

  /**
   * 設定最後使用的角色
   */
  static async setLastCharacterId(characterId: string | null): Promise<boolean> {
    return await this.updateUserSettings({ last_character_id: characterId })
  }

  /**
   * 獲取最後使用的角色ID
   */
  static async getLastCharacterId(): Promise<string | null> {
    try {
      console.log('🔍 正在獲取最後使用的角色ID...')
      
      // 添加超時機制
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('獲取用戶設定超時')), 5000)
      })
      
      const settingsPromise = this.getUserSettings()
      const settings = await Promise.race([settingsPromise, timeoutPromise])
      
      console.log('✅ 用戶設定載入完成:', settings?.last_character_id || 'null')
      return settings?.last_character_id || null
    } catch (error) {
      console.error('❌ 獲取最後角色ID失敗:', error)
      return null
    }
  }

  /**
   * 設定 Supabase 測試完成狀態
   */
  static async setSupabaseTestCompleted(completed: boolean): Promise<boolean> {
    return await this.updateUserSettings({ supabase_test_completed: completed })
  }

  /**
   * 檢查 Supabase 測試是否完成
   */
  static async isSupabaseTestCompleted(): Promise<boolean> {
    const settings = await this.getUserSettings()
    return settings?.supabase_test_completed || false
  }

  /**
   * 創建預設用戶設定
   */
  private static async createDefaultSettings(userId: string): Promise<UserSettings | null> {
    try {
      const defaultSettings = {
        user_id: userId,
        last_character_id: null,
        supabase_test_completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('user_settings')
        .insert(defaultSettings)
        .select()
        .single()

      if (error) {
        console.error('創建預設用戶設定失敗:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('createDefaultSettings 失敗:', error)
      return null
    }
  }

  /**
   * 清除用戶設定（登出時使用）
   */
  static async clearUserSettings(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return true // 沒有用戶，視為清除成功

      const { error } = await supabase
        .from('user_settings')
        .delete()
        .eq('user_id', user.id)

      if (error) {
        console.error('清除用戶設定失敗:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('clearUserSettings 失敗:', error)
      return false
    }
  }
}