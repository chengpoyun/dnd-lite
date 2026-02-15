import React, { useState, useMemo, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { ModalSaveButton } from './ui/ModalSaveButton';
import { LoadingOverlay } from './ui/LoadingOverlay';
import CombatService from '../services/combatService';
import type { ResistanceType, CombatDamageLog } from '../lib/supabase';
import { DAMAGE_TYPES, calculateActualDamage } from '../utils/damageTypes';
import { useToast } from '../hooks/useToast';
import { MODAL_CONTAINER_CLASS } from '../styles/modalStyles';

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
  /** 編輯模式：整組傷害（同 created_at），null 為新增模式 */
  editingLogs?: CombatDamageLog[] | null;
  onSuccess: () => void;
  onConflict: () => Promise<boolean>;
}

const AddDamageModal: React.FC<AddDamageModalProps> = ({
  isOpen,
  onClose,
  monsterId,
  monsterNumber,
  monsterResistances,
  editingLogs = null,
  onSuccess,
  onConflict
}) => {
  const { showSuccess, showError } = useToast();
  const isEditMode = editingLogs != null && editingLogs.length > 0;
  const [entries, setEntries] = useState<DamageEntry[]>([
    { originalValue: '', type: 'slashing', resistanceType: 'normal' }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 同步 editingLogs：編輯模式預填整組（帶入原始傷害數值，僅用 damage_value_origin）
  useEffect(() => {
    if (isOpen && isEditMode && editingLogs) {
      setEntries(editingLogs.map(log => ({
        originalValue: String(log.damage_value_origin ?? 0),
        type: log.damage_type,
        resistanceType: log.resistance_type
      })));
    } else if (isOpen && !isEditMode) {
      setEntries([{
        originalValue: '',
        type: 'slashing',
        resistanceType: monsterResistances['slashing'] ?? 'normal'
      }]);
    }
  }, [isOpen, isEditMode, editingLogs, monsterResistances]);

  // 當傷害類型改變時，自動設定已知抗性（編輯模式不覆寫，由 sync editingLogs 負責）
  useEffect(() => {
    if (isEditMode) return;
    const newEntries = entries.map(entry => {
      const knownResistance = monsterResistances[entry.type];
      if (knownResistance && entry.resistanceType === 'normal') {
        return { ...entry, resistanceType: knownResistance };
      }
      return entry;
    });
    setEntries(newEntries);
  }, [monsterResistances, isEditMode]); // 只在 monsterResistances 變化時執行

  // 重置表單
  const resetForm = () => {
    if (isEditMode && editingLogs?.length) {
      setEntries(editingLogs.map(log => ({
        originalValue: String(log.damage_value_origin ?? 0),
        type: log.damage_type,
        resistanceType: log.resistance_type
      })));
    } else {
      setEntries([{
        originalValue: '',
        type: 'slashing',
        resistanceType: monsterResistances['slashing'] ?? 'normal'
      }]);
    }
  };

  // 新增傷害條目
  const addEntry = () => {
    // 找到第一個未使用的傷害類型
    const usedTypes = entries.map(e => e.type);
    const availableType = DAMAGE_TYPES.find(dt => !usedTypes.includes(dt.value));
    
    // 如果所有類型都已使用，則無法新增
    if (!availableType) {
      showError('所有傷害類型已使用完畢');
      return;
    }
    
    setEntries([...entries, {
      originalValue: '',
      type: availableType.value,
      resistanceType: monsterResistances[availableType.value] ?? 'normal'
    }]);
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

  // 有輸入原始傷害的條目（用於驗證與新增）
  const validEntries = useMemo(
    () => calculatedEntries.filter(e => e.originalDamage > 0),
    [calculatedEntries]
  );

  // 提交傷害（新增或編輯）
  const handleSubmit = async () => {
    if (validEntries.length === 0) {
      showError('請輸入至少一項傷害');
      return;
    }

    // 檢查版本衝突
    if (await onConflict()) {
      return;
    }

    setIsSubmitting(true);

    if (isEditMode && editingLogs?.length) {
      // 編輯模式：前 N 筆對應既有 log 更新，可多可少（複合傷害／刪列）
      const existingCount = Math.min(calculatedEntries.length, editingLogs.length);
      const updates = calculatedEntries.slice(0, existingCount).map((e, i) => ({
        logId: editingLogs[i].id,
        value: e.actualDamage,
        type: e.type,
        resistanceType: e.resistanceType,
        originalValue: e.originalDamage
      }));

      let result: { success: boolean; error: string | undefined } = { success: true, error: undefined };
      if (updates.length > 0) {
        const batchResult = await CombatService.updateDamageLogBatch(monsterId, updates);
        result = { success: batchResult.success, error: batchResult.error };
        if (!result.success) {
          showError(result.error || '更新傷害失敗');
          setIsSubmitting(false);
          return;
        }
      }

      // 新增的複合傷害（編輯時多出來的列）
      if (calculatedEntries.length > editingLogs.length) {
        const newEntries = calculatedEntries
          .slice(editingLogs.length)
          .filter(e => e.originalDamage > 0)
          .map(e => ({
            value: e.actualDamage,
            type: e.type,
            resistanceType: e.resistanceType,
            originalValue: e.originalDamage
          }));
        if (newEntries.length > 0) {
          const addResult = await CombatService.addDamage(monsterId, newEntries, {
            createdAt: editingLogs[0].created_at
          });
          result = { success: addResult.success, error: addResult.error };
          if (result.success) {
            const resistancesToUpdate: Record<string, ResistanceType> = {};
            newEntries.forEach(e => {
              if (e.resistanceType !== 'normal' && monsterResistances[e.type] !== e.resistanceType) {
                resistancesToUpdate[e.type] = e.resistanceType;
              }
            });
            if (Object.keys(resistancesToUpdate).length > 0) {
              await CombatService.updateMonsterResistances(monsterId, resistancesToUpdate);
            }
          }
        }
      }

      // 刪除的列（編輯時少掉的列）
      if (calculatedEntries.length < editingLogs.length && result.success) {
        const idsToDelete = editingLogs.slice(calculatedEntries.length).map(l => l.id);
        const delResult = await CombatService.deleteDamageLogBatch(idsToDelete, monsterId);
        result = { success: delResult.success, error: delResult.error };
      }

      if (result.success) {
        showSuccess('已更新傷害');
        resetForm();
        onSuccess();
        onClose();
      } else {
        showError(result.error || '更新傷害失敗');
      }
    } else {
      // 新增模式（僅 validEntries 送出）
      const damages = validEntries.map(e => ({
        value: e.actualDamage,
        type: e.type,
        resistanceType: e.resistanceType,
        originalValue: e.originalDamage
      }));
      const resistancesToUpdate: Record<string, ResistanceType> = {};
      validEntries.forEach(e => {
        if (e.resistanceType !== 'normal' && monsterResistances[e.type] !== e.resistanceType) {
          resistancesToUpdate[e.type] = e.resistanceType;
        }
      });
      const result = await CombatService.addDamage(monsterId, damages);
      if (result.success) {
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
    }

    setIsSubmitting(false);
  };

  // 編輯模式：刪除此筆傷害（整組）
  const handleDeleteGroup = async () => {
    if (!isEditMode || !editingLogs?.length) return;
    const n = editingLogs.length;
    const msg = n > 1
      ? `確定要刪除此筆傷害？（共 ${n} 種傷害類型）`
      : '確定要刪除此筆傷害？';
    if (!window.confirm(msg)) return;
    if (await onConflict()) return;
    setIsSubmitting(true);
    const result = await CombatService.deleteDamageLogBatch(editingLogs.map(l => l.id), monsterId);
    if (result.success) {
      showSuccess('已刪除傷害');
      resetForm();
      onSuccess();
      onClose();
    } else {
      showError(result.error || '刪除失敗');
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

        <h2 className="text-xl font-bold mb-4">
          {isEditMode ? `👹 怪物 #${monsterNumber} - 編輯傷害` : `👹 怪物 #${monsterNumber} - 新增傷害`}
        </h2>

        {/* 提示文字 */}
        <div className="mb-4 p-3 bg-blue-900/30 border border-blue-700 rounded-lg text-sm text-blue-300">
          💡 輸入原始傷害值，系統會根據抗性自動計算實際傷害
        </div>

        {/* 傷害條目列表 */}
        <div className="space-y-2">
          {calculatedEntries.map((entry, index) => (
            <div key={index} className="p-3 bg-slate-900 rounded-lg">
              {/* 第一列：傷害值 + 類型 + 刪除按鈕 */}
              <div className="flex items-center gap-2 mb-2">
                {/* 傷害值輸入 */}
                <input
                  type="number"
                  value={entry.originalValue}
                  onChange={(e) => updateEntry(index, 'originalValue', e.target.value)}
                  placeholder=""
                  className="w-20 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-center focus:outline-none focus:border-amber-500"
                  min="0"
                />

                {/* 傷害類型選擇 */}
                <select
                  value={entry.type}
                  onChange={(e) => updateEntry(index, 'type', e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-amber-500"
                >
                  {DAMAGE_TYPES.map(dt => {
                    // 檢查此類型是否已被其他條目使用
                    const isUsedByOthers = entries.some((e, i) => i !== index && e.type === dt.value);
                    return (
                      <option key={dt.value} value={dt.value} disabled={isUsedByOthers}>
                        {dt.emoji} {dt.label}
                      </option>
                    );
                  })}
                </select>

                {/* 移除按鈕（多筆時可移除） */}
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
              <div className="flex items-center gap-1 text-sm">
                <label className={`flex items-center gap-0.5 cursor-pointer px-0.5 py-0.5 rounded transition-all ${
                  entry.resistanceType === 'resistant' 
                    ? 'border-2 border-red-500 bg-red-500/10' 
                    : 'border-2 border-transparent'
                }`}>
                  <input
                    type="checkbox"
                    checked={entry.resistanceType === 'resistant'}
                    onChange={() => toggleResistance(index, 'resistant')}
                    className="cursor-pointer"
                  />
                  <span className="text-red-500">↓抗性</span>
                </label>

                <label className={`flex items-center gap-0.5 cursor-pointer px-0.5 py-0.5 rounded transition-all ${
                  entry.resistanceType === 'vulnerable' 
                    ? 'border-2 border-green-500 bg-green-500/10' 
                    : 'border-2 border-transparent'
                }`}>
                  <input
                    type="checkbox"
                    checked={entry.resistanceType === 'vulnerable'}
                    onChange={() => toggleResistance(index, 'vulnerable')}
                    className="cursor-pointer"
                  />
                  <span className="text-green-500">↑易傷</span>
                </label>

                <label className={`flex items-center gap-0.5 cursor-pointer px-0.5 py-0.5 rounded transition-all ${
                  entry.resistanceType === 'immune' 
                    ? 'border-2 border-blue-500 bg-blue-500/10' 
                    : 'border-2 border-transparent'
                }`}>
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

        {/* 複合傷害按鈕（新增與編輯模式皆可新增列） */}
        {entries.length < DAMAGE_TYPES.length && (
          <button
            onClick={addEntry}
            className="w-full mt-4 mb-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ➕ 複合傷害
          </button>
        )}

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
        <div className="flex flex-col gap-2">
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-colors"
              disabled={isSubmitting}
            >
              取消
            </button>
            <ModalSaveButton
              type="button"
              onClick={handleSubmit}
              loading={isSubmitting}
              disabled={validEntries.length === 0}
              className="flex-1 px-6 py-3 bg-orange-600 hover:bg-orange-700 rounded-lg font-medium transition-colors text-white"
            >
              {isEditMode ? '確認更新' : '確認新增'}
            </ModalSaveButton>
          </div>
          {isEditMode && (
            <button
              onClick={handleDeleteGroup}
              className="w-full px-6 py-2.5 bg-red-900/50 hover:bg-red-900/70 border border-red-700 rounded-lg font-medium text-red-300 transition-colors disabled:opacity-50"
              disabled={isSubmitting}
            >
              刪除此筆傷害
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default AddDamageModal;
