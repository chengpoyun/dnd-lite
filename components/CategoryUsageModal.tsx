/**
 * CategoryUsageModal - 編輯分類使用次數（動作/附贈/反應的剩餘與每回合最大）
 */
import React, { useState, useEffect } from 'react';
import { Modal, ModalButton, ModalInput } from './ui/Modal';
import { handleValueInput } from '../utils/helpers';
import { MODAL_CONTAINER_CLASS } from '../styles/modalStyles';

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
    const finalCurrent = Math.min(currentResult.numericValue, maxResult.numericValue);
    onSave(finalCurrent, maxResult.numericValue);
    onClose();
  };

  if (!category) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xs">
      <div className={`${MODAL_CONTAINER_CLASS} relative`}>
        <h2 className="text-xl font-bold mb-5">{CATEGORY_LABELS[category]}</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-[16px] text-slate-500 font-black block mb-1 uppercase tracking-widest text-center">剩餘次數</span>
              <ModalInput
                value={tempCurrent}
                onChange={setTempCurrent}
                className="text-xl font-mono text-center"
              />
            </div>
            <div>
              <span className="text-[16px] text-slate-500 font-black block mb-1 uppercase tracking-widest text-center">每回合最大</span>
              <ModalInput
                value={tempMax}
                onChange={setTempMax}
                className="text-xl font-mono text-center"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <ModalButton variant="secondary" onClick={onClose}>
              取消
            </ModalButton>
            <ModalButton variant="primary" onClick={handleSave}>
              儲存
            </ModalButton>
          </div>
        </div>
      </div>
    </Modal>
  );
}
