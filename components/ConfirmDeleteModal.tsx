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
      title={title || "確認刪除角色"}
    >
      <div className="space-y-4">
        {characterName ? (
          <>
            <p className="text-slate-300">
              確定要刪除角色 <span className="text-amber-400 font-semibold">{characterName}</span> 嗎？
            </p>
            <p className="text-slate-400 text-sm">
              此操作無法復原，角色的所有資料都會被永久刪除。
            </p>
          </>
        ) : message ? (
          <p className="text-slate-500 text-[16px] text-center">
            {message}
          </p>
        ) : null}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleCancel}
            className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            {confirmText || '確認刪除'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
