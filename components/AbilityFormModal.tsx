import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { CreateAbilityData } from '../services/abilityService';
import type { Ability, CharacterAbilityWithDetails } from '../lib/supabase';

interface AbilityFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateAbilityData & { maxUses?: number }) => Promise<void>;
  editingAbility?: CharacterAbilityWithDetails | null;
}

const SOURCES = ['種族', '職業', '專長', '背景', '其他'] as const;
const RECOVERY_TYPES = ['常駐', '短休', '長休'] as const;

export const AbilityFormModal: React.FC<AbilityFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingAbility
}) => {
  const [formData, setFormData] = useState<CreateAbilityData & { maxUses: number }>({
    name: '',
    name_en: '',
    description: '',
    source: '職業',
    recovery_type: '長休',
    maxUses: 0
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingAbility) {
      setFormData({
        name: editingAbility.ability.name,
        name_en: editingAbility.ability.name_en,
        description: editingAbility.ability.description,
        source: editingAbility.ability.source,
        recovery_type: editingAbility.ability.recovery_type,
        maxUses: editingAbility.max_uses
      });
    } else {
      // 重置表單
      setFormData({
        name: '',
        name_en: '',
        description: '',
        source: '職業',
        recovery_type: '長休',
        maxUses: 0
      });
    }
  }, [editingAbility, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 驗證必填欄位
    if (!formData.name || !formData.name_en || !formData.description) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('提交特殊能力失敗:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPassive = formData.recovery_type === '常駐';

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      title={editingAbility ? '編輯特殊能力' : '新增特殊能力'}
      size="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 中文名稱 */}
        <div>
          <label className="block text-[14px] text-slate-400 mb-2">名稱 *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500"
            placeholder="例：靈巧動作"
          />
        </div>

        {/* 英文名稱 */}
        <div>
          <label className="block text-[14px] text-slate-400 mb-2">英文名稱 *</label>
          <input
            type="text"
            value={formData.name_en}
            onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
            className="w-full bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500"
            placeholder="例：Cunning Action"
          />
        </div>

        {/* 來源和恢復規則 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[14px] text-slate-400 mb-2">來源 *</label>
            <select
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value as any })}
              className="w-full bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500"
            >
              {SOURCES.map(source => (
                <option key={source} value={source}>{source}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[14px] text-slate-400 mb-2">恢復規則 *</label>
            <select
              value={formData.recovery_type}
              onChange={(e) => setFormData({ ...formData, recovery_type: e.target.value as any })}
              className="w-full bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500"
            >
              {RECOVERY_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 最大使用次數（非常駐才顯示） */}
        {!isPassive && (
          <div>
            <label className="block text-[14px] text-slate-400 mb-2">
              最大使用次數
              <span className="text-slate-500 ml-2 text-[12px]">（設為 0 表示無限次）</span>
            </label>
            <input
              type="number"
              min="0"
              value={formData.maxUses}
              onChange={(e) => setFormData({ ...formData, maxUses: parseInt(e.target.value) || 0 })}
              className="w-full bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>
        )}

        {/* 效果說明 */}
        <div>
          <label className="block text-[14px] text-slate-400 mb-2">
            效果說明 *
            <span className="text-slate-500 ml-2 text-[12px]">（支援 Markdown 語法）</span>
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={8}
            className="w-full bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500 resize-y"
            placeholder="描述特殊能力的效果和使用方式..."
          />
        </div>

        {/* 操作按鈕 */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors font-medium"
            disabled={isSubmitting}
          >
            取消
          </button>
          <button
            type="submit"
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSubmitting}
          >
            {isSubmitting ? '處理中...' : (editingAbility ? '更新' : '新增')}
          </button>
        </div>
      </form>
    </Modal>
  );
};
