/**
 * InfoLinkFormModal - 新增／編輯資訊連結（僅標題與網址兩個欄位）
 */
import React, { useState, useEffect } from 'react';
import { Modal, ModalButton } from './ui/Modal';
import {
  MODAL_CONTAINER_CLASS,
  MODAL_LABEL_BLOCK_CLASS,
  INPUT_FULL_WIDTH_CLASS,
  MODAL_FOOTER_BUTTONS_CLASS,
  MODAL_BUTTON_CANCEL_CLASS,
  MODAL_BUTTON_APPLY_AMBER_CLASS,
} from '../styles/modalStyles';

interface InfoLinkFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTitle?: string;
  initialUrl?: string;
  onSave: (data: { title: string; url: string }) => void;
}

export default function InfoLinkFormModal({
  isOpen,
  onClose,
  initialTitle = '',
  initialUrl = '',
  onSave,
}: InfoLinkFormModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [url, setUrl] = useState(initialUrl);

  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle);
      setUrl(initialUrl);
    }
  }, [isOpen, initialTitle, initialUrl]);

  const canSave = title.trim().length > 0 && url.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave({ title: title.trim(), url: url.trim() });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialTitle ? '編輯連結' : '新增連結'} size="sm">
      <div className={MODAL_CONTAINER_CLASS}>
        <div className="mb-4">
          <label className={MODAL_LABEL_BLOCK_CLASS}>標題</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="異常狀態說明"
            className={INPUT_FULL_WIDTH_CLASS}
            autoFocus
          />
        </div>
        <div className="mb-4">
          <label className={MODAL_LABEL_BLOCK_CLASS}>網址</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className={INPUT_FULL_WIDTH_CLASS}
          />
        </div>
        <div className={MODAL_FOOTER_BUTTONS_CLASS}>
          <ModalButton variant="secondary" className={MODAL_BUTTON_CANCEL_CLASS} onClick={onClose}>
            取消
          </ModalButton>
          <ModalButton variant="primary" className={MODAL_BUTTON_APPLY_AMBER_CLASS} onClick={handleSave} disabled={!canSave}>
            儲存
          </ModalButton>
        </div>
      </div>
    </Modal>
  );
}
