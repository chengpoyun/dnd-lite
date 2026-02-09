/**
 * CombatNoteModal - 戰鬥筆記編輯彈窗
 */

import React, { useState, useEffect } from 'react';
import { Modal, ModalButton } from './ui/Modal';
import { MODAL_CONTAINER_CLASS, INPUT_FULL_WIDTH_CLASS, MODAL_BUTTON_CANCEL_CLASS } from '../styles/modalStyles';

interface CombatNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialValue: string;
  onSave: (value: string | null) => Promise<boolean>;
}

export default function CombatNoteModal({
  isOpen,
  onClose,
  initialValue,
  onSave,
}: CombatNoteModalProps) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (isOpen) {
      setValue(initialValue);
    }
  }, [isOpen, initialValue]);

  const handleSave = async () => {
    const trimmed = value.trim();
    const success = await onSave(trimmed || null);
    if (success) {
      onClose();
    }
  };

  const handleDelete = async () => {
    const success = await onSave(null);
    if (success) {
      onClose();
    }
  };

  const handleCancel = () => {
    setValue(initialValue);
    onClose();
  };

  const hasContent = initialValue.trim().length > 0;

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} title="戰鬥筆記" size="md">
      <div className={MODAL_CONTAINER_CLASS}>
        <div className="space-y-4">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="點擊新增筆記..."
            rows={6}
            className={`${INPUT_FULL_WIDTH_CLASS} resize-none min-h-[120px] rounded-xl`}
          />
          <div className={`grid gap-2 pt-2 ${hasContent ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <ModalButton variant="primary" onClick={handleSave} className="min-w-0 truncate">
              儲存
            </ModalButton>
            <ModalButton variant="secondary" onClick={handleCancel} className={`${MODAL_BUTTON_CANCEL_CLASS} min-w-0 truncate`}>
              取消
            </ModalButton>
            {hasContent && (
              <ModalButton variant="danger" onClick={handleDelete} className="min-w-0 truncate">
                刪除
              </ModalButton>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
