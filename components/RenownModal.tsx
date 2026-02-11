/**
 * RenownModal - 名聲（使用 / 累計）編輯
 */
import React from 'react';
import { Modal, ModalButton, ModalInput } from './ui/Modal';
import { handleValueInput } from '../utils/helpers';
import { MODAL_CONTAINER_CLASS, MODAL_BUTTON_CANCEL_CLASS, MODAL_FOOTER_BUTTONS_CLASS, MODAL_LABEL_CLASS, MODAL_SECTION_CLASS, MODAL_FIELD_CLASS, MODAL_BUTTON_APPLY_AMBER_CLASS } from '../styles/modalStyles';

interface RenownModalProps {
  isOpen: boolean;
  onClose: () => void;
  usedValue: string;
  totalValue: string;
  onChangeUsed: (value: string) => void;
  onChangeTotal: (value: string) => void;
  currentUsed: number;
  currentTotal: number;
  onApply: (used: number, total: number) => void;
}

export default function RenownModal({
  isOpen,
  onClose,
  usedValue,
  totalValue,
  onChangeUsed,
  onChangeTotal,
  currentUsed,
  currentTotal,
  onApply,
}: RenownModalProps) {
  const usedResult = handleValueInput(usedValue, currentUsed, { minValue: 0, allowZero: true });
  const totalResult = handleValueInput(totalValue, currentTotal, { minValue: 0, allowZero: true });
  const usedPreview = usedResult.isValid ? usedResult.numericValue : currentUsed;
  const totalPreview = totalResult.isValid ? totalResult.numericValue : currentTotal;

  const handleApply = () => {
    if (usedResult.isValid && totalResult.isValid) {
      onApply(usedPreview, totalPreview);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="名聲" size="xs">
      <div className={MODAL_CONTAINER_CLASS}>
        <div className={MODAL_SECTION_CLASS}>
          <div className={MODAL_FIELD_CLASS}>
            <label className={MODAL_LABEL_CLASS}>名聲 (使用)</label>
            <ModalInput
              value={usedValue}
              onChange={onChangeUsed}
              placeholder={currentUsed.toString()}
              className="w-full text-2xl font-mono text-center text-white"
              autoFocus
            />
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="text-[14px] text-slate-600 font-bold">{currentUsed}</span>
              <span className="text-[14px] text-slate-700">→</span>
              <span className={`text-[14px] font-black ${usedPreview > totalPreview ? 'text-rose-400' : 'text-emerald-400'}`}>
                {usedPreview}
              </span>
            </div>
          </div>
          <div className={MODAL_FIELD_CLASS}>
            <label className={MODAL_LABEL_CLASS}>名聲 (累計)</label>
            <ModalInput
              value={totalValue}
              onChange={onChangeTotal}
              placeholder={currentTotal.toString()}
              className="w-full text-2xl font-mono text-center text-amber-500"
            />
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="text-[14px] text-slate-600 font-bold">{currentTotal}</span>
              <span className="text-[14px] text-slate-700">→</span>
              <span className="text-[14px] font-black text-amber-500">{totalPreview}</span>
            </div>
          </div>
        </div>
        <div className={MODAL_FOOTER_BUTTONS_CLASS}>
          <ModalButton variant="secondary" className={MODAL_BUTTON_CANCEL_CLASS} onClick={onClose}>
            取消
          </ModalButton>
          <ModalButton variant="primary" onClick={handleApply} className={MODAL_BUTTON_APPLY_AMBER_CLASS}>
            儲存
          </ModalButton>
        </div>
      </div>
    </Modal>
  );
}
