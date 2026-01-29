import { supabase } from '../lib/supabase'

export interface UserSettings {
  id: string
  user_id: string
  last_character_id?: string | null
  supabase_test_completed?: boolean
  active_session_token?: string | null
  session_started_at?: string | null
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
        } else if (error.code === 'PGRST301' || error.message.includes('406') || error.message.includes('Not Acceptable')) {
          // 表不存在或權限問題，返回預設值
          console.warn('user_settings 表不可存取，使用預設設定:', error.code)
          return null
        }
        console.error('獲取用戶設定失敗:', error)
        return null // 改為返回 null 而不是 throw
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
        }, {
          onConflict: 'user_id' // 明確指定衝突解決策略
        })

      if (error) {
        // 靜默處理所有已知的非關鍵錯誤
        if (error.code === '23505' || error.code === 'PGRST301' || 
            error.message.includes('406') || error.message.includes('duplicate key')) {
          // 這些錯誤不影響核心功能，靜默處理
          return true
        }
        console.error('更新用戶設定失敗:', error)
        return false
      }

      return true
    } catch (error) {
      // 靜默處理所有 user_settings 相關錯誤
      return true
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
      // 添加超時機制
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('獲取用戶設定超時')), 5000)
      })
      
      const settingsPromise = this.getUserSettings()
      const settings = await Promise.race([settingsPromise, timeoutPromise])
      
      return settings?.last_character_id || null
    } catch (error) {
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

      // 使用 upsert 避免重複 key 錯誤
      const { data, error } = await supabase
        .from('user_settings')
        .upsert(defaultSettings, {
          onConflict: 'user_id' // 明確指定衝突解決策略
        })
        .select()
        .single()

      if (error) {
        // 靜默處理所有已知的非關鍵錯誤
        return null
      }

      return data
    } catch (error) {
      // 靜默處理所有創建設定相關的錯誤
      return null
    }
  }

  /**
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

  /**
   * 生成新的 session token
   */
  static generateSessionToken(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  }

  /**
   * 建立新的 session
   * @returns session token
   */
  static async createSession(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.warn('未找到已認證用戶，無法建立 session')
        return null
      }

      const sessionToken = this.generateSessionToken()
      
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          active_session_token: sessionToken,
          session_started_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })

      if (error) {
        console.error('建立 session 失敗:', error)
        return null
      }

      // 儲存到 localStorage
      localStorage.setItem('dnd_session_token', sessionToken)
      console.log('✅ Session 已建立:', sessionToken.substring(0, 20) + '...')
      
      return sessionToken
    } catch (error) {
      console.error('createSession 失敗:', error)
      return null
    }
  }

  /**
   * 獲取當前有效的 session token（從資料庫）
   */
  static async getActiveSessionToken(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const { data, error } = await supabase
        .from('user_settings')
        .select('active_session_token')
        .eq('user_id', user.id)
        .single()

      if (error) return null
      return data?.active_session_token || null
    } catch (error) {
      return null
    }
  }

  /**
   * 驗證 session 是否有效
   * @returns true: 有效, false: 無效（需要重新登入）
   */
  static async validateSession(): Promise<boolean> {
    try {
      const localToken = localStorage.getItem('dnd_session_token')
      if (!localToken) {
        console.log('⚠️ 本地沒有 session token')
        return false
      }

      const serverToken = await this.getActiveSessionToken()
      
      const isValid = localToken === serverToken
      if (!isValid) {
        console.log('❌ Session 已失效（被其他裝置踢出）')
      }
      
      return isValid
    } catch (error) {
      console.error('validateSession 失敗:', error)
      return false
    }
  }

  /**
   * 清除 session（登出時呼叫）
   */
  static async clearSession(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return true

      const { error } = await supabase
        .from('user_settings')
        .update({
          active_session_token: null,
          session_started_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)

      localStorage.removeItem('dnd_session_token')
      
      if (error) {
        console.error('清除 session 失敗:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('clearSession 失敗:', error)
      return false
    }
  }
}