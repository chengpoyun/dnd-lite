import React, { useState } from 'react';
import { Modal } from './ui/Modal';
import CombatService from '../services/combatService';
import type { ResistanceType } from '../lib/supabase';
import { DAMAGE_TYPES } from '../utils/damageTypes';
import { useToast } from '../hooks/useToast';

interface DamageEntry {
  value: string;
  type: string;
  resistanceType: ResistanceType;
}

interface AddDamageModalProps {
  isOpen: boolean;
  onClose: () => void;
  monsterId: string;
  monsterNumber: number;
  onSuccess: () => void;
  onConflict: () => Promise<boolean>;
}

const AddDamageModal: React.FC<AddDamageModalProps> = ({
  isOpen,
  onClose,
  monsterId,
  monsterNumber,
  onSuccess,
  onConflict
}) => {
  const { showSuccess, showError } = useToast();
  const [entries, setEntries] = useState<DamageEntry[]>([
    { value: '', type: 'slashing', resistanceType: 'normal' }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 重置表單
  const resetForm = () => {
    setEntries([{ value: '', type: 'slashing', resistanceType: 'normal' }]);
  };

  // 新增傷害條目
  const addEntry = () => {
    setEntries([...entries, { value: '', type: 'slashing', resistanceType: 'normal' }]);
  };

  // 移除傷害條目
  const removeEntry = (index: number) => {
    if (entries.length > 1) {
      setEntries(entries.filter((_, i) => i !== index));
    }
  };

  // 更新條目
  const updateEntry = (index: number, field: keyof DamageEntry, value: string) => {
    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], [field]: value };
    setEntries(newEntries);
  };

  // 切換抗性類型 (checkbox 模式)
  const toggleResistance = (index: number, type: ResistanceType) => {
    const newEntries = [...entries];
    // 如果點擊的是已選中的選項，取消選擇 (恢復為 normal)
    if (newEntries[index].resistanceType === type) {
      newEntries[index].resistanceType = 'normal';
    } else {
      // 否則設定為新的抗性類型
      newEntries[index].resistanceType = type;
    }
    setEntries(newEntries);
  };

  // 計算總傷害
  const totalDamage = entries.reduce((sum, entry) => {
    const value = parseInt(entry.value) || 0;
    return sum + value;
  }, 0);

  // 提交傷害
  const handleSubmit = async () => {
    // 驗證輸入
    const validEntries = entries.filter(e => {
      const value = parseInt(e.value);
      return !isNaN(value) && value > 0;
    });

    if (validEntries.length === 0) {
      showError('請輸入至少一項傷害');
      return;
    }

    // 驗證抗性設定（邏輯上已經確保只能有一個，這裡只是額外檢查）
    // 因為 checkbox 模式下，點擊會切換，所以 resistanceType 只會是單一值

    // 檢查版本衝突
    if (await onConflict()) {
      return;
    }

    setIsSubmitting(true);

    const damages = validEntries.map(e => ({
      value: parseInt(e.value),
      type: e.type,
      resistanceType: e.resistanceType
    }));

    const result = await CombatService.addDamage(monsterId, damages);

    if (result.success) {
      showSuccess(`已記錄 ${totalDamage} 點傷害`);
      resetForm();
      onSuccess();
      onClose();
    } else {
      showError(result.error || '記錄傷害失敗');
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

        <h2 className="text-xl font-bold mb-4">👹 怪物 #{monsterNumber} - 新增傷害</h2>

        {/* 提示文字 */}
        <div className="mb-4 p-3 bg-blue-900/30 border border-blue-700 rounded-lg text-sm text-blue-300">
          💡 請直接輸入計算完畢的最終傷害
        </div>

        {/* 傷害條目列表 */}
        <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
          {entries.map((entry, index) => (
            <div key={index} className="p-3 bg-slate-900 rounded-lg">
              {/* 第一列：傷害值 + 類型 + 刪除按鈕 */}
              <div className="flex items-center gap-2 mb-2">
                {/* 傷害值輸入 */}
                <input
                  type="number"
                  value={entry.value}
                  onChange={(e) => updateEntry(index, 'value', e.target.value)}
                  placeholder="傷害"
                  className="w-20 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-center focus:outline-none focus:border-amber-500"
                  min="0"
                />

                {/* 傷害類型選擇 */}
                <select
                  value={entry.type}
                  onChange={(e) => updateEntry(index, 'type', e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-amber-500"
                >
                  {DAMAGE_TYPES.map(dt => (
                    <option key={dt.value} value={dt.value}>
                      {dt.emoji} {dt.label}
                    </option>
                  ))}
                </select>

                {/* 移除按鈕 */}
                {entries.length > 1 && (
                  <button
                    onClick={() => removeEntry(index)}
                    className="px-2 py-1 text-red-500 hover:bg-red-900/30 rounded"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* 第二列：抗性類型 Checkbox */}
              <div className="flex items-center gap-4 text-sm pl-2">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={entry.resistanceType === 'resistant'}
                    onChange={() => toggleResistance(index, 'resistant')}
                    className="cursor-pointer"
                  />
                  <span className="text-red-500">↓抗性</span>
                </label>

                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={entry.resistanceType === 'vulnerable'}
                    onChange={() => toggleResistance(index, 'vulnerable')}
                    className="cursor-pointer"
                  />
                  <span className="text-green-500">↑易傷</span>
                </label>

                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={entry.resistanceType === 'immune'}
                    onChange={() => toggleResistance(index, 'immune')}
                    className="cursor-pointer"
                  />
                  <span className="text-blue-500">🛡️免疫</span>
                </label>
              </div>
            </div>
          ))}
        </div>

        {/* 複合傷害按鈕 */}
        <button
          onClick={addEntry}
          className="w-full mb-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-colors"
        >
          ➕ 複合傷害
        </button>

        {/* 總計 */}
        <div className="mb-4 p-3 bg-slate-900 rounded-lg text-center">
          <span className="text-slate-400">總計：</span>
          <span className="ml-2 text-2xl font-bold text-amber-500">{totalDamage}</span>
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
            className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg font-medium transition-colors disabled:opacity-50"
            disabled={isSubmitting || totalDamage === 0}
          >
            確認新增
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AddDamageModal;
