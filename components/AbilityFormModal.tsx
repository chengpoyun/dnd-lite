import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { ModalSaveButton } from './ui/ModalSaveButton';
import { LoadingOverlay } from './ui/LoadingOverlay';
import { AbilityFormFields } from './ui/AbilityFormFields';
import { CreateAbilityData, getDisplayValues } from '../services/abilityService';
import type { CharacterAbilityWithDetails } from '../lib/supabase';
import { MODAL_CONTAINER_CLASS } from '../styles/modalStyles';
import { StatBonusEditor, type StatBonusEditorValue } from './StatBonusEditor';

interface AbilityFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateAbilityData & { maxUses?: number }) => Promise<void>;
  editingAbility?: CharacterAbilityWithDetails | null;
}

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
      setFormData({
        name: display.name,
        name_en: display.name_en || '',
        description: display.description,
        source: display.source,
        recovery_type: display.recovery_type,
        affects_stats: editingAbility.affects_stats ?? false,
        stat_bonuses: (editingAbility.stat_bonuses as CreateAbilityData['stat_bonuses']) ?? {},
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <AbilityFormFields
            name={formData.name}
            onNameChange={(value) => setFormData({ ...formData, name: value })}
            namePlaceholder="例：靈巧動作"
            nameEn={formData.name_en ?? ''}
            onNameEnChange={(value) => setFormData({ ...formData, name_en: value })}
            nameEnPlaceholder="例：Cunning Action"
            source={formData.source}
            onSourceChange={(value) => setFormData({ ...formData, source: value })}
            recoveryType={formData.recovery_type}
            onRecoveryTypeChange={(value) => setFormData({ ...formData, recovery_type: value })}
            description={formData.description}
            onDescriptionChange={(value) => setFormData({ ...formData, description: value })}
            descriptionLabel="效果說明"
            descriptionHint="（支援 Markdown 語法）"
            descriptionPlaceholder="描述特殊能力的效果和使用方式..."
            descriptionMinRows={5}
            maxUses={maxUses}
            onMaxUsesChange={setMaxUses}
            maxUsesLabel="最大使用次數 *"
          >
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
          </AbilityFormFields>
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
