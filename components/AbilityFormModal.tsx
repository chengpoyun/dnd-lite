import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { CreateAbilityData, CreateAbilityDataForUpload, getDisplayValues } from '../services/abilityService';
import type { CharacterAbilityWithDetails } from '../lib/supabase';
import { MODAL_CONTAINER_CLASS } from '../styles/modalStyles';

interface AbilityFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: (CreateAbilityData & { maxUses?: number }) | CreateAbilityDataForUpload) => Promise<void>;
  editingAbility?: CharacterAbilityWithDetails | null;
  mode?: 'create' | 'upload';
  uploadInitialData?: {
    name: string;
    name_en: string;
    description: string;
    source: '種族' | '職業' | '專長' | '背景' | '其他';
    recovery_type: '常駐' | '短休' | '長休';
  } | null;
}

const SOURCES = ['種族', '職業', '專長', '背景', '其他'] as const;
const RECOVERY_TYPES = ['常駐', '短休', '長休'] as const;

export const AbilityFormModal: React.FC<AbilityFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingAbility,
  mode = 'create',
  uploadInitialData = null,
}) => {
  const isUpload = mode === 'upload';
  const [formData, setFormData] = useState<CreateAbilityData>({
    name: '',
    name_en: '',
    description: '',
    source: '職業',
    recovery_type: '長休'
  });
  const [maxUses, setMaxUses] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (editingAbility) {
      const display = getDisplayValues(editingAbility);
      setFormData({
        name: display.name,
        name_en: display.name_en || '',
        description: display.description,
        source: display.source,
        recovery_type: display.recovery_type
      });
      setMaxUses(editingAbility.max_uses);
    } else if (isUpload && uploadInitialData) {
      setFormData({
        name: uploadInitialData.name,
        name_en: uploadInitialData.name_en ?? '',
        description: uploadInitialData.description,
        source: uploadInitialData.source,
        recovery_type: uploadInitialData.recovery_type
      });
      setMaxUses(0);
    } else {
      // 重置表單
      setFormData({
        name: '',
        name_en: '',
        description: '',
        source: '職業',
        recovery_type: '長休'
      });
      setMaxUses(0);
    }
    setShowConfirm(false);
  }, [editingAbility, isUpload, uploadInitialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 驗證必填欄位
    if (!formData.name || !formData.description) {
      return;
    }
    if (isUpload && !formData.name_en) {
      return;
    }

    // 如果是新增（非編輯），先顯示確認
    if (!editingAbility) {
      setShowConfirm(true);
      return;
    }

    // 編輯模式直接提交
    await performSubmit();
  };

  const performSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (isUpload) {
        await onSubmit({
          name: formData.name.trim(),
          name_en: formData.name_en.trim(),
          description: formData.description.trim(),
          source: formData.source,
          recovery_type: formData.recovery_type
        });
      } else if (editingAbility) {
        await onSubmit({ ...formData, maxUses });
      } else {
        await onSubmit(formData);
      }
      onClose();
    } catch (error) {
      console.error('提交特殊能力失敗:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      size="2xl"
    >
      <div className={MODAL_CONTAINER_CLASS}>
        {showConfirm ? (
          // 確認画面
          <>
            <h2 className="text-xl font-bold mb-5">
              {isUpload ? '確認上傳' : '確認新增'}
            </h2>
            <div className="space-y-4">
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                <p className="text-slate-200 text-center">
                  {isUpload ? '是否確定上傳到資料庫？' : '是否確定新增到資料庫？'}
                  <br />
                  <span className="text-amber-400 text-sm">該資料會能被其他玩家獲取。</span>
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors font-medium"
                  disabled={isSubmitting}
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={performSubmit}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? '處理中...' : isUpload ? '確定上傳' : '確定新增'}
                </button>
              </div>
            </div>
          </>
        ) : (
          // 表單画面
          <>
            <h2 className="text-xl font-bold mb-5">
              {isUpload ? '上傳到資料庫' : editingAbility ? '編輯特殊能力' : '新增特殊能力到資料庫'}
            </h2>

            {isUpload && (
              <p className="text-slate-400 text-sm mb-4">
                所有欄位皆為必填，且英文名稱（name_en）將用於比對是否已存在，大小寫視為相同。
              </p>
            )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 中文名稱 */}
          <div>
            <label className="block text-[14px] text-slate-400 mb-2">名稱 *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500"
              placeholder="例：靈巧動作"
            />
          </div>

        {/* 英文名稱 */}
        <div>
          <label className="block text-[14px] text-slate-400 mb-2">
            英文名稱 {isUpload ? '*' : ''}
          </label>
          <input
            type="text"
            value={formData.name_en ?? ''}
            onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
            className="w-full bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500"
            placeholder="例：Cunning Action"
            required={isUpload}
          />
        </div>

        {/* 來源和恢復規則 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[14px] text-slate-400 mb-2">來源 *</label>
            <select
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value as any })}
              className="w-full bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500"
            >
              {SOURCES.map(source => (
                <option key={source} value={source}>{source}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[14px] text-slate-400 mb-2">恢復規則 *</label>
            <select
              value={formData.recovery_type}
              onChange={(e) => setFormData({ ...formData, recovery_type: e.target.value as any })}
              className="w-full bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500"
            >
              {RECOVERY_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 效果說明 */}
        <div>
          <label className="block text-[14px] text-slate-400 mb-2">
            效果說明 *
            <span className="text-slate-500 ml-2 text-[12px]">（支援 Markdown 語法）</span>
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={8}
            className="w-full bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500 resize-y"
            placeholder="描述特殊能力的效果和使用方式..."
          />
        </div>
        {/* 最大使用次數（僅編輯模式顯示） */}
        {editingAbility && formData.recovery_type !== '常駐' && (
          <div>
            <label className="block text-[14px] text-slate-400 mb-2">
              最大使用次數 *
              <span className="text-slate-500 ml-2 text-[12px]">(設為 0 表示無限次)</span>
            </label>
            <input
              type="number"
              min="0"
              value={maxUses}
              onChange={(e) => setMaxUses(parseInt(e.target.value) || 0)}
              className="w-full bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>
        )}
        {/* 操作按鈕 */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors font-medium"
            disabled={isSubmitting}
          >
            取消
          </button>
          <button
            type="submit"
            className={`flex-1 px-6 py-3 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
              isUpload
                ? 'bg-amber-600 hover:bg-amber-700'
                : editingAbility
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-red-600 hover:bg-red-700'
            }`}
            disabled={isSubmitting}
          >
            {isSubmitting ? '處理中...' : isUpload ? '上傳' : (editingAbility ? '更新' : '新增')}
          </button>
        </div>
      </form>
          </>
        )}
      </div>
    </Modal>
  );
};
