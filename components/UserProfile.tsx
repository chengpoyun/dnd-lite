import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { AuthService } from '../services/auth'

export const UserProfile: React.FC = () => {
  const { user, signOut } = useAuth()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [isSigningIn, setIsSigningIn] = useState(false)

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await signOut()
    } catch (error) {
      console.error('登出失敗:', error)
    } finally {
      setIsSigningOut(false)
      setIsDropdownOpen(false)
    }
  }

  const handleSignIn = async () => {
    setIsSigningIn(true)
    try {
      const result = await AuthService.signInWithGoogle()
      if (!result.success) {
        console.error('登入失敗:', result.error)
        alert('登入失敗，請稍後再試')
      }
    } catch (error) {
      console.error('登入錯誤:', error)
      alert('登入時發生錯誤')
    } finally {
      setIsSigningIn(false)
      setIsDropdownOpen(false)
    }
  }

  // 如果用戶未登入，顯示登入按鈕
  if (!user) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 rounded-lg p-2 transition-colors duration-200"
        >
          <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center">
            <span className="text-sm text-slate-400">👤</span>
          </div>
          <span className="text-sm text-slate-400 hidden sm:block">
            匿名用戶
          </span>
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isDropdownOpen ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* 匿名用戶下拉選單 */}
        {isDropdownOpen && (
          <div className="absolute right-0 top-12 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50">
            {/* 匿名用戶資訊 */}
            <div className="p-4 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-600 flex items-center justify-center">
                  <span className="text-lg text-slate-400">👤</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200">
                    匿名用戶
                  </p>
                  <p className="text-xs text-slate-400">
                    登入以同步角色數據
                  </p>
                </div>
              </div>
            </div>

            {/* 登入選項 */}
            <div className="py-2">
              <div className="px-4 py-2">
                <p className="text-xs text-slate-500 uppercase tracking-wider">登入選項</p>
              </div>
              
              <button
                onClick={handleSignIn}
                disabled={isSigningIn}
                className="w-full px-4 py-2 text-left text-sm text-amber-400 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSigningIn ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-amber-400 border-t-transparent"></div>
                    登入中...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    使用 Google 登入
                  </>
                )}
              </button>

              <div className="px-4 py-2 mt-2">
                <p className="text-xs text-slate-500">
                  💡 登入後可以：<br/>
                  • 創建多個角色<br/>
                  • 同步角色數據<br/>
                  • 角色數據備份
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 點擊外部關閉下拉選單 */}
        {isDropdownOpen && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsDropdownOpen(false)}
          />
        )}
      </div>
    )
  }

  const displayName = user.full_name || user.email || '用戶'

  return (
    <div className="relative">
      {/* 用戶頭像按鈕 */}
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 rounded-lg p-2 transition-colors duration-200"
      >
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt="用戶頭像"
            className="w-8 h-8 rounded-full border-2 border-amber-400"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center">
            <span className="text-sm font-bold text-slate-900">
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <span className="text-sm text-slate-200 hidden sm:block max-w-24 truncate">
          {displayName}
        </span>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
            isDropdownOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 下拉選單 */}
      {isDropdownOpen && (
        <div className="absolute right-0 top-12 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50">
          {/* 用戶資訊 */}
          <div className="p-4 border-b border-slate-700">
            <div className="flex items-center gap-3">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt="用戶頭像"
                  className="w-12 h-12 rounded-full border-2 border-amber-400"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center">
                  <span className="text-lg font-bold text-slate-900">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">
                  {displayName}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {user.email}
                </p>
              </div>
            </div>
          </div>

          {/* 選單項目 */}
          <div className="py-2">
            <div className="px-4 py-2">
              <p className="text-xs text-slate-500 uppercase tracking-wider">帳號管理</p>
            </div>
            
            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSigningOut ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-400 border-t-transparent"></div>
                  登出中...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  登出
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 點擊外部關閉下拉選單 */}
      {isDropdownOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </div>
  )
}