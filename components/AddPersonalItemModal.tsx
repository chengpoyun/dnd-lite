/**
 * AddPersonalItemModal - 新增個人物品（只存在於該角色，不寫入 global_items）
 * 必填：名稱、類別；選填：描述、數量
 */

import React, { useState } from 'react';
import { Modal } from './ui/Modal';
import type { ItemCategory, CreateCharacterItemData } from '../services/itemService';
import { MODAL_CONTAINER_CLASS } from '../styles/modalStyles';

const CATEGORIES: ItemCategory[] = ['裝備', '藥水', '素材', '雜項'];

interface AddPersonalItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCharacterItemData) => Promise<void>;
}

export const AddPersonalItemModal: React.FC<AddPersonalItemModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ItemCategory>('裝備');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [isMagic, setIsMagic] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        category,
        description: description.trim() || undefined,
        quantity: quantity < 1 ? 1 : quantity,
        is_magic: isMagic,
      });
      setName('');
      setDescription('');
      setQuantity(1);
      setCategory('裝備');
      setIsMagic(false);
      onClose();
    } catch (err) {
      console.error('新增個人物品失敗:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
      <div className={MODAL_CONTAINER_CLASS}>
        <h2 className="text-xl font-bold mb-5">新增個人物品</h2>
        <p className="text-slate-400 text-sm mb-4">
          此物品僅屬於此角色；之後若想讓大家都能取得，可在物品詳情中「上傳到資料庫」。
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[14px] text-slate-400 mb-2">名稱 *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500"
              placeholder="輸入物品名稱"
              required
              maxLength={100}
            />
          </div>
          <div>
            <label className="block text-[14px] text-slate-400 mb-2">類別 *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ItemCategory)}
              className="w-full bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-[14px] text-slate-300">
            <input
              type="checkbox"
              checked={isMagic}
              onChange={(e) => setIsMagic(e.target.checked)}
              className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500"
            />
            魔法物品
          </label>
          <div>
            <label className="block text-[14px] text-slate-400 mb-2">描述（選填）</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500"
              placeholder="輸入描述"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-[14px] text-slate-400 mb-2">數量</label>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
              className="w-full bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-lg bg-slate-700 text-slate-300 font-bold"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 rounded-lg bg-amber-600 text-white font-bold disabled:opacity-50"
            >
              {isSubmitting ? '新增中...' : '新增'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
