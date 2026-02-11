/**
 * ExpModal - 經驗值編輯，顯示當前等級與下一等級所需 EXP
 */
import React from 'react';
import { Modal, ModalButton, ModalInput } from './ui/Modal';
import { handleValueInput } from '../utils/helpers';
import { getLevelFromExp, getNextLevelExp } from '../utils/expLevelUtils';
import { MODAL_CONTAINER_CLASS, MODAL_BUTTON_CANCEL_CLASS, MODAL_FOOTER_BUTTONS_CLASS, MODAL_LABEL_EMERALD_CLASS, MODAL_PREVIEW_LABEL_CLASS, MODAL_PREVIEW_DESC_CLASS, MODAL_BUTTON_APPLY_EMERALD_CLASS } from '../styles/modalStyles';

interface ExpModalProps {
  isOpen: boolean;
  onClose: () => void;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  onApply: (numericValue: number) => void;
}

export default function ExpModal({
  isOpen,
  onClose,
  value,
  onChange,
  placeholder,
  onApply,
}: ExpModalProps) {
  const currentExp = parseFloat(placeholder) || 0;
  const result = handleValueInput(value, currentExp, { minValue: 0, allowZero: true });
  const expPreview = result.isValid ? result.numericValue : currentExp;
  const { exp: nextExp, isMaxLevel } = getNextLevelExp(expPreview);

  const handleApply = () => {
    if (result.isValid) {
      onApply(result.numericValue);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="修改經驗值" size="xs">
      <div className={MODAL_CONTAINER_CLASS}>
        <div className="mb-4">
          <label className={`block mb-1 ${MODAL_LABEL_EMERALD_CLASS}`}>經驗值 (EXP)</label>
          <ModalInput
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="text-3xl font-mono text-center text-emerald-400 w-full"
            autoFocus
          />
        </div>
        <div className="text-center mt-2 mb-4">
          <span className={MODAL_PREVIEW_LABEL_CLASS}>計算結果</span>
          <div className="flex items-center justify-center text-lg font-bold mt-1">
            <span className="text-emerald-400 text-2xl">{expPreview} (Lv {getLevelFromExp(expPreview)})</span>
          </div>
          <p className={MODAL_PREVIEW_DESC_CLASS}>
            下一等級所需累計經驗: {nextExp.toLocaleString()}
            {isMaxLevel && ' （已滿級）'}
          </p>
        </div>
        <div className={MODAL_FOOTER_BUTTONS_CLASS}>
          <ModalButton variant="secondary" className={MODAL_BUTTON_CANCEL_CLASS} onClick={onClose}>
            取消
          </ModalButton>
          <ModalButton variant="primary" onClick={handleApply} className={MODAL_BUTTON_APPLY_EMERALD_CLASS}>
            套用
          </ModalButton>
        </div>
      </div>
    </Modal>
  );
}
