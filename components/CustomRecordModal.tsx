/**
 * CustomRecordModal - 新增或編輯冒險紀錄（CustomRecord）
 */
import React from 'react';
import { Modal, ModalButton } from './ui/Modal';
import { MODAL_CONTAINER_CLASS, MODAL_BUTTON_CANCEL_CLASS, MODAL_FOOTER_BUTTONS_CLASS, INPUT_FULL_WIDTH_CLASS, MODAL_LABEL_CLASS, MODAL_SECTION_CLASS, MODAL_FIELD_CLASS, MODAL_BUTTON_APPLY_AMBER_CLASS } from '../styles/modalStyles';

interface CustomRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'add' | 'edit';
  name: string;
  value: string;
  note: string;
  onChangeName: (v: string) => void;
  onChangeValue: (v: string) => void;
  onChangeNote: (v: string) => void;
  onSave: () => void;
  onDelete?: () => void;
}

export default function CustomRecordModal({
  isOpen,
  onClose,
  mode,
  name,
  value,
  note,
  onChangeName,
  onChangeValue,
  onChangeNote,
  onSave,
  onDelete,
}: CustomRecordModalProps) {
  const title = mode === 'add' ? '新增紀錄' : '編輯紀錄';
  const saveLabel = mode === 'add' ? '新增' : '更新';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="xs">
      <div className={MODAL_CONTAINER_CLASS}>
        <div className={MODAL_SECTION_CLASS}>
          <div className={MODAL_FIELD_CLASS}>
            <label className={MODAL_LABEL_CLASS}>名稱</label>
            <input
              type="text"
              value={name}
              onChange={(e) => onChangeName(e.target.value)}
              className={INPUT_FULL_WIDTH_CLASS}
              placeholder={mode === 'add' ? '例如：皇家古生物學院' : undefined}
            />
          </div>
          <div className={MODAL_FIELD_CLASS}>
            <label className={MODAL_LABEL_CLASS}>數值</label>
            <input
              type="text"
              value={value}
              onChange={(e) => onChangeValue(e.target.value)}
              className={INPUT_FULL_WIDTH_CLASS}
              placeholder={mode === 'add' ? '例如：1' : undefined}
            />
          </div>
          <div className={MODAL_FIELD_CLASS}>
            <label className={MODAL_LABEL_CLASS}>備註 {mode === 'add' ? '(非必填)' : ''}</label>
            <textarea
              value={note}
              onChange={(e) => onChangeNote(e.target.value)}
              className={`${INPUT_FULL_WIDTH_CLASS} resize-none h-20`}
              placeholder={mode === 'add' ? '例如：階級一' : undefined}
            />
          </div>
        </div>
        <div className={MODAL_FOOTER_BUTTONS_CLASS}>
          <ModalButton variant="secondary" className={MODAL_BUTTON_CANCEL_CLASS} onClick={onClose}>
            取消
          </ModalButton>
          <ModalButton
            variant="primary"
            onClick={onSave}
            disabled={!name || !value}
            className={MODAL_BUTTON_APPLY_AMBER_CLASS}
          >
            {saveLabel}
          </ModalButton>
          {mode === 'edit' && onDelete && (
            <ModalButton variant="danger" onClick={onDelete}>
              刪除
            </ModalButton>
          )}
        </div>
      </div>
    </Modal>
  );
}
