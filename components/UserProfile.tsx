import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export const UserProfile: React.FC = () => {
  const { user, signOut } = useAuth()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  if (!user) return null

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