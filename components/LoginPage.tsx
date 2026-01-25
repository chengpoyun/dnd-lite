import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export const LoginPage: React.FC = () => {
  const { signIn } = useAuth()
  const [isSigningIn, setIsSigningIn] = useState(false)

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true)
    try {
      await signIn()
      // 登入成功後會由 AuthContext 處理狀態更新
    } catch (error) {
      console.error('登入失敗:', error)
    } finally {
      setIsSigningIn(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        
        {/* Logo 和標題 */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg">
            <span className="text-2xl">🎲</span>
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-amber-400">
            D&D 冒險者助手
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            使用 Google 帳號登入，安全儲存你的角色資料
          </p>
        </div>

        {/* 功能介紹 */}
        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
          <h3 className="text-lg font-semibold text-amber-300 mb-4">✨ 功能特色</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-green-400 mt-0.5">💾</span>
              <div>
                <p className="text-sm font-medium text-slate-200">雲端同步</p>
                <p className="text-xs text-slate-400">角色資料安全儲存在雲端</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-blue-400 mt-0.5">📱</span>
              <div>
                <p className="text-sm font-medium text-slate-200">多設備存取</p>
                <p className="text-xs text-slate-400">手機、平板、電腦都能使用</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-purple-400 mt-0.5">🏠</span>
              <div>
                <p className="text-sm font-medium text-slate-200">多角色管理</p>
                <p className="text-xs text-slate-400">輕鬆切換不同的角色資料</p>
              </div>
            </div>
          </div>
        </div>

        {/* Google 登入按鈕 */}
        <div>
          <button
            onClick={handleGoogleSignIn}
            disabled={isSigningIn}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-slate-900 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {isSigningIn ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-900 border-t-transparent mr-2"></div>
                登入中...
              </>
            ) : (
              <>
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                使用 Google 帳號登入
              </>
            )}
          </button>
        </div>

        {/* 說明文字 */}
        <div className="text-center">
          <p className="text-xs text-slate-500">
            登入即表示您同意我們的服務條款和隱私政策
          </p>
        </div>
      </div>
    </div>
  )
}