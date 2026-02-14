/**
 * CombatNoteModal - 戰鬥筆記編輯彈窗
 */

import React, { useState, useEffect } from 'react';
import { Modal, ModalButton } from './ui/Modal';
import { ModalSaveButton } from './ui/ModalSaveButton';
import { LoadingOverlay } from './ui/LoadingOverlay';
import { MODAL_CONTAINER_CLASS, INPUT_FULL_WIDTH_CLASS, MODAL_BUTTON_CANCEL_CLASS, MODAL_SECTION_CLASS, MODAL_FOOTER_BUTTONS_CLASS } from '../styles/modalStyles';

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setValue(initialValue);
    }
  }, [isOpen, initialValue]);

  const handleSave = async () => {
    const trimmed = value.trim();
    setIsSubmitting(true);
    try {
      const success = await onSave(trimmed || null);
      if (success) onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      const success = await onSave(null);
      if (success) onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setValue(initialValue);
    onClose();
  };

  const hasContent = initialValue.trim().length > 0;

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} title="戰鬥筆記" size="md" disableBackdropClose={isSubmitting}>
      <div className={`${MODAL_CONTAINER_CLASS} relative`}>
        <LoadingOverlay visible={isSubmitting} />
        <div className={MODAL_SECTION_CLASS}>
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="點擊新增筆記..."
            rows={6}
            className={`${INPUT_FULL_WIDTH_CLASS} resize-none min-h-[120px] rounded-xl`}
          />
          <div className={`${MODAL_FOOTER_BUTTONS_CLASS} pt-2`}>
            <ModalSaveButton type="button" onClick={handleSave} loading={isSubmitting} className="min-w-0 truncate">
              儲存
            </ModalSaveButton>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSubmitting}
              className={`${MODAL_BUTTON_CANCEL_CLASS} min-w-0 truncate px-4 py-2 rounded-xl font-bold bg-slate-800 hover:bg-slate-700 text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              取消
            </button>
            {hasContent && (
              <ModalButton variant="danger" onClick={handleDelete} disabled={isSubmitting} className="min-w-0 truncate">
                刪除
              </ModalButton>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
