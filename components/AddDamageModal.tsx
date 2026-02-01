import React, { useState, useMemo, useEffect } from 'react';
import { Modal } from './ui/Modal';
import CombatService from '../services/combatService';
import type { ResistanceType } from '../lib/supabase';
import { DAMAGE_TYPES, calculateActualDamage } from '../utils/damageTypes';
import { useToast } from '../hooks/useToast';

interface DamageEntry {
  originalValue: string; // 原始傷害值（用戶輸入）
  type: string;
  resistanceType: ResistanceType;
}

interface AddDamageModalProps {
  isOpen: boolean;
  onClose: () => void;
  monsterId: string;
  monsterNumber: number;
  monsterResistances: Record<string, ResistanceType>; // 怪物已知抗性
  onSuccess: () => void;
  onConflict: () => Promise<boolean>;
}

const AddDamageModal: React.FC<AddDamageModalProps> = ({
  isOpen,
  onClose,
  monsterId,
  monsterNumber,
  monsterResistances,
  onSuccess,
  onConflict
}) => {
  const { showSuccess, showError } = useToast();
  const [entries, setEntries] = useState<DamageEntry[]>([
    { originalValue: '', type: 'slashing', resistanceType: 'normal' }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 當傷害類型改變時，自動設定已知抗性
  useEffect(() => {
    const newEntries = entries.map(entry => {
      const knownResistance = monsterResistances[entry.type];
      if (knownResistance && entry.resistanceType === 'normal') {
        return { ...entry, resistanceType: knownResistance };
      }
      return entry;
    });
    setEntries(newEntries);
  }, [monsterResistances]); // 只在 monsterResistances 變化時執行

  // 重置表單
  const resetForm = () => {
    setEntries([{ originalValue: '', type: 'slashing', resistanceType: 'normal' }]);
  };

  // 新增傷害條目
  const addEntry = () => {
    setEntries([...entries, { originalValue: '', type: 'slashing', resistanceType: 'normal' }]);
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
    
    // 如果改變傷害類型，自動套用已知抗性或重置為 normal
    if (field === 'type') {
      const knownResistance = monsterResistances[value];
      if (knownResistance) {
        newEntries[index].resistanceType = knownResistance;
      } else {
        // 切換到未知類型時，重置為 normal
        newEntries[index].resistanceType = 'normal';
      }
    }
    
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

  // 計算每個條目的實際傷害和總計
  const calculatedEntries = useMemo(() => {
    return entries.map(entry => {
      const original = parseInt(entry.originalValue) || 0;
      const actual = calculateActualDamage(original, entry.resistanceType);
      return { ...entry, originalDamage: original, actualDamage: actual };
    });
  }, [entries]);

  // 計算總傷害（原始和實際）
  const totalOriginal = calculatedEntries.reduce((sum, e) => sum + e.originalDamage, 0);
  const totalActual = calculatedEntries.reduce((sum, e) => sum + e.actualDamage, 0);

  // 提交傷害
  const handleSubmit = async () => {
    // 驗證輸入（只要原始傷害大於 0 就可以，即使實際傷害為 0 也要記錄）
    const validEntries = calculatedEntries.filter(e => e.originalDamage > 0);

    if (validEntries.length === 0) {
      showError('請輸入至少一項傷害');
      return;
    }

    // 檢查版本衝突
    if (await onConflict()) {
      return;
    }

    setIsSubmitting(true);

    // 準備傷害數據（使用實際傷害值，包含 0 傷害的免疫記錄）
    const damages = validEntries.map(e => ({
      value: e.actualDamage,  // 包括免疫導致的 0 傷害
      type: e.type,
      resistanceType: e.resistanceType
    }));

    // 收集需要更新的抗性（非 normal 且與已知不同）
    const resistancesToUpdate: Record<string, ResistanceType> = {};
    validEntries.forEach(e => {
      if (e.resistanceType !== 'normal' && monsterResistances[e.type] !== e.resistanceType) {
        resistancesToUpdate[e.type] = e.resistanceType;
      }
    });

    // 新增傷害記錄
    const result = await CombatService.addDamage(monsterId, damages);

    if (result.success) {
      // 更新怪物抗性（如果有新發現）
      if (Object.keys(resistancesToUpdate).length > 0) {
        await CombatService.updateMonsterResistances(monsterId, resistancesToUpdate);
      }
      
      showSuccess(`已記錄 ${totalActual} 點傷害`);
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

        <h2 className="text-xl font-bold mb-4">👹 怪物 #{monsterNumber} - 新增傷害</h2>

        {/* 提示文字 */}
        <div className="mb-4 p-3 bg-blue-900/30 border border-blue-700 rounded-lg text-sm text-blue-300">
          💡 輸入原始傷害值，系統會根據抗性自動計算實際傷害
        </div>

        {/* 傷害條目列表 */}
        <div className="max-h-96 overflow-y-auto">
          {calculatedEntries.map((entry, index) => (
            <div key={index} className="p-3 bg-slate-900 rounded-lg">
              {/* 第一列：傷害值 + 類型 + 刪除按鈕 */}
              <div className="flex items-center gap-2 mb-2">
                {/* 傷害值輸入 */}
                <input
                  type="number"
                  value={entry.originalValue}
                  onChange={(e) => updateEntry(index, 'originalValue', e.target.value)}
                  placeholder="原始"
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
                  <span className="text-blue-500">⛔免疫</span>
                </label>
              </div>

              {/* 計算結果顯示 */}
              {entry.originalDamage > 0 && entry.resistanceType !== 'normal' && (
                <div className="mt-2 text-xs text-slate-400 pl-2">
                  原始: {entry.originalDamage} → 實際: <span className="text-amber-400 font-bold">{entry.actualDamage}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 複合傷害按鈕 */}
        <button
          onClick={addEntry}
          className="w-full mt-4 mb-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-colors"
        >
          ➕ 複合傷害
        </button>

        {/* 總計 */}
        <div className="mb-4 p-3 bg-slate-900 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">總計：</span>
            <div className="flex items-center gap-2">
              {totalOriginal !== totalActual && (
                <>
                  <span className="text-slate-500 text-sm line-through">原始: {totalOriginal}</span>
                  <span className="text-slate-400">→</span>
                </>
              )}
              <span className="text-2xl font-bold text-amber-500">{totalActual}</span>
            </div>
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
            className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg font-medium transition-colors disabled:opacity-50"
            disabled={isSubmitting || totalOriginal === 0}
          >
            確認新增
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AddDamageModal;
