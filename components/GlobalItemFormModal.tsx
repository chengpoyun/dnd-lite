/**
 * GlobalItemFormModal - 新增/編輯全域物品表單
 * 用於創建可供所有用戶獲得的物品
 */

import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import type { GlobalItem, ItemCategory, CreateGlobalItemData, CreateGlobalItemDataForUpload } from '../services/itemService';
import { MODAL_CONTAINER_CLASS } from '../styles/modalStyles';
import { StatBonusEditor, type StatBonusEditorValue } from './StatBonusEditor';

type UploadInitialData = {
  name: string;
  name_en?: string;
  description: string;
  category: ItemCategory;
  is_magic: boolean;
  affects_stats?: boolean;
  stat_bonuses?: Record<string, unknown>;
};

interface GlobalItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** create = 僅新增全域物品；upload = 從角色物品上傳，所有欄位必填 */
  onSubmit: (data: CreateGlobalItemData | CreateGlobalItemDataForUpload) => Promise<void>;
  editItem?: GlobalItem | null;
  mode?: 'create' | 'upload';
  /** 上傳模式時預填（來自角色物品的顯示值） */
  uploadInitialData?: UploadInitialData | null;
}

const CATEGORIES: ItemCategory[] = ['裝備', '藥水', 'MH素材', '雜項'];

export const GlobalItemFormModal: React.FC<GlobalItemFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editItem = null,
  mode = 'create',
  uploadInitialData = null,
}) => {
  const isUpload = mode === 'upload';
  const [formData, setFormData] = useState<CreateGlobalItemData & { name_en: string }>({
    name: '',
    name_en: '',
    description: '',
    category: '裝備',
    is_magic: false,
    affects_stats: false,
    stat_bonuses: {},
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (editItem) {
      setFormData({
        name: editItem.name,
        name_en: editItem.name_en || '',
        description: editItem.description,
        category: editItem.category,
        is_magic: editItem.is_magic,
        affects_stats: editItem.affects_stats ?? false,
        stat_bonuses: (editItem.stat_bonuses ?? {}) || {},
      });
    } else if (isUpload && uploadInitialData) {
      setFormData({
        name: uploadInitialData.name,
        name_en: uploadInitialData.name_en ?? '',
        description: uploadInitialData.description,
        category: uploadInitialData.category,
        is_magic: uploadInitialData.is_magic,
        affects_stats: uploadInitialData.affects_stats ?? false,
        stat_bonuses: (uploadInitialData.stat_bonuses ?? {}) as CreateGlobalItemData['stat_bonuses'],
      });
    } else {
      setFormData({
        name: '',
        name_en: '',
        description: '',
        category: '裝備',
        is_magic: false,
        affects_stats: false,
        stat_bonuses: {},
      });
    }
    setShowConfirm(false);
  }, [editItem, isUpload, uploadInitialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    if (isUpload && (!formData.name_en.trim() || !formData.description.trim())) return;

    if (!editItem) {
      setShowConfirm(true);
      return;
    }
    await performSubmit();
  };

  const performSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (isUpload) {
        await onSubmit({
          name: formData.name.trim(),
          name_en: formData.name_en.trim(),
          description: formData.description.trim(),
          category: formData.category,
          is_magic: formData.is_magic,
          affects_stats: formData.affects_stats,
          stat_bonuses: formData.stat_bonuses,
        });
      } else {
        await onSubmit({
          name: formData.name,
          name_en: formData.name_en || undefined,
          description: formData.description || undefined,
          category: formData.category,
          is_magic: formData.is_magic,
          affects_stats: formData.affects_stats,
          stat_bonuses: formData.stat_bonuses,
        });
      }
      onClose();
      setShowConfirm(false);
    } catch (error) {
      console.error('提交物品失敗:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showConfirm) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} size="md">
        <div className={MODAL_CONTAINER_CLASS}>
          <h2 className="text-xl font-bold mb-5">
            {isUpload ? '確認上傳物品' : '確認新增物品'}
          </h2>
          <p className="text-slate-300 mb-6">
            {isUpload ? '是否確定上傳' : '是否確定新增'}{' '}
            <span className="text-amber-400 font-semibold">{formData.name}</span>{' '}
            到資料庫？該物品會能被其他玩家獲取。
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
              {isSubmitting ? '處理中...' : isUpload ? '確認上傳' : '確認新增'}
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
      <div className={MODAL_CONTAINER_CLASS}>
        <h2 className="text-xl font-bold mb-5">
          {isUpload ? '上傳到資料庫' : editItem ? '編輯全域物品' : '新增物品到資料庫'}
        </h2>
        {isUpload && (
          <p className="text-slate-400 text-sm mb-4">
            所有欄位皆為必填，且英文名稱（name_en）將用於比對是否已存在，大小寫視為相同。
          </p>
        )}
        {!editItem && !isUpload && (
          <p className="text-slate-400 text-sm mb-4">
            💡 請盡可能填寫詳細訊息，該物品可以被其他玩家所獲取。
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
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
          <div>
            <label className="block text-[14px] text-slate-400 mb-2">
              英文名稱 {isUpload ? '*' : '（選填）'}
            </label>
            <input
              type="text"
              value={formData.name_en}
              onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
              className="w-full bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500"
              placeholder="Enter item name in English"
              maxLength={100}
              required={isUpload}
            />
          </div>
          <div>
            <label className="block text-[14px] text-slate-400 mb-2">類別 *</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as ItemCategory })}
              className="w-full bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-[14px] text-slate-300">
            <input
              type="checkbox"
              checked={formData.is_magic}
              onChange={(e) => setFormData({ ...formData, is_magic: e.target.checked })}
              className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500"
            />
            魔法物品
          </label>
          <div>
            <label className="block text-[14px] text-slate-400 mb-2">
              詳細描述 {isUpload ? '*' : ''}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500"
              placeholder="輸入物品描述（支援 Markdown 格式）"
              rows={6}
              required={isUpload}
            />
          </div>
          {/* 影響角色數值設定 */}
          <div className="border border-slate-800 rounded-lg p-3 bg-slate-900/60 space-y-2">
            <label className="flex items-center gap-2 text-[14px] text-slate-200">
              <input
                type="checkbox"
                checked={!!formData.affects_stats}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    affects_stats: e.target.checked,
                    stat_bonuses: e.target.checked ? prev.stat_bonuses ?? {} : {},
                  }))
                }
                className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500"
              />
              這個物品會影響角色數值（能力調整值、豁免、技能、戰鬥數值）
            </label>
            {formData.affects_stats && (
              <div className="mt-2 space-y-2">
                <p className="text-xs text-slate-500">
                  設定後，角色持有此物品時，這些加值會自動套用並在角色卡與戰鬥頁的加值列表中顯示來源。
                </p>
                <StatBonusEditor
                  value={(formData.stat_bonuses ?? {}) as StatBonusEditorValue}
                  onChange={(next) =>
                    setFormData((prev) => ({
                      ...prev,
                      stat_bonuses: next,
                    }))
                  }
                />
              </div>
            )}
          </div>
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
                editItem ? 'bg-blue-600 text-white active:bg-blue-700' : 'bg-red-600 text-white active:bg-red-700'
              } disabled:opacity-50`}
            >
              {isSubmitting ? '處理中...' : isUpload ? '上傳' : editItem ? '儲存修改' : '新增物品'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
