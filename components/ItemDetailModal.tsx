/**
 * ItemDetailModal - 道具詳細資訊彈窗
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Modal } from './ui/Modal';
import type { Item } from '../services/itemService';

interface ItemDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Item | null;
  onEdit: () => void;
  onDelete: () => void;
}

export default function ItemDetailModal({
  isOpen,
  onClose,
  item,
  onEdit,
  onDelete
}: ItemDetailModalProps) {
  if (!item) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-slate-800 rounded-xl px-3 py-3 max-w-md w-full">
        <h2 className="text-xl font-bold mb-5">道具詳情</h2>
        
        <div className="space-y-3">
          {/* 名稱 類別 數量 */}
          <div className="flex items-center justify-between gap-3 py-2">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-white">{item.name}</span>
              <span className="text-amber-400 font-bold">×{item.quantity}</span>
            </div>
            <div className="px-3 py-1.5 bg-amber-900/30 border border-amber-700 text-amber-400 rounded-lg font-medium">
              {item.category}
            </div>
          </div>

          {/* 詳細訊息 */}
          {item.description && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">詳細訊息</label>
              <div className="bg-slate-700/50 border border-slate-600 p-3 rounded-lg text-slate-300">
                <ReactMarkdown 
                  components={{
                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                    strong: ({ children }) => <strong className="font-bold text-slate-50">{children}</strong>,
                    em: ({ children }) => <em className="italic text-slate-200">{children}</em>,
                    ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                    li: ({ children }) => <li className="text-slate-300">{children}</li>,
                  }}
                >
                  {item.description}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {/* 操作按鈕 */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onEdit}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              編輯
            </button>
            <button
              onClick={onDelete}
              className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              刪除
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
