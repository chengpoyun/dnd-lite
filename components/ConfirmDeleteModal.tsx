import React from 'react'
import { Modal } from './ui/Modal'

interface ConfirmDeleteModalProps {
  isOpen: boolean
  characterName?: string
  title?: string
  message?: string
  confirmText?: string
  onConfirm: () => void
  onCancel?: () => void
  onClose?: () => void
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({ 
  isOpen, 
  characterName,
  title,
  message,
  confirmText,
  onConfirm,
  onCancel,
  onClose
}) => {
  const handleCancel = onCancel || onClose || (() => {});
  
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleCancel}
    >
      <div className="bg-slate-800 rounded-xl px-3 py-3 max-w-md w-full">
        <h2 className="text-xl font-bold mb-5">{title || "確認刪除角色"}</h2>
        
        <div className="mb-4">
          {characterName ? (
            <>
              <p className="text-slate-300 mb-2">
                確定要刪除角色 <span className="text-amber-400 font-semibold">{characterName}</span> 嗎？
              </p>
              <p className="text-slate-400 text-sm">
                此操作無法復原，角色的所有資料都會被永久刪除。
              </p>
            </>
          ) : message ? (
            <p className="text-slate-300 text-[16px] text-center">
              {message}
            </p>
          ) : null}
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={handleCancel}
            className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-colors"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors"
          >
            {confirmText || '確認刪除'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
