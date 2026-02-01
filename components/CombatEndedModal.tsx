import React from 'react';
import { Modal } from './ui/Modal';
import {
  MODAL_CONTAINER_CLASS,
  BUTTON_PRIMARY_CLASS,
  INFO_BOX_CLASS
} from '../styles/modalStyles';

interface CombatEndedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
}

const CombatEndedModal: React.FC<CombatEndedModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = '⚔️ 戰鬥已結束',
  message = '此戰鬥已被其他用戶結束'
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className={MODAL_CONTAINER_CLASS}>
        <h2 className="text-xl font-bold mb-4 text-center">{title}</h2>

        <div className={`${INFO_BOX_CLASS} mb-6 text-center`}>
          <p className="text-blue-300 mb-2">
            {message}
          </p>
          {title === '⚔️ 戰鬥已結束' && (
            <p className="text-sm text-blue-200/70">
              系統將清除本地數據並返回首頁
            </p>
          )}
        </div>

        <button
          onClick={onConfirm}
          className={`w-full ${BUTTON_PRIMARY_CLASS}`}
        >
          確認
        </button>
      </div>
    </Modal>
  );
};

export default CombatEndedModal;
