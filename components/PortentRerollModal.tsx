/**
 * PortentRerollModal - 長休後輸入新的預言骰數值
 * 不可透過背景點擊關閉，避免忘記輸入導致骰值卡在舊資料
 */
import React, { useEffect, useState } from 'react';
import { Modal, ModalButton, ModalInput } from './ui/Modal';
import { MODAL_CONTAINER_CLASS, MODAL_FOOTER_BUTTONS_CLASS, MODAL_DESCRIPTION_CLASS, MODAL_LABEL_CLASS, MODAL_BUTTON_APPLY_AMBER_CLASS } from '../styles/modalStyles';

interface PortentRerollModalProps {
  isOpen: boolean;
  diceCount: number;
  onSubmit: (values: number[]) => void;
}

const isValidDieValue = (value: string): boolean => {
  const n = parseInt(value, 10);
  return Number.isInteger(n) && n >= 1 && n <= 20;
};

export default function PortentRerollModal({
  isOpen,
  diceCount,
  onSubmit,
}: PortentRerollModalProps) {
  const [values, setValues] = useState<string[]>(() => Array(diceCount).fill(''));

  useEffect(() => {
    if (isOpen) {
      setValues(Array(diceCount).fill(''));
    }
  }, [isOpen, diceCount]);

  const allValid = values.length === diceCount && values.every(isValidDieValue);

  const handleApply = () => {
    if (!allValid) return;
    onSubmit(values.map((v) => parseInt(v, 10)));
  };

  return (
    <Modal isOpen={isOpen} onClose={() => {}} title="長休：輸入新的預言骰" size="xs" disableBackdropClose>
      <div className={MODAL_CONTAINER_CLASS}>
        <p className={`${MODAL_DESCRIPTION_CLASS} text-center mb-4`}>
          請輸入本次長休重新擲出的 {diceCount} 顆 d20 數值（1～20）
        </p>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {values.map((value, i) => (
            <div key={i} className="space-y-1">
              <label className={`${MODAL_LABEL_CLASS} block text-center`}>骰{i + 1}</label>
              <ModalInput
                value={value}
                onChange={(v) => setValues((prev) => prev.map((p, idx) => (idx === i ? v : p)))}
                placeholder="1-20"
                className={`text-center font-mono ${value && !isValidDieValue(value) ? '!border-rose-500' : ''}`}
              />
            </div>
          ))}
        </div>
        <div className={MODAL_FOOTER_BUTTONS_CLASS}>
          <ModalButton
            variant="primary"
            onClick={handleApply}
            disabled={!allValid}
            className={`${MODAL_BUTTON_APPLY_AMBER_CLASS} w-full`}
          >
            套用
          </ModalButton>
        </div>
      </div>
    </Modal>
  );
}
