/**
 * ItemDetailModal - 道具詳細資訊彈窗
 */

import React from 'react';
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
          {/* 名稱 */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-300 w-20 shrink-0">名稱</label>
            <div className="text-lg font-bold text-white">{item.name}</div>
          </div>

          {/* 類別 */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-300 w-20 shrink-0">類別</label>
            <div className="px-3 py-1.5 bg-amber-900/30 border border-amber-700 text-amber-400 rounded-lg inline-block font-medium">
              {item.category}
            </div>
          </div>

          {/* 數量 */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-300 w-20 shrink-0">數量</label>
            <div className="text-lg font-bold text-white">× {item.quantity}</div>
          </div>

          {/* 詳細訊息 */}
          {item.description && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">詳細訊息</label>
              <div className="text-slate-300 whitespace-pre-wrap bg-slate-700/50 border border-slate-600 p-3 rounded-lg">
                {item.description}
              </div>
            </div>
          )}

          {/* 時間資訊 */}
          <div className="text-xs text-slate-500 border-t border-slate-700 pt-3">
            建立時間：{new Date(item.created_at).toLocaleString('zh-TW')}
            {item.updated_at && item.updated_at !== item.created_at && (
              <>
                <br />
                更新時間：{new Date(item.updated_at).toLocaleString('zh-TW')}
              </>
            )}
          </div>

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
