import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import CombatService from '../services/combatService';
import type { ResistanceType } from '../lib/supabase';
import { DAMAGE_TYPES } from '../utils/damageTypes';
import { useToast } from '../hooks/useToast';
import {
  MODAL_CONTAINER_CLASS,
  INPUT_ROW_CLASS,
  INPUT_LABEL_CLASS,
  INPUT_CLASS,
  SELECT_CLASS,
  BUTTON_SECONDARY_CLASS,
  BUTTON_DANGER_CLASS,
  COLLAPSIBLE_BUTTON_CLASS,
  COLLAPSIBLE_CONTENT_CLASS,
  LOADING_OVERLAY_CLASS,
  LOADING_BOX_CLASS,
} from '../styles/modalStyles';

interface MonsterSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  monsterId: string;
  monsterNumber: number;
  monsterName: string;
  currentACRange: { min: number; max: number | null };
  currentMaxHP: number | null;
  currentResistances: Record<string, ResistanceType>;
  onSuccess: () => void;
  onConflict: () => Promise<boolean>;
}

const MonsterSettingsModal: React.FC<MonsterSettingsModalProps> = ({
  isOpen,
  onClose,
  monsterId,
  monsterNumber,
  monsterName,
  currentACRange,
  currentMaxHP,
  currentResistances,
  onSuccess,
  onConflict
}) => {
  const { showSuccess, showError } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // AC 設定
  const [knownAC, setKnownAC] = useState<string>(
    currentACRange.max !== null && currentACRange.min === currentACRange.max
      ? String(currentACRange.max)
      : ''
  );
  
  // HP 設定
  const [maxHP, setMaxHP] = useState<string>(
    currentMaxHP !== null && currentMaxHP >= 0 ? String(currentMaxHP) : ''
  );
  
  // 抗性設定
  const [resistances, setResistances] = useState<Record<string, ResistanceType>>({});
  const [showResistances, setShowResistances] = useState(false);

  // 初始化狀態
  useEffect(() => {
    if (isOpen) {
      setResistances(currentResistances || {});
      
      // 重新設定 AC
      if (currentACRange.max !== null && currentACRange.min === currentACRange.max) {
        setKnownAC(String(currentACRange.max));
      } else {
        setKnownAC('');
      }

      // 重新設定 HP
      if (currentMaxHP !== null && currentMaxHP >= 0) {
        setMaxHP(String(currentMaxHP));
      } else {
        setMaxHP('');
      }
    }
  }, [isOpen, currentResistances, currentACRange, currentMaxHP]);

  const resetForm = () => {
    setResistances({});
    setKnownAC('');
    setMaxHP('');
  };

  const handleSubmit = async () => {
    // 檢查版本衝突
    if (await onConflict()) {
      return;
    }

    setIsSubmitting(true);

    // 更新 AC（如果有變更）
    if (knownAC.trim()) {
      const acValue = parseInt(knownAC);
      if (!isNaN(acValue) && acValue >= 1 && acValue <= 99) {
        const acResult = await CombatService.updateACRange(monsterId, acValue, true);
        if (!acResult.success) {
          showError(acResult.error || '更新 AC 失敗');
          setIsSubmitting(false);
          return;
        }
      }
    }

    // 更新 HP（如果有變更）
    if (maxHP.trim()) {
      const hpValue = parseInt(maxHP);
      if (!isNaN(hpValue) && hpValue >= 1) {
        const hpResult = await CombatService.updateMaxHP(monsterId, hpValue);
        if (!hpResult.success) {
          showError(hpResult.error || '更新 HP 失敗');
          setIsSubmitting(false);
          return;
        }
      }
    } else {
      // 設為未知
      const hpResult = await CombatService.updateMaxHP(monsterId, null);
      if (!hpResult.success) {
        showError(hpResult.error || '更新 HP 失敗');
        setIsSubmitting(false);
        return;
      }
    }

    // 更新抗性（只保存非 normal 的）
    const resistancesToSave: Record<string, ResistanceType> = {};
    Object.entries(resistances).forEach(([type, resistance]: [string, ResistanceType]) => {
      if (resistance !== 'normal') {
        resistancesToSave[type] = resistance;
      }
    });

    if (Object.keys(resistancesToSave).length > 0) {
      const resistanceResult = await CombatService.updateMonsterResistances(monsterId, resistancesToSave);
      if (!resistanceResult.success) {
        showError(resistanceResult.error || '更新抗性失敗');
        setIsSubmitting(false);
        return;
      }
    }

    showSuccess('設定已更新');
    resetForm();
    onSuccess();
    onClose();
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className={MODAL_CONTAINER_CLASS}>
        {/* Loading 蓋版 */}
        {isSubmitting && (
          <div className={LOADING_OVERLAY_CLASS}>
            <div className={LOADING_BOX_CLASS}>
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-amber-500 border-t-transparent"></div>
                <span className="font-medium">更新中...</span>
              </div>
            </div>
          </div>
        )}

        <h2 className="text-xl font-bold mb-4">⚙️ {monsterName} #{monsterNumber} - 設定</h2>

        {/* AC 設定 */}
        <div className={INPUT_ROW_CLASS}>
          <label className={INPUT_LABEL_CLASS}>AC</label>
          <input
            type="number"
            value={knownAC}
            onChange={(e) => setKnownAC(e.target.value)}
            placeholder={
              currentACRange.max === null
                ? `${currentACRange.min} < AC`
                : currentACRange.min === currentACRange.max
                ? `${currentACRange.max}`
                : `${currentACRange.min} < AC <= ${currentACRange.max}`
            }
            className={INPUT_CLASS}
            min="1"
            max="99"
          />
        </div>

        {/* HP 設定 */}
        <div className={INPUT_ROW_CLASS}>
          <label className={INPUT_LABEL_CLASS}>最大 HP</label>
          <input
            type="number"
            value={maxHP}
            onChange={(e) => setMaxHP(e.target.value)}
            placeholder={currentMaxHP === null || currentMaxHP < 0 ? '未知' : `${currentMaxHP}`}
            className={INPUT_CLASS}
            min="1"
          />
        </div>

        {/* 抗性設定（可摘疊） */}
        <div className="mb-4">
          <button
            onClick={() => setShowResistances(!showResistances)}
            className={COLLAPSIBLE_BUTTON_CLASS}
          >
            <span className="text-slate-400 text-sm">🛡️ 已知抗性（可選）</span>
            <span className="text-slate-500">{showResistances ? '▲' : '▼'}</span>
          </button>

          {showResistances && (
            <div className={COLLAPSIBLE_CONTENT_CLASS}>
              <div className="space-y-2">
                {DAMAGE_TYPES.map(damageType => (
                  <div key={damageType.value} className="flex items-center justify-between">
                    <span className="text-sm">{damageType.emoji} {damageType.label}</span>
                    <select
                      value={resistances[damageType.value] || 'normal'}
                      onChange={(e) => setResistances({
                        ...resistances,
                        [damageType.value]: e.target.value as ResistanceType
                      })}
                      className={SELECT_CLASS}
                    >
                      <option value="normal">一般</option>
                      <option value="resistant">↓ 抗性</option>
                      <option value="vulnerable">↑ 易傷</option>
                      <option value="immune">⛔ 免疫</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}
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
          <button
            onClick={handleSubmit}
            className={BUTTON_DANGER_CLASS}
            disabled={isSubmitting}
          >
            確認更新
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default MonsterSettingsModal;
