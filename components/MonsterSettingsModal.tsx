import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import CombatService from '../services/combatService';
import type { ResistanceType } from '../lib/supabase';
import { DAMAGE_TYPES } from '../utils/damageTypes';
import { useToast } from '../hooks/useToast';

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
  
  // 共用樣式
  const inputRowClass = "flex items-center gap-2 mb-3";
  const labelClass = "text-sm font-medium text-slate-300 w-20 shrink-0";
  const inputClass = "w-[calc(100%-5.5rem)] px-3 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:bg-slate-700";
  
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
      <div className="bg-slate-800 rounded-xl px-3 py-3 max-w-md w-full relative">
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

        <h2 className="text-xl font-bold mb-4">⚙️ {monsterName} #{monsterNumber} - 設定</h2>

        {/* AC 設定 */}
        <div className={inputRowClass}>
          <label className={labelClass}>AC</label>
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
            className={inputClass}
            min="1"
            max="99"
          />
        </div>

        {/* HP 設定 */}
        <div className={inputRowClass}>
          <label className={labelClass}>最大 HP</label>
          <input
            type="number"
            value={maxHP}
            onChange={(e) => setMaxHP(e.target.value)}
            placeholder={currentMaxHP === null || currentMaxHP < 0 ? '未知' : `${currentMaxHP}`}
            className={inputClass}
            min="1"
          />
        </div>

        {/* 抗性設定（可摘疊） */}
        <div className="mb-4">
          <button
            onClick={() => setShowResistances(!showResistances)}
            className="w-full flex items-center justify-between p-3 bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors text-left"
          >
            <span className="text-slate-400 text-sm">🛡️ 已知抗性（可選）</span>
            <span className="text-slate-500">{showResistances ? '▲' : '▼'}</span>
          </button>

          {showResistances && (
            <div className="mt-2 p-3 bg-slate-900 rounded-lg max-h-64 overflow-y-auto">
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
                      className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-sm focus:outline-none focus:border-amber-500"
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
            className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-colors"
            disabled={isSubmitting}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded-lg font-medium transition-colors disabled:opacity-50"
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
