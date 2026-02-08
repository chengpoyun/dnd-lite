/**
 * CombatHPModal - 編輯當前 HP / 最大 HP（雙欄位、運算式）
 */
import React, { useState, useEffect } from 'react';
import { Modal, ModalButton, ModalInput } from './ui/Modal';
import { handleValueInput } from '../utils/helpers';
import { MODAL_CONTAINER_CLASS } from '../styles/modalStyles';

interface CombatHPModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentHP: number;
  maxHP: number;
  onSave: (current: number, max: number) => void;
}

export default function CombatHPModal({
  isOpen,
  onClose,
  currentHP,
  maxHP,
  onSave,
}: CombatHPModalProps) {
  const [tempCurrent, setTempCurrent] = useState('');
  const [tempMax, setTempMax] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTempCurrent('');
      setTempMax('');
    }
  }, [isOpen]);

  const handleApply = () => {
    let finalCurrent = currentHP;
    if (tempCurrent.trim()) {
      const result = handleValueInput(tempCurrent, currentHP, {
        minValue: 0,
        maxValue: maxHP,
        allowZero: true,
      });
      finalCurrent = result.isValid ? result.numericValue : currentHP;
    }
    let finalMax = maxHP;
    if (tempMax.trim()) {
      const result = handleValueInput(tempMax, maxHP, {
        minValue: 1,
        allowZero: false,
      });
      finalMax = result.isValid ? result.numericValue : maxHP;
    }
    finalCurrent = Math.min(finalCurrent, finalMax);
    onSave(finalCurrent, finalMax);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className={`${MODAL_CONTAINER_CLASS} relative`}>
        <h2 className="text-xl font-bold mb-5">修改 HP</h2>
        <div className="space-y-4">
          <div>
            <span className="text-[16px] text-slate-500 font-black block mb-2 uppercase tracking-widest">當前HP</span>
            <ModalInput
              value={tempCurrent}
              onChange={setTempCurrent}
              placeholder={currentHP.toString()}
              className="text-3xl font-mono text-center"
              autoFocus
            />
          </div>
          <div>
            <span className="text-[16px] text-slate-500 font-black block mb-2 uppercase tracking-widest">最大HP</span>
            <ModalInput
              value={tempMax}
              onChange={setTempMax}
              placeholder={maxHP.toString()}
              className="text-3xl font-mono text-center"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <ModalButton
            variant="secondary"
            onClick={() => {
              setTempCurrent('');
              setTempMax('');
              onClose();
            }}
          >
            取消
          </ModalButton>
          <ModalButton variant="primary" onClick={handleApply}>
            套用
          </ModalButton>
        </div>
      </div>
    </Modal>
  );
}
