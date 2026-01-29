import React, { useState } from 'react'
import { AuthService } from '../services/auth'
import { AnonymousService } from '../services/anonymous'
import { PageContainer, Card, Button, Title, Subtitle } from './ui'
import { STYLES, combineStyles } from '../styles/common'
import { useToast } from '../hooks/useToast'
import { ToastContainer } from './Toast'

interface WelcomePageProps {
  onNext: (mode: 'authenticated' | 'anonymous') => void
  initError?: string | null // 初始化錯誤訊息
  onRetry?: () => void // 重試函數
}

export const WelcomePage: React.FC<WelcomePageProps> = ({ onNext, initError, onRetry }) => {
  const [isSigningIn, setIsSigningIn] = useState(false)
  const { toasts, showSuccess, showError, removeToast } = useToast()

  // 動態重定向 URL 配置
  const getRedirectUrl = () => {
    const isLocalhost = window.location.hostname === 'localhost'
    return isLocalhost 
      ? `http://localhost:${window.location.port}/dnd-lite/` 
      : 'https://chengpoyun.github.io/dnd-lite/'
  }

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true)
    try {
      // 先試試不傳遞自定義重定向 URL，使用 Supabase 的預設設定
      const result = await AuthService.signInWithGoogle()
      if (result.success) {
        showSuccess('正在跳轉到 Google 登入頁面...')
        // OAuth 會自動重定向，不需要調用 onNext
      } else {
        showError(result.error || '登入失敗，請稍後再試')
        setIsSigningIn(false)
      }
    } catch (error) {
      console.error('登入錯誤:', error)
      showError('登入時發生錯誤，請稍後再試')
      setIsSigningIn(false)
    }
  }

  const handleAnonymousStart = async () => {
    try {
      // 初始化匿名用戶
      await AnonymousService.init()
      showSuccess('初始化成功，歡迎使用！')
      onNext('anonymous')
    } catch (error) {
      console.error('匿名初始化失敗:', error)
      showError('初始化失敗，請稍後再試')
    }
  }

  return (
    <div className={combineStyles(
      STYLES.container.page,
      STYLES.layout.flexCenter,
      STYLES.spacing.pageX
    )}>
      <Card className="max-w-md w-full">
        {/* 錯誤提示 */}
        {initError && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg">
            <div className="flex items-start gap-3">
              <span className="text-red-400 text-xl">⚠️</span>
              <div className="flex-1">
                <p className="text-red-300 text-sm mb-3">{initError}</p>
                {onRetry && (
                  <Button
                    onClick={onRetry}
                    variant="secondary"
                    size="small"
                    className="w-full"
                  >
                    🔄 重新載入
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* 標題 */}
        <div className="text-center mb-6">
          <div className="text-4xl sm:text-5xl mb-3">🎲</div>
          <Title size="large" className="mb-2">
            D&D 角色助手
          </Title>
          <Subtitle>
            管理你的龍與地下城角色
          </Subtitle>
        </div>

        {/* 選項 */}
        <div className={STYLES.spacing.gap}>
          {/* Google 登入 */}
          <Button
            onClick={handleGoogleSignIn}
            disabled={isSigningIn}
            loading={isSigningIn}
            className="w-full gap-2 sm:gap-3"
          >
            {!isSigningIn && (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            使用 Google 登入
          </Button>

          {/* 功能說明 */}
          <div className="bg-slate-800/50 rounded-lg p-3 sm:p-4">
            <div className={combineStyles(
              STYLES.layout.flexCenter,
              STYLES.spacing.gapSmall,
              'text-amber-400 text-xs sm:text-sm font-medium mb-2'
            )}>
              <span>✨</span>
              登入帳號享有完整功能
            </div>
            <ul className="text-slate-400 text-xs space-y-0.5">
              <li>• 創建多個角色</li>
              <li>• 雲端同步備份</li>
              <li>• 跨設備使用</li>
              <li>• 資料永不丟失</li>
            </ul>
          </div>

          {/* 分隔線 */}
          <div className={STYLES.layout.flexCenter}>
            <div className="flex-1 h-px bg-slate-700"></div>
            <span className="text-slate-500 text-sm px-4">或</span>
            <div className="flex-1 h-px bg-slate-700"></div>
          </div>

          {/* 匿名使用 */}
          <Button
            variant="secondary"
            onClick={handleAnonymousStart}
            className="w-full gap-2 sm:gap-3"
          >
            <span className="text-lg sm:text-xl">👤</span>
            匿名試用
          </Button>

          {/* 匿名說明 */}
          <div className="bg-slate-800/30 rounded-lg p-3 sm:p-4 border border-slate-700/50">
            <div className={combineStyles(
              STYLES.layout.flexCenter,
              STYLES.spacing.gapSmall,
              'text-slate-300 text-xs sm:text-sm font-medium mb-2'
            )}>
              <span>⚡</span>
              立即開始使用
            </div>
            <ul className="text-slate-500 text-xs space-y-0.5">
              <li>• 單一角色管理</li>
              <li>• 本地資料儲存</li>
              <li>• 可隨時升級登入</li>
            </ul>
            <div className="mt-2 sm:mt-3 text-amber-400/80 text-xs">
              💡 提醒：清除瀏覽器資料會遺失角色
            </div>
          </div>
        </div>

        {/* 版本資訊 */}
        <div className="mt-8 text-center text-slate-600 text-xs">
          D&D 角色助手 v1.0
        </div>
      </Card>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}