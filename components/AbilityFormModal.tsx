import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { ModalSaveButton } from './ui/ModalSaveButton';
import { LoadingOverlay } from './ui/LoadingOverlay';
import { CreateAbilityData, getDisplayValues, ABILITY_SOURCE_ORDER } from '../services/abilityService';
import type { CharacterAbilityWithDetails } from '../lib/supabase';
import { MODAL_CONTAINER_CLASS } from '../styles/modalStyles';
import { StatBonusEditor, type StatBonusEditorValue } from './StatBonusEditor';

interface AbilityFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateAbilityData & { maxUses?: number }) => Promise<void>;
  editingAbility?: CharacterAbilityWithDetails | null;
}

const SOURCES = [...ABILITY_SOURCE_ORDER];
const RECOVERY_TYPES = ['常駐', '短休', '長休'] as const;

export const AbilityFormModal: React.FC<AbilityFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingAbility,
}) => {
  const [formData, setFormData] = useState<CreateAbilityData>({
    name: '',
    name_en: '',
    description: '',
    source: '職業',
    recovery_type: '長休',
    affects_stats: false,
    stat_bonuses: {},
  });
  const [maxUses, setMaxUses] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingAbility) {
      const display = getDisplayValues(editingAbility);
      const ca: any = editingAbility as any;
      const abilityRaw: any = (editingAbility as any).ability;
      const overrideBonuses = ca.stat_bonuses;
      const hasOverrideStats =
        (typeof ca.affects_stats === 'boolean' && ca.affects_stats) ||
        (overrideBonuses && typeof overrideBonuses === 'object' && Object.keys(overrideBonuses).length > 0);
      setFormData({
        name: display.name,
        name_en: display.name_en || '',
        description: display.description,
        source: display.source,
        recovery_type: display.recovery_type,
        // 有角色專屬覆寫時，優先使用 character_abilities 上的欄位；否則回退到 abilities 表
        affects_stats: hasOverrideStats
          ? (ca.affects_stats ?? false)
          : (abilityRaw?.affects_stats ?? false),
        stat_bonuses: hasOverrideStats
          ? (overrideBonuses ?? {})
          : ((abilityRaw?.stat_bonuses ?? {}) || {}),
      });
      setMaxUses(editingAbility.max_uses);
    } else {
      // 重置表單
      setFormData({
        name: '',
        name_en: '',
        description: '',
        source: '職業',
        recovery_type: '長休',
        affects_stats: false,
        stat_bonuses: {},
      });
      setMaxUses(0);
    }
  }, [editingAbility, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 驗證必填欄位（編輯自己的能力時效果說明為非必填）
    if (!formData.name) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({ ...formData, maxUses });
      onClose();
    } catch (error) {
      console.error('提交特殊能力失敗:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      disableBackdropClose={isSubmitting}
    >
      <div className={`${MODAL_CONTAINER_CLASS} relative`}>
        <LoadingOverlay visible={isSubmitting} />
        <h2 className="text-xl font-bold mb-5">編輯特殊能力</h2>

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
          <label className="block text-[14px] text-slate-400 mb-2">
            英文名稱
          </label>
          <input
            type="text"
            value={formData.name_en ?? ''}
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

        {/* 效果說明（編輯自己的能力時為非必填） */}
        <div>
          <label className="block text-[14px] text-slate-400 mb-2">
            效果說明
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
        {/* 影響角色數值設定（置於效果說明下方） */}
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
            這個能力會影響角色數值（能力調整值、豁免、技能、戰鬥數值）
          </label>
          {formData.affects_stats && (
            <div className="mt-2 space-y-2">
              <p className="text-xs text-slate-500">
                設定後，角色擁有此能力時，這些加值會自動套用並在角色卡與戰鬥檢視的加值列表中顯示來源。
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

        {/* 最大使用次數 */}
        {formData.recovery_type !== '常駐' && (
          <div>
            <label className="block text-[14px] text-slate-400 mb-2">
              最大使用次數 *
              <span className="text-slate-500 ml-2 text-[12px]">(設為 0 表示無限次)</span>
            </label>
            <input
              type="number"
              min="0"
              value={maxUses}
              onChange={(e) => setMaxUses(parseInt(e.target.value) || 0)}
              className="w-full bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>
        )}
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
          <ModalSaveButton
            type="submit"
            loading={isSubmitting}
            className="flex-1 px-6 py-3 text-white rounded-lg transition-colors font-medium bg-blue-600 hover:bg-blue-700"
          >
            更新
          </ModalSaveButton>
        </div>
      </form>
      </div>
    </Modal>
  );
};
