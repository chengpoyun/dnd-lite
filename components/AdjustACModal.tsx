import React, { useState } from 'react';
import { Modal } from './ui/Modal';
import CombatService from '../services/combatService';
import { useToast } from '../hooks/useToast';

interface AdjustACModalProps {
  isOpen: boolean;
  onClose: () => void;
  monsterId: string;
  monsterNumber: number;
  currentACRange: { min: number; max: number | null }
  onSuccess: () => void;
  onConflict: () => Promise<boolean>;
}

const AdjustACModal: React.FC<AdjustACModalProps> = ({
  isOpen,
  onClose,
  monsterId,
  monsterNumber,
  currentACRange,
  onSuccess,
  onConflict
}) => {
  const { showSuccess, showError } = useToast();
  const [attackRoll, setAttackRoll] = useState('');
  const [isHit, setIsHit] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setAttackRoll('');
    setIsHit(null);
  };

  const handleSubmit = async () => {
    const roll = parseInt(attackRoll);
    
    if (isNaN(roll) || roll < 1 || roll > 99) {
      showError('請輸入有效的攻擊骰結果 (1-99)');
      return;
    }

    if (isHit === null) {
      showError('請選擇命中或未命中');
      return;
    }

    // 檢查版本衝突
    if (await onConflict()) {
      return;
    }

    setIsSubmitting(true);

    const result = await CombatService.updateACRange(monsterId, roll, isHit);

    if (result.success && result.newRange) {
      const rangeText = result.newRange.max === null
        ? `${result.newRange.min} < AC`
        : result.newRange.min + 1 === result.newRange.max
        ? `AC = ${result.newRange.max}`
        : `${result.newRange.min} < AC <= ${result.newRange.max}`;
      showSuccess(`AC 範圍已更新：${rangeText}`);
      resetForm();
      onSuccess();
      onClose();
    } else {
      showError(result.error || '更新 AC 範圍失敗');
    }

    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full relative">
        {/* Loading 蓋版 */}
        {isSubmitting && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-[130] rounded-xl flex items-center justify-center">
            <div className="bg-slate-800 px-6 py-4 rounded-lg shadow-2xl border border-slate-700">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-amber-500 border-t-transparent"></div>
                <span className="font-medium">更新中...</span>
              </div>
            </div>
          </div>
        )}

        <h2 className="text-xl font-bold mb-4">🎯 怪物 #{monsterNumber} - 調整 AC 範圍</h2>

        {/* 目前範圍 */}
        <div className="mb-4 p-3 bg-slate-900 rounded-lg">
          <span className="text-slate-400 text-sm">目前範圍：</span>
          <span className="ml-2 text-lg font-mono text-blue-400">
            {currentACRange.max === null
              ? `${currentACRange.min} < AC`
              : currentACRange.min + 1 === currentACRange.max
              ? `AC = ${currentACRange.max}`
              : `${currentACRange.min} < AC <= ${currentACRange.max}`
            }
          </span>
        </div>

        {/* 說明 */}
        <div className="mb-4 p-3 bg-blue-900/30 border border-blue-700 rounded-lg text-sm text-blue-300">
          💡 輸入攻擊骰結果（包含所有加值後的總和），選擇命中或未命中，系統會自動縮小 AC 範圍
        </div>

        {/* 攻擊骰輸入 */}
        <div className="mb-4">
          <label className="block text-sm text-slate-400 mb-2">攻擊骰結果（含加值）</label>
          <input
            type="number"
            value={attackRoll}
            onChange={(e) => setAttackRoll(e.target.value)}
            placeholder="例如：18"
            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-center text-2xl font-mono focus:outline-none focus:border-amber-500"
            min="1"
            max="99"
          />
        </div>

        {/* 命中選擇 */}
        <div className="mb-6">
          <label className="block text-sm text-slate-400 mb-2">結果</label>
          <div className="flex gap-3">
            <button
              onClick={() => setIsHit(true)}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                isHit === true
                  ? 'bg-green-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              ✅ 命中
            </button>
            <button
              onClick={() => setIsHit(false)}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                isHit === false
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              ❌ 未命中
            </button>
          </div>
        </div>

        {/* 操作按鈕 */}
        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-colors"
            disabled={isSubmitting}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors disabled:opacity-50"
            disabled={isSubmitting || !attackRoll || isHit === null}
          >
            更新範圍
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AdjustACModal;
