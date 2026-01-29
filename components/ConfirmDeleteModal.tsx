import React from 'react'
import { Modal } from './ui/Modal'

interface ConfirmDeleteModalProps {
  isOpen: boolean
  characterName: string
  onConfirm: () => void
  onCancel: () => void
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({ 
  isOpen, 
  characterName,
  onConfirm,
  onCancel
}) => {
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onCancel}
      title="確認刪除角色"
    >
      <div className="space-y-4">
        <p className="text-slate-300">
          確定要刪除角色 <span className="text-amber-400 font-semibold">{characterName}</span> 嗎？
        </p>
        <p className="text-slate-400 text-sm">
          此操作無法復原，角色的所有資料都會被永久刪除。
        </p>
        <div className="flex gap-3 pt-2">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            確認刪除
          </button>
        </div>
      </div>
    </Modal>
  )
}
