/**
 * AddPersonalAbilityModal - 新增個人能力（只存在於該角色，不寫入 abilities）
 * 必填：名稱、來源、恢復類型；選填：描述、最大使用次數
 */

import React, { useEffect, useState } from 'react';
import { Modal } from './ui/Modal';
import type { CreateCharacterAbilityData } from '../services/abilityService';
import { MODAL_CONTAINER_CLASS } from '../styles/modalStyles';

const SOURCES = ['種族', '職業', '專長', '背景', '其他'] as const;
const RECOVERY_TYPES = ['常駐', '短休', '長休'] as const;

interface AddPersonalAbilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCharacterAbilityData) => Promise<void>;
}

export const AddPersonalAbilityModal: React.FC<AddPersonalAbilityModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [source, setSource] = useState<typeof SOURCES[number]>('職業');
  const [recoveryType, setRecoveryType] = useState<typeof RECOVERY_TYPES[number]>('長休');
  const [description, setDescription] = useState('');
  const [maxUses, setMaxUses] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setSource('職業');
      setRecoveryType('長休');
      setDescription('');
      setMaxUses(1);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (recoveryType === '常駐') {
      setMaxUses(0);
    }
  }, [recoveryType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        source,
        recovery_type: recoveryType,
        description: description.trim() || undefined,
        max_uses: maxUses,
      });
      onClose();
    } catch (error) {
      console.error('新增個人能力失敗:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const showMaxUses = recoveryType !== '常駐';

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
      <div className={MODAL_CONTAINER_CLASS}>
        <h2 className="text-xl font-bold mb-5">新增個人能力</h2>
        <p className="text-slate-400 text-sm mb-4">
          此能力僅屬於此角色；之後若想讓大家都能取得，可在能力詳情中「上傳到資料庫」。
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[14px] text-slate-400 mb-2">名稱 *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500"
              placeholder="輸入能力名稱"
              required
              maxLength={100}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[14px] text-slate-400 mb-2">來源 *</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as typeof SOURCES[number])}
                className="w-full bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500"
              >
                {SOURCES.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[14px] text-slate-400 mb-2">恢復類型 *</label>
              <select
                value={recoveryType}
                onChange={(e) => setRecoveryType(e.target.value as typeof RECOVERY_TYPES[number])}
                className="w-full bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500"
              >
                {RECOVERY_TYPES.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[14px] text-slate-400 mb-2">描述（選填）</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500"
              placeholder="輸入能力描述"
              rows={4}
            />
          </div>
          {showMaxUses && (
            <div>
              <label className="block text-[14px] text-slate-400 mb-2">
                最大使用次數（選填）
                <span className="text-slate-500 ml-2 text-[12px]">（設為 0 表示無限次）</span>
              </label>
              <input
                type="number"
                min={0}
                value={maxUses}
                onChange={(e) => setMaxUses(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-lg bg-slate-700 text-slate-300 font-bold"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 rounded-lg bg-amber-600 text-white font-bold disabled:opacity-50"
            >
              {isSubmitting ? '新增中...' : '新增'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
