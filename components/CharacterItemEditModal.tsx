/**
 * CharacterItemEditModal - 編輯角色專屬物品
 * 只更新 override 欄位，不影響全域物品資料
 */

import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import type { CharacterItem, ItemCategory, UpdateCharacterItemData } from '../services/itemService';
import { MODAL_CONTAINER_CLASS } from '../styles/modalStyles';
import { StatBonusEditor, type StatBonusEditorValue } from './StatBonusEditor';

interface CharacterItemEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  characterItem: CharacterItem | null;
  onSubmit: (characterItemId: string, updates: UpdateCharacterItemData) => Promise<void>;
}

const CATEGORIES: ItemCategory[] = ['裝備', '藥水', 'MH素材', '雜項'];

export const CharacterItemEditModal: React.FC<CharacterItemEditModalProps> = ({
  isOpen,
  onClose,
  characterItem,
  onSubmit
}) => {
  const [formData, setFormData] = useState<UpdateCharacterItemData & { stat_bonuses?: StatBonusEditorValue }>({
    quantity: 1,
    name_override: '',
    description_override: '',
    category_override: null,
    is_magic: false,
    affects_stats: false,
    stat_bonuses: {},
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (characterItem) {
      const display = {
        name: characterItem.name_override ?? characterItem.item?.name ?? '',
        description: characterItem.description_override ?? characterItem.item?.description ?? '',
        category: characterItem.category_override ?? characterItem.item?.category ?? null,
        is_magic: characterItem.item_id
          ? (characterItem.is_magic_override ?? characterItem.item?.is_magic ?? false)
          : characterItem.is_magic,
      };
      const ci = characterItem as any;
      const itemRaw = characterItem.item;
      const overrideBonuses = ci.stat_bonuses;
      const hasOverrideStats =
        (typeof ci.affects_stats === 'boolean' && ci.affects_stats) ||
        (overrideBonuses && typeof overrideBonuses === 'object' && Object.keys(overrideBonuses).length > 0);
      setFormData({
        quantity: characterItem.quantity,
        name_override: display.name,
        description_override: display.description,
        category_override: display.category,
        is_magic: display.is_magic,
        affects_stats: hasOverrideStats ? (ci.affects_stats ?? false) : (itemRaw?.affects_stats ?? false),
        stat_bonuses: hasOverrideStats ? (overrideBonuses ?? {}) : ((itemRaw?.stat_bonuses ?? {}) || {}),
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
      if (characterItem.item_id) {
        updates.is_magic_override = !!formData.is_magic;
      } else {
        updates.is_magic = !!formData.is_magic;
      }
      if (formData.affects_stats !== undefined) {
        updates.affects_stats = formData.affects_stats;
      }
      if (formData.stat_bonuses !== undefined) {
        updates.stat_bonuses = formData.stat_bonuses;
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
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
      <div className={MODAL_CONTAINER_CLASS}>
        <h2 className="text-xl font-bold mb-5">編輯物品</h2>
        
        <p className="text-slate-400 text-sm mb-4">
          💡 修改欄位將只影響您的角色，不會影響其他玩家。
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* 數量（最常用，放最上面） */}
          <div>
            <label className="block text-[14px] text-slate-400 mb-2">數量</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, quantity: Math.max(0, formData.quantity - 1) })}
                className="w-12 py-2 bg-slate-700 text-white rounded-lg font-bold active:bg-slate-600 flex-shrink-0"
              >
                -1
              </button>
              <input
                type="text"
                value={formData.quantity}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setFormData({ ...formData, quantity: 0 });
                  } else {
                    const num = parseInt(val);
                    if (!isNaN(num) && num >= 0) {
                      setFormData({ ...formData, quantity: num });
                    }
                  }
                }}
                className="flex-1 min-w-0 bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 text-center focus:outline-none focus:border-amber-500"
                placeholder="0"
              />
              <button
                type="button"
                onClick={() => setFormData({ ...formData, quantity: formData.quantity + 1 })}
                className="w-12 py-2 bg-slate-700 text-white rounded-lg font-bold active:bg-slate-600 flex-shrink-0"
              >
                +1
              </button>
            </div>
          </div>

          {/* 名稱 */}
          <div>
            <label className="block text-[14px] text-slate-400 mb-2">名稱</label>
            <input
              type="text"
              value={formData.name_override || ''}
              onChange={(e) => setFormData({ ...formData, name_override: e.target.value })}
              className="w-full bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500"
              placeholder={characterItem.item?.name || '輸入名稱'}
            />
          </div>

          {/* 類別 */}
          <div>
            <label className="block text-[14px] text-slate-400 mb-2">類別</label>
            <select
              value={formData.category_override || ''}
              onChange={(e) => setFormData({ 
                ...formData, 
                category_override: e.target.value ? e.target.value as ItemCategory : null 
              })}
              className="w-full bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="">{characterItem.item?.category || '選擇類別'}</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-[14px] text-slate-300">
            <input
              type="checkbox"
              checked={!!formData.is_magic}
              onChange={(e) => setFormData({ ...formData, is_magic: e.target.checked })}
              className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500"
            />
            魔法物品
          </label>

          {/* 描述 */}
          <div>
            <label className="block text-[14px] text-slate-400 mb-2">描述</label>
            <textarea
              value={formData.description_override || ''}
              onChange={(e) => setFormData({ ...formData, description_override: e.target.value })}
              className="w-full bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500"
              placeholder={characterItem.item?.description || '輸入描述'}
              rows={6}
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
