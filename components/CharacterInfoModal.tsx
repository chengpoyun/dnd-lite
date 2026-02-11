/**
 * CharacterInfoModal - 編輯角色名稱與職業/等級（含兼職列表）
 */
import React from 'react';
import { Modal, ModalButton } from './ui/Modal';
import { MODAL_CONTAINER_CLASS, MODAL_BUTTON_CANCEL_CLASS, MODAL_FOOTER_BUTTONS_CLASS, INPUT_FULL_WIDTH_CLASS, SELECT_CLASS, MODAL_LABEL_CLASS, MODAL_SECTION_CLASS, MODAL_FIELD_CLASS, MODAL_INPUT_NUMBER_SM_CLASS, MODAL_BUTTON_REMOVE_ICON_CLASS, MODAL_BUTTON_ADD_ROW_CLASS, MODAL_BUTTON_APPLY_AMBER_CLASS } from '../styles/modalStyles';

export type EditClassRow = { id: string; name: string; level: number; isPrimary: boolean };

interface CharacterInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  editInfo: { name: string; class: string; level: string };
  setEditInfo: (v: { name: string; class: string; level: string }) => void;
  editClasses: EditClassRow[];
  availableClasses: string[];
  updateEditClass: (index: number, field: 'name' | 'level', value: string | number) => void;
  removeEditClass: (index: number) => void;
  addNewEditClass: () => void;
  totalLevel: number;
  onSave: () => void;
}

export default function CharacterInfoModal({
  isOpen,
  onClose,
  editInfo,
  setEditInfo,
  editClasses,
  availableClasses,
  updateEditClass,
  removeEditClass,
  addNewEditClass,
  totalLevel,
  onSave,
}: CharacterInfoModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="編輯角色資料" size="xs">
      <div className={MODAL_CONTAINER_CLASS}>
        <div className={MODAL_SECTION_CLASS}>
          <div className={MODAL_FIELD_CLASS}>
            <label className={MODAL_LABEL_CLASS}>名稱</label>
            <input
              type="text"
              value={editInfo.name}
              onChange={(e) => setEditInfo({ ...editInfo, name: e.target.value })}
              className={INPUT_FULL_WIDTH_CLASS}
            />
          </div>
          <div className="space-y-2">
            <label className={MODAL_LABEL_CLASS}>職業與等級</label>
            <div className="space-y-2">
              {editClasses.map((classInfo, index) => (
                <div key={classInfo.id || index} className="flex items-center gap-2">
                  <select
                    value={classInfo.name}
                    onChange={(e) => updateEditClass(index, 'name', e.target.value)}
                    className={`flex-1 ${SELECT_CLASS} px-3 py-2 text-white text-sm`}
                  >
                    {availableClasses
                      .filter((className) => className === classInfo.name || !editClasses.some((c) => c.name === className))
                      .map((className) => (
                        <option key={className} value={className}>{className}</option>
                      ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={classInfo.level}
                    onChange={(e) => updateEditClass(index, 'level', e.target.value)}
                    className={MODAL_INPUT_NUMBER_SM_CLASS}
                  />
                  {editClasses.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEditClass(index)}
                      className={MODAL_BUTTON_REMOVE_ICON_CLASS}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addNewEditClass}
                className={MODAL_BUTTON_ADD_ROW_CLASS}
              >
                +
              </button>
              <div className="text-center pt-2 border-t border-slate-700">
                <span className="text-xs text-slate-500">總等級: LV {totalLevel}</span>
              </div>
            </div>
          </div>
          <div className={`${MODAL_FOOTER_BUTTONS_CLASS} pt-4`}>
            <ModalButton variant="secondary" className={MODAL_BUTTON_CANCEL_CLASS} onClick={onClose}>
              取消
            </ModalButton>
            <ModalButton variant="primary" onClick={onSave} className={MODAL_BUTTON_APPLY_AMBER_CLASS}>
              儲存
            </ModalButton>
          </div>
        </div>
      </div>
    </Modal>
  );
}
