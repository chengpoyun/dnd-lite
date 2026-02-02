/**
 * GlobalItemFormModal - 新增/編輯全域物品表單
 * 用於創建可供所有用戶獲得的物品
 */

import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import type { GlobalItem, ItemCategory, CreateGlobalItemData } from '../services/itemService';

interface GlobalItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateGlobalItemData) => Promise<void>;
  editItem?: GlobalItem | null;
}

const CATEGORIES: ItemCategory[] = ['裝備', '魔法物品', '藥水', '素材', '雜項'];

export const GlobalItemFormModal: React.FC<GlobalItemFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editItem = null
}) => {
  const [formData, setFormData] = useState<CreateGlobalItemData>({
    name: '',
    name_en: '',
    description: '',
    category: '裝備'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (editItem) {
      setFormData({
        name: editItem.name,
        name_en: editItem.name_en || '',
        description: editItem.description,
        category: editItem.category
      });
    } else {
      setFormData({
        name: '',
        name_en: '',
        description: '',
        category: '裝備'
      });
    }
    setShowConfirm(false);
  }, [editItem, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      return;
    }

    // 如果是新增物品，先顯示確認畫面
    if (!editItem) {
      setShowConfirm(true);
      return;
    }

    // 編輯模式直接提交
    await performSubmit();
  };

  const performSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
      setShowConfirm(false);
    } catch (error) {
      console.error('提交物品失敗:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 確認畫面
  if (showConfirm) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} size="md">
        <div className="bg-slate-800 rounded-xl px-3 py-3 max-w-md w-full">
          <h2 className="text-xl font-bold mb-5">確認新增物品</h2>
          <p className="text-slate-300 mb-6">
            是否確定新增 <span className="text-amber-400 font-semibold">{formData.name}</span> 到資料庫？該物品會能被其他玩家獲取。
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowConfirm(false)}
              className="flex-1 px-6 py-3 rounded-lg bg-slate-700 text-slate-300 font-bold active:bg-slate-600"
            >
              返回編輯
            </button>
            <button
              type="button"
              onClick={performSubmit}
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 rounded-lg bg-red-600 text-white font-bold active:bg-red-700 disabled:opacity-50"
            >
              {isSubmitting ? '新增中...' : '確認新增'}
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
      <div className="bg-slate-800 rounded-xl px-3 py-3 max-w-md w-full">
        <h2 className="text-xl font-bold mb-5">
          {editItem ? '編輯全域物品' : '新增全域物品'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* 中文名稱 */}
          <div>
            <label className="block text-[14px] text-slate-400 mb-2">中文名稱 *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500"
              placeholder="輸入物品名稱"
              required
              maxLength={100}
            />
          </div>

          {/* 英文名稱（選填） */}
          <div>
            <label className="block text-[14px] text-slate-400 mb-2">英文名稱（選填）</label>
            <input
              type="text"
              value={formData.name_en}
              onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
              className="w-full bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500"
              placeholder="Enter item name in English"
              maxLength={100}
            />
          </div>

          {/* 類別 */}
          <div>
            <label className="block text-[14px] text-slate-400 mb-2">類別 *</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as ItemCategory })}
              className="w-full bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* 詳細描述 */}
          <div>
            <label className="block text-[14px] text-slate-400 mb-2">詳細描述</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500"
              placeholder="輸入物品描述（支援 Markdown 格式）"
              rows={6}
            />
          </div>

          {/* 提交按鈕 */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-lg bg-slate-700 text-slate-300 font-bold active:bg-slate-600"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex-1 px-6 py-3 rounded-lg font-bold ${
                editItem 
                  ? 'bg-blue-600 text-white active:bg-blue-700' 
                  : 'bg-red-600 text-white active:bg-red-700'
              } disabled:opacity-50`}
            >
              {isSubmitting ? '儲存中...' : (editItem ? '儲存修改' : '新增物品')}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
