import React, { useState } from 'react';
import { Modal } from './ui/Modal';
import type { ResistanceType } from '../lib/supabase';
import { DAMAGE_TYPES } from '../utils/damageTypes';
import { useToast } from '../hooks/useToast';

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

  // 共用樣式
  const inputRowClass = "flex items-center gap-2 mb-3";
  const labelClass = "text-sm font-medium text-slate-300 w-20 shrink-0";
  const inputClass = "w-[calc(100%-5.5rem)] px-3 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:bg-slate-700";

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
      <div className="bg-slate-800 rounded-xl px-3 py-3 max-w-md w-full relative">
        {/* Loading 蓋版 */}
        {isSubmitting && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-[130] rounded-xl flex items-center justify-center">
            <div className="bg-slate-800 px-6 py-4 rounded-lg shadow-2xl border border-slate-700">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-amber-500 border-t-transparent"></div>
                <span className="font-medium">建立中...</span>
              </div>
            </div>
          </div>
        )}

        <h2 className="text-xl font-bold mb-5">👹 新增怪物</h2>

        {/* 怪物名稱 */}
        <div className={inputRowClass}>
          <label className={labelClass}>名稱</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="食人魔、地精..."
            className={inputClass}
          />
        </div>

        {/* 數量與輸入框 */}
        <div className={inputRowClass}>
          <label className={labelClass}>數量</label>
          <input
            type="number"
            value={count}
            onChange={(e) => setCount(e.target.value)}
            placeholder="1"
            min="1"
            className={inputClass}
          />
        </div>

        {/* AC 輸入框 */}
        <div className={inputRowClass}>
          <label className={labelClass}>AC</label>
          <input
            type="number"
            value={knownAC}
            onChange={(e) => setKnownAC(e.target.value)}
            placeholder="未知"
            min="1"
            max="99"
            className={inputClass}
          />
        </div>

        {/* HP 輸入框 */}
        <div className={inputRowClass}>
          <label className={labelClass}>最大 HP</label>
          <input
            type="number"
            value={maxHP}
            onChange={(e) => setMaxHP(e.target.value)}
            placeholder="未知"
            min="1"
            className={inputClass}
          />
        </div>

        {/* 抗性設定（可摺疊） */}
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
                {DAMAGE_TYPES.map(dt => (
                  <div key={dt.value} className="flex items-center justify-between">
                    <span className="text-sm">{dt.emoji} {dt.label}</span>
                    <select
                      value={resistances[dt.value] || 'normal'}
                      onChange={(e) => handleResistanceChange(dt.value, e.target.value as ResistanceType)}
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
            className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-colors"
            disabled={isSubmitting}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors disabled:opacity-50"
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
