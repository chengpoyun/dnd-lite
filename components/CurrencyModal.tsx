/**
 * CurrencyModal - 金幣 (GP) 編輯
 */
import React from 'react';
import { Modal, ModalButton, ModalInput } from './ui/Modal';
import { handleDecimalInput, formatDecimal } from '../utils/helpers';
import { MODAL_CONTAINER_CLASS, MODAL_BUTTON_CANCEL_CLASS, MODAL_FOOTER_BUTTONS_CLASS, MODAL_LABEL_AMBER_CLASS, MODAL_SECTION_CLASS, MODAL_PREVIEW_LABEL_CLASS, MODAL_PREVIEW_ROW_CLASS, MODAL_BUTTON_APPLY_AMBER_CLASS } from '../styles/modalStyles';

interface CurrencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  value: string;
  onChange: (value: string) => void;
  currentGp: number;
  onApply: (numericValue: number) => void;
}

export default function CurrencyModal({
  isOpen,
  onClose,
  value,
  onChange,
  currentGp,
  onApply,
}: CurrencyModalProps) {
  const result = handleDecimalInput(value, currentGp, { minValue: 0, allowZero: true, decimalPlaces: 2 });
  const gpPreview = result.isValid ? result.numericValue : currentGp;

  const handleApply = () => {
    if (result.isValid && gpPreview >= 0) {
      onApply(gpPreview);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="修改資金" size="xs">
      <div className={MODAL_CONTAINER_CLASS}>
        <div className={MODAL_SECTION_CLASS}>
          <div className="space-y-1">
            <label className={MODAL_LABEL_AMBER_CLASS}>持有金幣 (GP)</label>
            <ModalInput
              value={value}
              onChange={onChange}
              placeholder={formatDecimal(currentGp)}
              className="w-full mt-1 text-3xl font-mono text-center text-amber-500"
              autoFocus
            />
          </div>
          <div className="text-center mt-2">
            <span className={MODAL_PREVIEW_LABEL_CLASS}>計算結果</span>
            <div className={MODAL_PREVIEW_ROW_CLASS}>
              <span className="text-slate-400 font-[14px]">{formatDecimal(currentGp)}</span>
              <span className="text-slate-600">→</span>
              <span className="text-amber-500 text-2xl">{formatDecimal(gpPreview)}</span>
            </div>
          </div>
        </div>
        <div className={MODAL_FOOTER_BUTTONS_CLASS}>
          <ModalButton variant="secondary" className={MODAL_BUTTON_CANCEL_CLASS} onClick={onClose}>
            取消
          </ModalButton>
          <ModalButton variant="primary" onClick={handleApply} className={MODAL_BUTTON_APPLY_AMBER_CLASS}>
            套用
          </ModalButton>
        </div>
      </div>
    </Modal>
  );
}
