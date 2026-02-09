/**
 * EndCombatConfirmModal - 結束戰鬥確認
 */
import React from 'react';
import { Modal, ModalButton } from './ui/Modal';
import { MODAL_BUTTON_CANCEL_CLASS } from '../styles/modalStyles';

interface EndCombatConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function EndCombatConfirmModal({
  isOpen,
  onClose,
  onConfirm,
}: EndCombatConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="結束戰鬥" size="xs">
      <p className="text-slate-500 text-[16px] text-center mb-6">
        確定要結束當前戰鬥嗎？這將重置戰鬥計時器並恢復所有每回合資源。
      </p>
      <div className="flex gap-3">
        <ModalButton variant="secondary" className={MODAL_BUTTON_CANCEL_CLASS} onClick={onClose}>
          取消
        </ModalButton>
        <ModalButton variant="danger" onClick={onConfirm}>
          結束戰鬥
        </ModalButton>
      </div>
    </Modal>
  );
}
