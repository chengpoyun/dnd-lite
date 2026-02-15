import React, { useState } from 'react';
import { Modal } from './ui/Modal';
import { ModalSaveButton } from './ui/ModalSaveButton';
import { LoadingOverlay } from './ui/LoadingOverlay';
import CombatService from '../services/combatService';
import { useToast } from '../hooks/useToast';
import {
  MODAL_CONTAINER_CLASS,
  INPUT_CLASS,
  BUTTON_PRIMARY_CLASS,
  BUTTON_SECONDARY_CLASS,
  INFO_BOX_CLASS
} from '../styles/modalStyles';

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

    setIsSubmitting(true);

    // 檢查版本衝突
    if (await onConflict()) {
      setIsSubmitting(false);
      return;
    }

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
    <Modal isOpen={isOpen} onClose={handleClose} disableBackdropClose={isSubmitting}>
      <div className={`${MODAL_CONTAINER_CLASS} relative`}>
        <LoadingOverlay visible={isSubmitting} text="更新中…" />

        <h2 className="text-xl font-bold mb-4">🎯 怪物 #{monsterNumber} - 調整 AC </h2>

        {/* 說明 */}
        <div className={INFO_BOX_CLASS}>
          💡 輸入攻擊骰結果（包含所有加值後的總和），選擇命中或未命中，系統會自動縮小 AC 範圍
        </div>

        {/* 攻擊骰輸入 + 命中選擇 */}
        <div className="mt-4 mb-3">
          <label className="block text-sm text-slate-400 mb-2">攻擊骰結果（含加值）</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsHit(false)}
              className={`w-12 h-12 rounded-lg text-2xl transition-colors shrink-0 ${
                isHit === false
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
              title="未命中"
            >
              ❌
            </button>
            <input
              type="number"
              value={attackRoll}
              onChange={(e) => setAttackRoll(e.target.value)}
              className={`flex-1 ${INPUT_CLASS} text-center text-2xl font-mono`}
              min="1"
              max="99"
            />
            <button
              onClick={() => setIsHit(true)}
              className={`w-12 h-12 rounded-lg text-2xl transition-colors shrink-0 ${
                isHit === true
                  ? 'bg-green-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
              title="命中"
            >
              ✅
            </button>
          </div>
        </div>

        {/* 目前範圍 */}
        <div className="mb-6 p-3 bg-slate-900 rounded-lg">
          <span className="text-slate-400 text-sm">目前範圍：</span>
          <span className="ml-2 text-lg font-mono text-blue-400">
            {currentACRange.min === 0 && currentACRange.max === 99
              ? '?'
              : currentACRange.max === null
              ? `${currentACRange.min} < AC`
              : currentACRange.min + 1 === currentACRange.max
              ? `AC = ${currentACRange.max}`
              : `${currentACRange.min} < AC <= ${currentACRange.max}`
            }
          </span>
        </div>

        {/* 操作按鈕 */}
        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className={BUTTON_SECONDARY_CLASS}
            disabled={isSubmitting}
          >
            取消
          </button>
          <ModalSaveButton
            type="button"
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={!attackRoll || isHit === null}
            className={BUTTON_PRIMARY_CLASS}
          >
            更新範圍
          </ModalSaveButton>
        </div>
      </div>
    </Modal>
  );
};

export default AdjustACModal;
