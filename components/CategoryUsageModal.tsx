/**
 * CategoryUsageModal - 編輯分類使用次數（動作/附贈/反應的剩餘與每回合最大）
 */
import React, { useState, useEffect } from 'react';
import { Modal, ModalButton, ModalInput } from './ui/Modal';
import { ModalSaveButton } from './ui/ModalSaveButton';
import { LoadingOverlay } from './ui/LoadingOverlay';
import { handleValueInput } from '../utils/helpers';
import { MODAL_CONTAINER_CLASS, MODAL_BUTTON_CANCEL_CLASS, MODAL_FOOTER_BUTTONS_CLASS, MODAL_SECTION_CLASS, MODAL_PREVIEW_LABEL_CLASS, MODAL_BUTTON_APPLY_AMBER_CLASS } from '../styles/modalStyles';

export type CategoryUsageCategory = 'action' | 'bonus' | 'reaction';

interface CategoryUsageModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: CategoryUsageCategory | null;
  current: number;
  max: number;
  onSave: (current: number, max: number) => void;
}

const CATEGORY_LABELS: Record<CategoryUsageCategory, string> = {
  action: '動作使用次數',
  bonus: '附贈動作使用次數',
  reaction: '反應使用次數',
};

export default function CategoryUsageModal({
  isOpen,
  onClose,
  category,
  current,
  max,
  onSave,
}: CategoryUsageModalProps) {
  const [tempCurrent, setTempCurrent] = useState('');
  const [tempMax, setTempMax] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTempCurrent(current.toString());
      setTempMax(max.toString());
    }
  }, [isOpen, current, max]);

  const handleSave = () => {
    const currentResult = handleValueInput(tempCurrent, current, { minValue: 0, allowZero: true });
    const maxResult = handleValueInput(tempMax, max, { minValue: 1, allowZero: false });
    if (!currentResult.isValid || !maxResult.isValid) {
      onClose();
      return;
    }
    setIsSubmitting(true);
    const finalCurrent = Math.min(currentResult.numericValue, maxResult.numericValue);
    onSave(finalCurrent, maxResult.numericValue);
    onClose();
    setIsSubmitting(false);
  };

  if (!category) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xs" disableBackdropClose={isSubmitting}>
      <div className={`${MODAL_CONTAINER_CLASS} relative`}>
        <LoadingOverlay visible={isSubmitting} />
        <h2 className="text-xl font-bold mb-5">{CATEGORY_LABELS[category]}</h2>
        <div className={MODAL_SECTION_CLASS}>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <span className={`${MODAL_PREVIEW_LABEL_CLASS} block mb-1 text-center`}>剩餘次數</span>
              <ModalInput
                value={tempCurrent}
                onChange={setTempCurrent}
                className="text-xl font-mono text-center"
              />
            </div>
            <div className="space-y-1">
              <span className={`${MODAL_PREVIEW_LABEL_CLASS} block mb-1 text-center`}>每回合最大</span>
              <ModalInput
                value={tempMax}
                onChange={setTempMax}
                className="text-xl font-mono text-center"
              />
            </div>
          </div>
          <div className={MODAL_FOOTER_BUTTONS_CLASS}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className={`${MODAL_BUTTON_CANCEL_CLASS} px-4 py-2 rounded-xl font-bold bg-slate-800 hover:bg-slate-700 text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              取消
            </button>
            <ModalSaveButton type="button" onClick={handleSave} loading={isSubmitting} className={MODAL_BUTTON_APPLY_AMBER_CLASS}>
              儲存
            </ModalSaveButton>
          </div>
        </div>
      </div>
    </Modal>
  );
}
