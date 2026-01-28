import { useState, useCallback } from 'react'
import { ToastMessage, ToastType } from '../components/Toast'

// Toast 管理 Hook
export const useToast = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const showToast = useCallback((message: string, type: ToastType = 'info', duration?: number) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const newToast: ToastMessage = {
      id,
      message,
      type,
      duration
    }

    setToasts(prev => [...prev, newToast])

    // 返回 id 以便手動移除
    return id
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const clearAllToasts = useCallback(() => {
    setToasts([])
  }, [])

  // 便捷方法
  const showSuccess = useCallback((message: string, duration?: number) => {
    return showToast(message, 'success', duration)
  }, [showToast])

  const showError = useCallback((message: string, duration?: number) => {
    return showToast(message, 'error', duration)
  }, [showToast])

  const showInfo = useCallback((message: string, duration?: number) => {
    return showToast(message, 'info', duration)
  }, [showToast])

  return {
    toasts,
    showToast,
    showSuccess,
    showError,
    showInfo,
    removeToast,
    clearAllToasts
  }
}

export default useToast