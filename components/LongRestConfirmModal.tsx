/**
 * LongRestConfirmModal - 長休確認
 */
import React from 'react';
import { Modal, ModalButton } from './ui/Modal';

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
      <p className="text-slate-500 text-[16px] text-center mb-6">
        這將完全恢復 HP、重置所有法術位與職業資源。
      </p>
      <div className="flex gap-3">
        <ModalButton variant="secondary" onClick={onClose}>
          返回
        </ModalButton>
        <ModalButton variant="primary" onClick={onConfirm} className="bg-indigo-600 hover:bg-indigo-500">
          確認長休
        </ModalButton>
      </div>
    </Modal>
  );
}
