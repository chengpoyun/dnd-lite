import React, { useState } from 'react';
import { Modal } from './ui/Modal';
import {
  MODAL_CONTAINER_CLASS,
  INPUT_CLASS,
  BUTTON_PRIMARY_CLASS,
  BUTTON_SECONDARY_CLASS,
  INFO_BOX_CLASS
} from '../styles/modalStyles';

interface JoinCombatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoin: (code: string) => void;
}

const JoinCombatModal: React.FC<JoinCombatModalProps> = ({
  isOpen,
  onClose,
  onJoin
}) => {
  const [code, setCode] = useState('');

  const handleSubmit = () => {
    const trimmedCode = code.trim();
    
    // 驗證：必須是 3 位數字
    if (!/^\d{3}$/.test(trimmedCode)) {
      return;
    }

    onJoin(trimmedCode);
    setCode('');
  };

  const handleClose = () => {
    setCode('');
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className={MODAL_CONTAINER_CLASS}>
        <h2 className="text-xl font-bold mb-4">🚪 加入戰鬥</h2>

        {/* 說明 */}
        <div className={INFO_BOX_CLASS}>
          💡 輸入隊友分享的 3 位數戰鬥代碼，即可加入同一場戰鬥並共同編輯怪物資訊
        </div>

        {/* 輸入框 */}
        <div className="mt-4 mb-6">
          <label className="block text-sm text-slate-400 mb-2">戰鬥 ID（3位數字）</label>
          <input
            type="text"
            value={code}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 3);
              setCode(value);
            }}
            onKeyPress={handleKeyPress}
            placeholder="例如：527"
            className={`${INPUT_CLASS} text-center text-3xl font-mono tracking-wider`}
            maxLength={3}
            autoFocus
          />
          <div className="mt-2 text-xs text-slate-500 text-center">
            {code.length}/3 位數字
          </div>
        </div>

        {/* 操作按鈕 */}
        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className={BUTTON_SECONDARY_CLASS}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className={BUTTON_PRIMARY_CLASS}
            disabled={code.length !== 3}
          >
            加入戰鬥
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default JoinCombatModal;
