/**
 * MulticlassAddModal - 新增單一兼職（選擇職業與等級）
 */
import React from 'react';
import { Modal, ModalButton } from './ui/Modal';
import { MODAL_CONTAINER_CLASS, MODAL_BUTTON_CANCEL_CLASS, MODAL_FOOTER_BUTTONS_CLASS, SELECT_CLASS, MODAL_LABEL_SECONDARY_CLASS, MODAL_SECTION_CLASS, MODAL_FIELD_CLASS, MODAL_INPUT_NUMBER_LG_CLASS, MODAL_PREVIEW_BOX_CLASS, MODAL_BUTTON_APPLY_EMERALD_CLASS } from '../styles/modalStyles';

interface MulticlassAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  newClassName: string;
  newClassLevel: string;
  onNewClassNameChange: (v: string) => void;
  onNewClassLevelChange: (v: string) => void;
  availableClasses: string[];
  usedClassNames: string[];
  onAdd: () => void;
}

export default function MulticlassAddModal({
  isOpen,
  onClose,
  newClassName,
  newClassLevel,
  onNewClassNameChange,
  onNewClassLevelChange,
  availableClasses,
  usedClassNames,
  onAdd,
}: MulticlassAddModalProps) {
  const options = availableClasses.filter((name) => !usedClassNames.includes(name));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="新增兼職" size="xs">
      <div className={MODAL_CONTAINER_CLASS}>
        <div className={MODAL_SECTION_CLASS}>
          <div className={MODAL_FIELD_CLASS}>
            <label className={MODAL_LABEL_SECONDARY_CLASS}>選擇職業</label>
            <select
              value={newClassName}
              onChange={(e) => onNewClassNameChange(e.target.value)}
              className={`w-full ${SELECT_CLASS} px-4 py-3 text-white text-base rounded-xl`}
            >
              <option value="">選擇職業...</option>
              {options.map((className) => (
                <option key={className} value={className}>{className}</option>
              ))}
            </select>
          </div>
          <div className={MODAL_FIELD_CLASS}>
            <label className={MODAL_LABEL_SECONDARY_CLASS}>等級</label>
            <input
              type="number"
              min={1}
              max={20}
              value={newClassLevel}
              onChange={(e) => onNewClassLevelChange(e.target.value)}
              className={MODAL_INPUT_NUMBER_LG_CLASS}
              placeholder="1"
            />
          </div>
          {newClassName && (
            <div className={MODAL_PREVIEW_BOX_CLASS}>
              <div className="text-sm text-slate-400 mb-1">預覽:</div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">{newClassName}</span>
                <span className="text-slate-400 text-sm font-mono">LV {newClassLevel || 1}</span>
              </div>
            </div>
          )}
        </div>
        <div className={MODAL_FOOTER_BUTTONS_CLASS}>
          <ModalButton variant="secondary" className={MODAL_BUTTON_CANCEL_CLASS} onClick={onClose}>
            取消
          </ModalButton>
          <ModalButton
            variant="primary"
            onClick={onAdd}
            disabled={!newClassName}
            className={`${MODAL_BUTTON_APPLY_EMERALD_CLASS} disabled:!bg-slate-700 disabled:!text-slate-500`}
          >
            新增兼職
          </ModalButton>
        </div>
      </div>
    </Modal>
  );
}
