import { supabase } from '../lib/supabase'
import { DetailedCharacterService } from './detailedCharacter'
import type { User, Session } from '@supabase/supabase-js'

export interface AuthUser {
  id: string
  email: string | undefined
  full_name: string | undefined
  avatar_url: string | undefined
}

// 認證服務
export class AuthService {
  
  // Google 登入
  static async signInWithGoogle(redirectTo?: string): Promise<{ success: boolean, error?: string }> {
    try {
      // 動態重定向 URL 配置
      const getRedirectUrl = () => {
        if (redirectTo) return redirectTo
        const isLocalhost = window.location.hostname === 'localhost'
        const finalUrl = isLocalhost 
          ? `http://localhost:${window.location.port}/dnd-lite/` 
          : 'https://chengpoyun.github.io/dnd-lite/'
        
        console.log('重定向 URL:', finalUrl)
        return finalUrl
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getRedirectUrl()
        }
      })

      if (error) {
        console.error('Google 登入失敗:', error)
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      console.error('Google 登入發生錯誤:', error)
      return { success: false, error: '登入時發生未知錯誤' }
    }
  }

  // 登出
  static async signOut(): Promise<{ success: boolean, error?: string }> {
    try {
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('登出失敗:', error)
        return { success: false, error: error.message }
      }

      // 清除本地快取
      localStorage.removeItem('current_character_id')
      this.clearAuthCache()

      return { success: true }
    } catch (error) {
      console.error('登出時發生錯誤:', error)
      return { success: false, error: '登出時發生未知錯誤' }
    }
  }

  // 獲取當前用戶
  static async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return null

      return {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.user_metadata?.name,
        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture
      }
    } catch (error) {
      console.error('獲取用戶資料失敗:', error)
      return null
    }
  }

  // 獲取當前會話
  static async getCurrentSession(): Promise<Session | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      return session
    } catch (error) {
      console.error('獲取會話失敗:', error)
      return null
    }
  }

  // 監聽認證狀態變化
  static onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      // 只在重要事件時記錄日誌
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        console.log('🔐 認證狀態:', event, session?.user?.email || '匿名')
      }
      
      if (session?.user) {
        const authUser: AuthUser = {
          id: session.user.id,
          email: session.user.email,
          full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name,
          avatar_url: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture
        }

        callback(authUser)
      } else {
        callback(null)
      }
    })
  }

  // 清除認證快取
  private static clearAuthCache() {
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.startsWith('dnd_cache_')) {
        localStorage.removeItem(key)
      }
    })
  }

  // 檢查是否已登入
  static async isAuthenticated(): Promise<boolean> {
    const session = await this.getCurrentSession()
    return session !== null
  }
}