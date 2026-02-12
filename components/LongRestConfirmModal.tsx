/**
 * LongRestConfirmModal - 長休確認
 */
import React from 'react';
import { Modal, ModalButton } from './ui/Modal';
import { MODAL_CONTAINER_CLASS, MODAL_BUTTON_CANCEL_CLASS, MODAL_FOOTER_BUTTONS_CLASS, MODAL_BUTTON_APPLY_INDIGO_CLASS, MODAL_DESCRIPTION_CLASS } from '../styles/modalStyles';

interface LongRestConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function LongRestConfirmModal({
  isOpen,
  onClose,
  onConfirm,
}: LongRestConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="確定要長休？" size="xs">
      <div className={MODAL_CONTAINER_CLASS}>
        <p className={`${MODAL_DESCRIPTION_CLASS} text-center mb-6`}>
          這將完全恢復 HP、重置所有法術位與職業資源。
        </p>
        <div className={MODAL_FOOTER_BUTTONS_CLASS}>
          <ModalButton variant="secondary" className={MODAL_BUTTON_CANCEL_CLASS} onClick={onClose}>
            返回
          </ModalButton>
          <ModalButton variant="primary" onClick={onConfirm} className={MODAL_BUTTON_APPLY_INDIGO_CLASS}>
            確認長休
          </ModalButton>
        </div>
      </div>
    </Modal>
  );
}
