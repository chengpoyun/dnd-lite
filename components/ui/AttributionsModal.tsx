import React from 'react';
import { Modal, ModalButton } from './Modal';
import {
  MODAL_CONTAINER_CLASS,
  MODAL_FOOTER_BUTTONS_CLASS,
  MODAL_BUTTON_APPLY_AMBER_CLASS,
} from '../../styles/modalStyles';
import { ATTRIBUTIONS } from '../../data/attributions';

interface AttributionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 素材來源與授權清單，資料集中在 data/attributions.ts，
 * 之後新增來源只要加陣列項目，不用動這個 Modal 或關於頁的排版。
 */
export const AttributionsModal: React.FC<AttributionsModalProps> = ({
  isOpen,
  onClose,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className={MODAL_CONTAINER_CLASS}>
        <h2 className="text-xl font-bold mb-4 text-amber-500">素材來源與授權</h2>
        <ul className="space-y-2 mb-5 text-sm text-slate-300">
          {ATTRIBUTIONS.map((item, index) => (
            <li key={index}>
              {item.url ? (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-slate-100 underline"
                >
                  {item.text}
                </a>
              ) : (
                item.text
              )}
            </li>
          ))}
        </ul>
        <div className={MODAL_FOOTER_BUTTONS_CLASS}>
          <ModalButton variant="primary" className={MODAL_BUTTON_APPLY_AMBER_CLASS} onClick={onClose}>
            關閉
          </ModalButton>
        </div>
      </div>
    </Modal>
  );
};
