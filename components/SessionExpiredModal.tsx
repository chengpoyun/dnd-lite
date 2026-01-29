import React from 'react'
import { Modal } from './ui/Modal'

interface SessionExpiredModalProps {
  isOpen: boolean
  onRelogin: () => void
}

export const SessionExpiredModal: React.FC<SessionExpiredModalProps> = ({ 
  isOpen, 
  onRelogin 
}) => {
  if (!isOpen) return null

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={() => {}} // 不允許關閉
      title="帳號已在其他裝置登入"
    >
      <div className="space-y-4">
        <p className="text-slate-300">
          您的帳號已在其他裝置登入，此裝置已自動登出。
        </p>
        <p className="text-slate-400 text-sm">
          如果這不是您的操作，請檢查帳號安全。
        </p>
        <button
          onClick={onRelogin}
          className="w-full px-4 py-3 bg-amber-500 hover:bg-amber-600 text-slate-900 font-medium rounded-lg transition-colors"
        >
          重新登入
        </button>
      </div>
    </Modal>
  )
}
