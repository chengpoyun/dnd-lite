import React, { createContext, useContext, useEffect, useState } from 'react'
import { AuthService, type AuthUser } from '../services/auth'
import { UserSettingsService } from '../services/userSettings'

interface AuthContextType {
  user: AuthUser | null
  isLoading: boolean
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  sessionExpired: boolean
  clearSessionExpired: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sessionExpired, setSessionExpired] = useState(false)

  useEffect(() => {
    // 初始化認證狀態
    const initAuth = async () => {
      try {
        const currentUser = await AuthService.getCurrentUser()
        setUser(currentUser)
        
        // 如果有用戶，建立 session
        if (currentUser) {
          await UserSettingsService.createSession()
        }
      } catch (error) {
        console.error('初始化認證失敗:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()

    // 監聽認證狀態變化
    const { data: { subscription } } = AuthService.onAuthStateChange(async (authUser) => {
      setUser(authUser)
      setIsLoading(false)
      
      // 用戶登入時建立新 session
      if (authUser) {
        await UserSettingsService.createSession()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async () => {
    setIsLoading(true)
    try {
      const result = await AuthService.signInWithGoogle()
      if (!result.success) {
        console.error('登入失敗:', result.error)
        setIsLoading(false)
      }
      // 成功的話 onAuthStateChange 會處理狀態更新和 session 建立
    } catch (error) {
      console.error('登入時發生錯誤:', error)
      setIsLoading(false)
    }
  }

  const signOut = async () => {
    setIsLoading(true)
    try {
      // 清除 session
      await UserSettingsService.clearSession()
      
      const result = await AuthService.signOut()
      if (!result.success) {
        console.error('登出失敗:', result.error)
      }
    } catch (error) {
      console.error('登出時發生錯誤:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const clearSessionExpired = () => {
    setSessionExpired(false)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut, sessionExpired, clearSessionExpired }}>
      {children}
    </AuthContext.Provider>
  )
}