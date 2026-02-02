/**
 * CharacterItemEditModal - 編輯角色專屬物品
 * 只更新 override 欄位，不影響全域物品資料
 */

import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import type { CharacterItem, ItemCategory, UpdateCharacterItemData } from '../services/itemService';

interface CharacterItemEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  characterItem: CharacterItem | null;
  onSubmit: (characterItemId: string, updates: UpdateCharacterItemData) => Promise<void>;
}

const CATEGORIES: ItemCategory[] = ['裝備', '魔法物品', '藥水', '素材', '雜項'];

export const CharacterItemEditModal: React.FC<CharacterItemEditModalProps> = ({
  isOpen,
  onClose,
  characterItem,
  onSubmit
}) => {
  const [formData, setFormData] = useState<UpdateCharacterItemData>({
    quantity: 1,
    name_override: '',
    description_override: '',
    category_override: null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (characterItem) {
      setFormData({
        quantity: characterItem.quantity,
        name_override: characterItem.name_override || '',
        description_override: characterItem.description_override || '',
        category_override: characterItem.category_override || null
      });
    }
  }, [characterItem, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!characterItem) return;

    setIsSubmitting(true);
    try {
      // 只傳送有值的 override 欄位
      const updates: UpdateCharacterItemData = {
        quantity: formData.quantity
      };

      if (formData.name_override?.trim()) {
        updates.name_override = formData.name_override;
      }
      if (formData.description_override?.trim()) {
        updates.description_override = formData.description_override;
      }
      if (formData.category_override) {
        updates.category_override = formData.category_override;
      }

      await onSubmit(characterItem.id, updates);
      onClose();
    } catch (error) {
      console.error('更新物品失敗:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!characterItem) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="3xl">
      <div className="bg-slate-800 rounded-xl px-3 py-3 max-w-3xl w-full">
        <h2 className="text-xl font-bold mb-5">編輯物品</h2>
        
        <p className="text-slate-400 text-sm mb-4">
          💡 修改下方欄位將只影響您的角色，不會影響其他玩家。留空表示使用原始值。
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 兩欄布局 */}
          <div className="grid grid-cols-2 gap-4">
            {/* 左欄：原始值 */}
            <div className="space-y-3">
              <h3 className="text-amber-400 font-bold text-sm mb-3">📜 原始值（參考）</h3>
              
              <div>
                <label className="block text-[14px] text-slate-500 mb-2">名稱</label>
                <div className="bg-slate-900/50 rounded-lg border border-slate-700 p-3 text-slate-400">
                  {characterItem.item?.name || '無'}
                </div>
              </div>

              <div>
                <label className="block text-[14px] text-slate-500 mb-2">類別</label>
                <div className="bg-slate-900/50 rounded-lg border border-slate-700 p-3 text-slate-400">
                  {characterItem.item?.category || '無'}
                </div>
              </div>

              <div>
                <label className="block text-[14px] text-slate-500 mb-2">描述</label>
                <div className="bg-slate-900/50 rounded-lg border border-slate-700 p-3 text-slate-400 max-h-[120px] overflow-y-auto">
                  {characterItem.item?.description || '無'}
                </div>
              </div>
            </div>

            {/* 右欄：客製化值 */}
            <div className="space-y-3">
              <h3 className="text-green-400 font-bold text-sm mb-3">✏️ 您的客製化</h3>
              
              <div>
                <label className="block text-[14px] text-slate-400 mb-2">名稱覆寫</label>
                <input
                  type="text"
                  value={formData.name_override || ''}
                  onChange={(e) => setFormData({ ...formData, name_override: e.target.value })}
                  className="w-full bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500"
                  placeholder={characterItem.item?.name || '留空使用原始值'}
                />
              </div>

              <div>
                <label className="block text-[14px] text-slate-400 mb-2">類別覆寫</label>
                <select
                  value={formData.category_override || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    category_override: e.target.value ? e.target.value as ItemCategory : null 
                  })}
                  className="w-full bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="">使用原始值</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[14px] text-slate-400 mb-2">描述覆寫</label>
                <textarea
                  value={formData.description_override || ''}
                  onChange={(e) => setFormData({ ...formData, description_override: e.target.value })}
                  className="w-full bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500"
                  placeholder={characterItem.item?.description || '留空使用原始值'}
                  rows={4}
                />
              </div>
            </div>
          </div>

          {/* 數量（不是 override，直接更新） */}
          <div>
            <label className="block text-[14px] text-slate-400 mb-2">數量</label>
            <input
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
              className="w-full bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500"
              min="0"
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
              className="flex-1 px-6 py-3 rounded-lg bg-blue-600 text-white font-bold active:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? '儲存中...' : '儲存修改'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
