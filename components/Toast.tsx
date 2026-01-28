import React, { useState, useEffect } from 'react'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastMessage {
  id: string
  message: string
  type: ToastType
  duration?: number
}

interface ToastProps {
  message: ToastMessage
  onRemove: (id: string) => void
}

const Toast: React.FC<ToastProps> = ({ message, onRemove }) => {
  useEffect(() => {
    const duration = message.duration || 4000
    const timer = setTimeout(() => {
      onRemove(message.id)
    }, duration)

    return () => clearTimeout(timer)
  }, [message.id, message.duration, onRemove])

  const getToastStyle = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'bg-emerald-600 border-emerald-500'
      case 'error':
        return 'bg-red-600 border-red-500'
      case 'info':
        return 'bg-blue-600 border-blue-500'
      default:
        return 'bg-slate-600 border-slate-500'
    }
  }

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return '✅'
      case 'error':
        return '❌'
      case 'info':
        return 'ℹ️'
      default:
        return '📝'
    }
  }

  return (
    <div className={`
      ${getToastStyle(message.type)}
      text-white px-4 py-3 rounded-lg shadow-lg border-l-4 
      flex items-center gap-3 min-w-[300px] max-w-[500px]
      animate-in slide-in-from-right duration-300
    `}>
      <span className="text-lg">{getIcon(message.type)}</span>
      <span className="flex-1 text-sm font-medium">{message.message}</span>
      <button
        onClick={() => onRemove(message.id)}
        className="text-white/80 hover:text-white transition-colors"
      >
        ✕
      </button>
    </div>
  )
}

// Toast 容器組件
interface ToastContainerProps {
  toasts: ToastMessage[]
  onRemove: (id: string) => void
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map(toast => (
        <Toast key={toast.id} message={toast} onRemove={onRemove} />
      ))}
    </div>
  )
}

export default Toast