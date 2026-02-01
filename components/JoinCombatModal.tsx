import React, { useState } from 'react';
import { Modal } from './ui/Modal';

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
      <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">🚪 加入戰鬥</h2>

        {/* 說明 */}
        <div className="mb-4 p-3 bg-blue-900/30 border border-blue-700 rounded-lg text-sm text-blue-300">
          💡 輸入隊友分享的 3 位數戰鬥代碼，即可加入同一場戰鬥並共同編輯怪物資訊
        </div>

        {/* 輸入框 */}
        <div className="mb-6">
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
            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-center text-3xl font-mono tracking-wider focus:outline-none focus:border-amber-500"
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
            className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors disabled:opacity-50"
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
