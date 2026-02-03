import React, { useState } from 'react';
import { Modal } from './ui/Modal';
import type { ResistanceType } from '../lib/supabase';
import { DAMAGE_TYPES } from '../utils/damageTypes';
import { useToast } from '../hooks/useToast';
import {
  MODAL_CONTAINER_CLASS,
  INPUT_ROW_CLASS,
  INPUT_LABEL_CLASS,
  INPUT_CLASS,
  SELECT_CLASS,
  BUTTON_PRIMARY_CLASS,
  BUTTON_SECONDARY_CLASS,
  COLLAPSIBLE_BUTTON_CLASS,
  COLLAPSIBLE_CONTENT_CLASS,
  LOADING_OVERLAY_CLASS,
  LOADING_BOX_CLASS,
} from '../styles/modalStyles';

interface AddMonsterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (name: string, count: number, knownAC: number | null, maxHP: number | null, resistances: Record<string, ResistanceType>) => Promise<void>;
}

const AddMonsterModal: React.FC<AddMonsterModalProps> = ({
  isOpen,
  onClose,
  onConfirm
}) => {
  const { showError } = useToast();
  const [name, setName] = useState('怪物');
  const [count, setCount] = useState('1');
  const [knownAC, setKnownAC] = useState('');
  const [maxHP, setMaxHP] = useState('');
  const [showResistances, setShowResistances] = useState(false);
  const [resistances, setResistances] = useState<Record<string, ResistanceType>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setName('怪物');
    setCount('1');
    setKnownAC('');
    setMaxHP('');
    setShowResistances(false);
    setResistances({});
  };

  const handleResistanceChange = (damageType: string, resistance: ResistanceType) => {
    if (resistance === 'normal') {
      // 移除「一般」抗性（不需要保存）
      const newResistances = { ...resistances };
      delete newResistances[damageType];
      setResistances(newResistances);
    } else {
      setResistances({ ...resistances, [damageType]: resistance });
    }
  };

  const handleSubmit = async () => {
    // 驗證名稱
    if (!name.trim()) {
      showError('請輸入怪物名稱');
      return;
    }

    // 驗證數量
    const countNum = parseInt(count);
    if (isNaN(countNum) || countNum < 1) {
      showError('請輸入有效的數量（至少 1）');
      return;
    }

    // 驗證 AC
    let acValue: number | null = null;
    if (knownAC.trim()) {
      const ac = parseInt(knownAC);
      if (isNaN(ac) || ac < 1 || ac > 99) {
        showError('請輸入有效的 AC 值（1-99）');
        return;
      }
      acValue = ac;
    }

    // 驗證 HP
    let hpValue: number | null = null;
    if (maxHP.trim()) {
      const hp = parseInt(maxHP);
      if (isNaN(hp) || hp < 1) {
        showError('請輸入有效的最大 HP 值（至少 1）');
        return;
      }
      hpValue = hp;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(name.trim(), countNum, acValue, hpValue, resistances);
      resetForm();
      onClose();
    } catch (error) {
      showError('新增怪物失敗');
    } finally {
      setIsSubmitting(false);
    }
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
                <span className="font-medium">建立中...</span>
              </div>
            </div>
          </div>
        )}

        <h2 className="text-xl font-bold mb-5">👹 新增怪物</h2>

        {/* 怪物名稱 */}
        <div className={INPUT_ROW_CLASS}>
          <label className={INPUT_LABEL_CLASS}>名稱</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="食人魔、地精..."
            className={INPUT_CLASS}
          />
        </div>

        {/* 數量與輸入框 */}
        <div className={INPUT_ROW_CLASS}>
          <label className={INPUT_LABEL_CLASS}>數量</label>
          <input
            type="number"
            value={count}
            onChange={(e) => setCount(e.target.value)}
            placeholder="1"
            min="1"
            className={INPUT_CLASS}
          />
        </div>

        {/* AC 輸入框 */}
        <div className={INPUT_ROW_CLASS}>
          <label className={INPUT_LABEL_CLASS}>AC</label>
          <input
            type="number"
            value={knownAC}
            onChange={(e) => setKnownAC(e.target.value)}
            placeholder="未知"
            min="1"
            max="99"
            className={INPUT_CLASS}
          />
        </div>

        {/* HP 輸入框 */}
        <div className={INPUT_ROW_CLASS}>
          <label className={INPUT_LABEL_CLASS}>最大 HP</label>
          <input
            type="number"
            value={maxHP}
            onChange={(e) => setMaxHP(e.target.value)}
            placeholder="未知"
            min="1"
            className={INPUT_CLASS}
          />
        </div>

        {/* 抗性設定（可摺疊） */}
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
                {DAMAGE_TYPES.map(dt => (
                  <div key={dt.value} className="flex items-center justify-between">
                    <span className="text-sm">{dt.emoji} {dt.label}</span>
                    <select
                      value={resistances[dt.value] || 'normal'}
                      onChange={(e) => handleResistanceChange(dt.value, e.target.value as ResistanceType)}
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
            className={BUTTON_PRIMARY_CLASS}
            disabled={isSubmitting}
          >
            確認新增
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AddMonsterModal;
