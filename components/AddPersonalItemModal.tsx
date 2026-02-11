/**
 * AddPersonalItemModal - 新增個人物品（只存在於該角色，不寫入 global_items）
 * 必填：名稱、類別；選填：描述、數量
 */

import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import type { ItemCategory, CreateCharacterItemData } from '../services/itemService';
import { EQUIPMENT_KINDS, EQUIPMENT_KIND_LABELS } from '../utils/equipmentConstants';
import { MODAL_CONTAINER_CLASS, SELECT_CLASS } from '../styles/modalStyles';
import { StatBonusEditor, type StatBonusEditorValue } from './StatBonusEditor';

const CATEGORIES: ItemCategory[] = ['裝備', '藥水', 'MH素材', '雜項'];

interface AddPersonalItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCharacterItemData) => Promise<void>;
  /** 預填名稱（例如從獲得物品搜尋欄帶入） */
  initialName?: string;
}

export const AddPersonalItemModal: React.FC<AddPersonalItemModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialName,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ItemCategory>('裝備');
  const [description, setDescription] = useState('');
  const [isMagic, setIsMagic] = useState(false);
  const [equipmentKind, setEquipmentKind] = useState<string>('');
  const [affectsStats, setAffectsStats] = useState(false);
  const [statBonuses, setStatBonuses] = useState<StatBonusEditorValue>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(initialName ?? '');
      if (category === '裝備' && !equipmentKind) {
        setEquipmentKind(EQUIPMENT_KINDS[0]);
      }
      setAffectsStats(false);
      setStatBonuses({});
    }
  }, [isOpen, initialName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (category === '裝備' && !equipmentKind) return;

    setIsSubmitting(true);
    try {
      const data: CreateCharacterItemData = {
        name: name.trim(),
        category,
        description: description.trim() || undefined,
        quantity: 1,
        is_magic: isMagic,
      };
      if (category === '裝備') {
        data.equipment_kind_override = equipmentKind || null;
      }
      if (affectsStats) {
        data.affects_stats = true;
        data.stat_bonuses = statBonuses;
      }
      await onSubmit(data);
      setName('');
      setDescription('');
      setCategory('裝備');
      setIsMagic(false);
      setEquipmentKind('');
      setAffectsStats(false);
      setStatBonuses({});
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
              onChange={(e) => {
                const c = e.target.value as ItemCategory;
                setCategory(c);
                if (c !== '裝備') {
                  setEquipmentKind('');
                } else if (!equipmentKind) {
                  setEquipmentKind(EQUIPMENT_KINDS[0]);
                }
              }}
              className="w-full bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          {category === '裝備' && (
            <>
              <div>
                <label className="block text-[14px] text-slate-400 mb-2">裝備類型 *</label>
                <select
                  value={equipmentKind}
                  onChange={(e) => {
                    const k = e.target.value;
                    setEquipmentKind(k);
                  }}
                  className={`${SELECT_CLASS} w-full`}
                >
                  {EQUIPMENT_KINDS.map((k) => (
                    <option key={k} value={k}>{EQUIPMENT_KIND_LABELS[k]}</option>
                  ))}
                </select>
              </div>
            </>
          )}
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
          {/* 影響角色數值設定（放在 modal 尾端） */}
          <div className="border border-slate-800 rounded-lg p-3 bg-slate-900/60 space-y-2">
            <label className="flex items-center gap-2 text-[14px] text-slate-200">
              <input
                type="checkbox"
                checked={affectsStats}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setAffectsStats(checked);
                  if (!checked) {
                    setStatBonuses({});
                  }
                }}
                className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500"
              />
              這個物品會影響角色數值（能力調整值、豁免、技能、戰鬥數值）
            </label>
            {affectsStats && (
              <div className="mt-2 space-y-2">
                <p className="text-xs text-slate-500">
                  設定後，角色持有此物品時，這些加值會自動套用並在角色卡與戰鬥頁的加值列表中顯示來源。
                </p>
                <StatBonusEditor
                  value={statBonuses}
                  onChange={(next) => setStatBonuses(next)}
                />
              </div>
            )}
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
