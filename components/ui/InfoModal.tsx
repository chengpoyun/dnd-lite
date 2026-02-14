import React from 'react';
import { Modal } from './Modal';
import {
  MODAL_CONTAINER_CLASS,
  MODAL_BODY_TEXT_CLASS,
  MODAL_FOOTER_BUTTONS_CLASS,
  MODAL_BUTTON_APPLY_AMBER_CLASS,
} from '../../styles/modalStyles';

interface InfoModalProps {
  isOpen: boolean;
  /** 訊息內容 */
  message: string;
  /** 選填標題 */
  title?: string;
  /** 按「確定」或關閉時呼叫 */
  onClose: () => void;
}

/**
 * 小型訊息視窗，僅顯示訊息與「確定」按鈕，供提示用（如：物品已存在、數量+1）。
 */
export const InfoModal: React.FC<InfoModalProps> = ({
  isOpen,
  message,
  title,
  onClose,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className={MODAL_CONTAINER_CLASS}>
        {title && (
          <h2 className="text-xl font-bold mb-4 text-amber-500">{title}</h2>
        )}
        <p className={`${MODAL_BODY_TEXT_CLASS} text-center mb-5`}>{message}</p>
        <div className={MODAL_FOOTER_BUTTONS_CLASS}>
          <button
            onClick={onClose}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${MODAL_BUTTON_APPLY_AMBER_CLASS} text-white`}
          >
            確定
          </button>
        </div>
      </div>
    </Modal>
  );
};
