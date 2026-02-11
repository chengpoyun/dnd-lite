/**
 * DowntimeModal - 修整期天數編輯
 */
import React from 'react';
import { Modal, ModalButton, ModalInput } from './ui/Modal';
import { handleValueInput } from '../utils/helpers';
import { MODAL_CONTAINER_CLASS, MODAL_BUTTON_CANCEL_CLASS, MODAL_FOOTER_BUTTONS_CLASS, MODAL_PREVIEW_LABEL_CLASS, MODAL_PREVIEW_ROW_CLASS, MODAL_BUTTON_APPLY_AMBER_CLASS } from '../styles/modalStyles';

interface DowntimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  value: string;
  onChange: (value: string) => void;
  currentDowntime: number;
  onApply: (numericValue: number) => void;
}

export default function DowntimeModal({
  isOpen,
  onClose,
  value,
  onChange,
  currentDowntime,
  onApply,
}: DowntimeModalProps) {
  const result = handleValueInput(value, currentDowntime, { minValue: 0, allowZero: true });
  const preview = result.isValid ? result.numericValue : currentDowntime;

  const handleApply = () => {
    if (result.isValid) {
      onApply(result.numericValue);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="修整期" size="xs">
      <div className={MODAL_CONTAINER_CLASS}>
        <div className="text-center mb-4">
          <ModalInput
            value={value}
            onChange={onChange}
            placeholder={currentDowntime.toString()}
            className="w-full text-4xl font-mono text-center text-white"
            autoFocus
          />
          <div className="text-center mt-3">
            <span className={MODAL_PREVIEW_LABEL_CLASS}>預覽結果</span>
            <div className={MODAL_PREVIEW_ROW_CLASS}>
              <span className="text-slate-400">{currentDowntime}</span>
              <span className="text-slate-600">→</span>
              <span className="text-white text-2xl">{preview} 天</span>
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
