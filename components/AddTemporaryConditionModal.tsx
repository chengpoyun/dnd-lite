/**
 * AddTemporaryConditionModal - 新增臨時狀態（角色頁面名稱欄位下方、六維屬性上方）
 * 必填：名稱；選填：持續時間、效果說明、是否影響角色數值（affects_stats + stat_bonuses）
 */

import React, { useEffect, useState } from 'react';
import { Modal, ModalInput } from './ui/Modal';
import { ModalSaveButton } from './ui/ModalSaveButton';
import { LoadingOverlay } from './ui/LoadingOverlay';
import { AutoResizeTextarea } from './ui/AutoResizeTextarea';
import { StatBonusEditor, type StatBonusEditorValue } from './StatBonusEditor';
import type { CreateTemporaryConditionData } from '../services/temporaryConditionService';
import { MODAL_CONTAINER_CLASS } from '../styles/modalStyles';

interface AddTemporaryConditionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTemporaryConditionData) => Promise<void>;
}

export const AddTemporaryConditionModal: React.FC<AddTemporaryConditionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [duration, setDuration] = useState('');
  const [description, setDescription] = useState('');
  const [affectsStats, setAffectsStats] = useState(false);
  const [statBonuses, setStatBonuses] = useState<StatBonusEditorValue>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setDuration('');
      setDescription('');
      setAffectsStats(false);
      setStatBonuses({});
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        duration: duration.trim(),
        description: description.trim(),
        affects_stats: affectsStats,
        stat_bonuses: affectsStats ? statBonuses : {},
      });
      onClose();
    } catch (error) {
      console.error('新增臨時狀態失敗:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" disableBackdropClose={isSubmitting}>
      <div className={`${MODAL_CONTAINER_CLASS} relative`}>
        <LoadingOverlay visible={isSubmitting} />
        <form onSubmit={handleSubmit} className="space-y-3">
          <h2 className="text-xl font-bold text-amber-500">新增臨時狀態</h2>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-sm text-slate-300 mb-1">名稱 *</label>
              <ModalInput value={name} onChange={setName} placeholder="例：中毒" />
            </div>
            <div className="flex-1">
              <label className="block text-sm text-slate-300 mb-1">持續時間</label>
              <ModalInput value={duration} onChange={setDuration} placeholder="例：1 分鐘" />
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1">效果說明</label>
            <AutoResizeTextarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="描述臨時狀態的效果..."
              minRows={3}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white outline-none"
            />
          </div>

          <div className="border border-slate-800 rounded-lg p-3 bg-slate-900/60 space-y-2">
            <label className="flex items-center gap-2 text-[14px] text-slate-200">
              <input
                type="checkbox"
                checked={affectsStats}
                onChange={(e) => setAffectsStats(e.target.checked)}
                className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500"
              />
              此臨時狀態會影響角色數值（能力調整值、豁免、技能、戰鬥數值）
            </label>
            {affectsStats && (
              <div className="mt-2 space-y-2">
                <p className="text-xs text-slate-500">
                  設定後，這些加值會自動套用；刪除此臨時狀態時會一併移除。
                </p>
                <StatBonusEditor value={statBonuses} onChange={setStatBonuses} />
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 rounded-lg bg-slate-700 text-slate-300 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              取消
            </button>
            <ModalSaveButton
              type="submit"
              loading={isSubmitting}
              className="flex-1 px-6 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold"
            >
              新增
            </ModalSaveButton>
          </div>
        </form>
      </div>
    </Modal>
  );
};
