/**
 * PortentUseConfirmModal - 確認使用預言骰
 */
import React from 'react';
import { Modal, ModalButton } from './ui/Modal';
import { MODAL_CONTAINER_CLASS, MODAL_BUTTON_CANCEL_CLASS, MODAL_FOOTER_BUTTONS_CLASS, MODAL_DESCRIPTION_CLASS } from '../styles/modalStyles';

interface PortentUseConfirmModalProps {
  isOpen: boolean;
  dieValue: number | null;
  onClose: () => void;
  onConfirm: () => void;
}

export default function PortentUseConfirmModal({
  isOpen,
  dieValue,
  onClose,
  onConfirm,
}: PortentUseConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="確定使用預言骰？" size="xs">
      <div className={MODAL_CONTAINER_CLASS}>
        <p className={`${MODAL_DESCRIPTION_CLASS} text-center mb-6`}>
          使用數值 {dieValue} 的預言骰，取代一次攻擊、豁免或檢定擲骰。使用後無法復原，直到下次長休重骰。
        </p>
        <div className={MODAL_FOOTER_BUTTONS_CLASS}>
          <ModalButton variant="secondary" className={MODAL_BUTTON_CANCEL_CLASS} onClick={onClose}>
            取消
          </ModalButton>
          <ModalButton variant="primary" onClick={onConfirm} className="!bg-purple-600 hover:!bg-purple-500">
            確定使用
          </ModalButton>
        </div>
      </div>
    </Modal>
  );
}
