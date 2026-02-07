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

  // 怪物名稱（編輯後會套用至同 session 內所有同名怪物）
  const [nameInput, setNameInput] = useState<string>(monsterName);

  // AC 範圍：ac_min、ac_max，顯示為 [ac_min] < AC <= [ac_max]
  const [acMinInput, setAcMinInput] = useState<string>(String(currentACRange.min));
  const [acMaxInput, setAcMaxInput] = useState<string>(
    currentACRange.max !== null ? String(currentACRange.max) : ''
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
      setNameInput(monsterName);
      setResistances(currentResistances || {});
      setAcMinInput(String(currentACRange.min));
      setAcMaxInput(currentACRange.max !== null ? String(currentACRange.max) : '');

      // 重新設定 HP
      if (currentMaxHP !== null && currentMaxHP >= 0) {
        setMaxHP(String(currentMaxHP));
      } else {
        setMaxHP('');
      }
    }
  }, [isOpen, monsterName, currentResistances, currentACRange, currentMaxHP]);

  const resetForm = () => {
    setNameInput(monsterName);
    setResistances({});
    setAcMinInput('0');
    setAcMaxInput('99');
    setMaxHP('');
  };

  const handleSubmit = async () => {
    // 檢查版本衝突
    if (await onConflict()) {
      return;
    }

    setIsSubmitting(true);

    // 更新怪物名稱：會套用至同 session 內所有同名怪物
    if (nameInput.trim() && nameInput.trim() !== monsterName) {
      const nameResult = await CombatService.updateMonsterName(monsterId, nameInput.trim());
      if (!nameResult.success) {
        showError(nameResult.error || '更新名稱失敗');
        setIsSubmitting(false);
        return;
      }
    }

    // 更新 AC 範圍：使用者輸入的 ac_min、ac_max 強制覆蓋當前值
    const acMin = parseInt(acMinInput.trim(), 10);
    const acMax = parseInt(acMaxInput.trim(), 10);
    if (acMinInput.trim() !== '' && acMaxInput.trim() !== '' && !isNaN(acMin) && !isNaN(acMax)) {
      const acResult = await CombatService.setACRange(monsterId, acMin, acMax);
      if (!acResult.success) {
        showError(acResult.error || '更新 AC 範圍失敗');
        setIsSubmitting(false);
        return;
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

        <h2 className="text-xl font-bold mb-4">⚙️ #{monsterNumber} - 設定</h2>

        {/* 怪物名稱：編輯後會套用至同 session 內所有同名怪物 */}
        <div className={INPUT_ROW_CLASS}>
          <label className={INPUT_LABEL_CLASS}>怪物名稱</label>
          <input
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="名稱"
            className={INPUT_CLASS}
          />
        </div>

        {/* 一列 [ac_min] < AC <= [ac_max]，填寫後儲存會強制覆蓋當前值；input 應撐滿整行 */}
        <div className={`${INPUT_ROW_CLASS} flex-nowrap w-full items-center`}>
          <input
            type="number"
            value={acMinInput}
            onChange={(e) => setAcMinInput(e.target.value)}
            placeholder="min"
            className={`${INPUT_CLASS} text-center mx-1`}
            min="0"
            max="99"
            style={{ flex: '1 1 0%' }}
          />
          <span className="text-sm font-medium text-slate-300 shrink-0">&lt; AC &lt;=</span>
          <input
            type="number"
            value={acMaxInput}
            onChange={(e) => setAcMaxInput(e.target.value)}
            placeholder="max"
            className={`${INPUT_CLASS} text-center mx-1`}
            min="0"
            max="99"
            style={{ flex: '1 1 0%' }}
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
