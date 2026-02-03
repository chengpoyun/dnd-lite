import React from 'react'
import { Modal } from './ui/Modal'
import { MODAL_CONTAINER_CLASS, BUTTON_DANGER_CLASS } from '../styles/modalStyles'

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
    >
      <div className={MODAL_CONTAINER_CLASS}>
        <h2 className="text-xl font-bold mb-5">帳號已在其他裝置登入</h2>
        <div className="space-y-4">
          <p className="text-slate-300">
            您的帳號已在其他裝置登入，此裝置已自動登出。
          </p>
          <p className="text-slate-400 text-sm">
            如果這不是您的操作，請檢查帳號安全。
          </p>
          <button
            onClick={onRelogin}
            className={BUTTON_DANGER_CLASS}
          >
            重新登入
          </button>
        </div>
      </div>
    </Modal>
  )
}
