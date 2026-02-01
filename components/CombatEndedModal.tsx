import React from 'react';
import { Modal } from './ui/Modal';

interface CombatEndedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const CombatEndedModal: React.FC<CombatEndedModalProps> = ({
  isOpen,
  onClose,
  onConfirm
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-slate-800 rounded-xl p-6 max-w-sm w-full">
        <h2 className="text-xl font-bold mb-4 text-center">⚔️ 戰鬥已結束</h2>

        <div className="mb-6 p-4 bg-slate-900 rounded-lg text-center">
          <p className="text-slate-300 mb-2">
            此戰鬥已被其他用戶結束
          </p>
          <p className="text-sm text-slate-400">
            系統將清除本地數據並返回首頁
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-colors"
          >
            查看最終狀態
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
          >
            返回首頁
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default CombatEndedModal;
