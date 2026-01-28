import React, { useState, useEffect } from 'react'
import { DetailedCharacterService } from '../services/detailedCharacter'
import { AnonymousService } from '../services/anonymous'
import { Card, Title } from './ui'
import { STYLES, combineStyles } from '../styles/common'
import { useToast } from '../hooks/useToast'
import { ToastContainer } from './Toast'

interface ConversionPageProps {
  userId: string
  onComplete: (success: boolean) => void
}

export const ConversionPage: React.FC<ConversionPageProps> = ({ userId, onComplete }) => {
  const [isConverting, setIsConverting] = useState(false)
  const [conversionStatus, setConversionStatus] = useState<'checking' | 'converting' | 'success' | 'failed'>('checking')
  const { toasts, showSuccess, showError, showInfo, removeToast } = useToast()

  useEffect(() => {
    startConversion()
  }, [userId])

  const startConversion = async () => {
    setIsConverting(true)
    setConversionStatus('checking')

    try {
      // 檢查是否有匿名角色需要轉換
      const hasAnonymousChars = await DetailedCharacterService.hasAnonymousCharactersToConvert()
      
      if (!hasAnonymousChars) {
        // 沒有需要轉換的角色，直接完成
        setConversionStatus('success')
        showSuccess('登入成功！')
        setTimeout(() => onComplete(true), 1500)
        return
      }

      // 開始轉換
      setConversionStatus('converting')
      
      const success = await DetailedCharacterService.convertAnonymousCharactersToUser(userId)
      
      if (success) {
        setConversionStatus('success')
        showSuccess('匿名角色已成功轉換到您的帳號！')
        setTimeout(() => onComplete(true), 2000)
      } else {
        setConversionStatus('failed')
        showError('角色轉換失敗，您的匿名角色已保留，可稍後手動轉換')
      }
      
    } catch (error) {
      console.error('轉換過程發生錯誤:', error)
      setConversionStatus('failed')
      showError('轉換過程發生錯誤，您的資料已保留')
    } finally {
      setIsConverting(false)
    }
  }

  const handleManualRetry = () => {
    startConversion()
  }

  const handleSkip = () => {
    // 跳過轉換，保留匿名資料
    showInfo('已跳過轉換，您可稍後在角色選擇頁面手動轉換')
    setTimeout(() => onComplete(true), 1500)
  }

  const renderContent = () => {
    switch (conversionStatus) {
      case 'checking':
        return (
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto mb-4"></div>
            <h3 className="text-lg font-medium text-white mb-2">檢查帳號資料</h3>
            <p className="text-slate-400">正在檢查是否有角色需要轉換...</p>
          </div>
        )
        
      case 'converting':
        return (
          <div className="text-center">
            <div className="animate-pulse">
              <div className="text-4xl mb-4">⚡</div>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">正在轉換角色</h3>
            <p className="text-slate-400">正在將您的匿名角色轉換到 Google 帳號...</p>
            <div className="mt-4 bg-slate-800 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full animate-pulse w-3/4"></div>
            </div>
          </div>
        )
        
      case 'success':
        return (
          <div className="text-center">
            <div className="text-4xl mb-4">✅</div>
            <h3 className="text-lg font-medium text-emerald-400 mb-2">轉換完成！</h3>
            <p className="text-slate-400">您的角色已成功關聯到 Google 帳號</p>
            <p className="text-sm text-slate-500 mt-2">即將自動跳轉...</p>
          </div>
        )
        
      case 'failed':
        return (
          <div className="text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="text-lg font-medium text-red-400 mb-2">轉換失敗</h3>
            <p className="text-slate-400 mb-4">
              轉換過程中發生問題，但您的角色資料已安全保留
            </p>
            <div className="space-y-2">
              <button
                onClick={handleManualRetry}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
              >
                重新嘗試
              </button>
              <button
                onClick={handleSkip}
                className="w-full bg-slate-600 hover:bg-slate-700 text-white py-2 px-4 rounded-lg transition-colors"
              >
                跳過轉換
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              您可稍後在角色管理頁面手動進行轉換
            </p>
          </div>
        )
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <div className="text-center mb-6">
          <Title size="medium" className="mb-2">
            帳號整合
          </Title>
        </div>
        
        {renderContent()}
        
        {/* 防止用戶意外離開 */}
        {isConverting && (
          <div className="mt-6 text-center">
            <p className="text-xs text-slate-500">
              正在處理中，請勿關閉瀏覽器
            </p>
          </div>
        )}
      </Card>
      
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}