/**
 * AbilityDetailModal - 特殊能力詳細資訊彈窗
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Modal } from './ui/Modal';
import type { CharacterAbilityWithDetails } from '../lib/supabase';
import { getDisplayValues } from '../services/abilityService';

interface AbilityDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  characterAbility: CharacterAbilityWithDetails | null;
  onEdit: () => void;
  onDelete: () => void;
  onUse: () => void;
  /** 僅個人能力（未關聯 abilities）時顯示「上傳到資料庫」並呼叫此 callback */
  onUploadToDb?: () => void;
}

export default function AbilityDetailModal({
  isOpen,
  onClose,
  characterAbility,
  onEdit,
  onDelete,
  onUse,
  onUploadToDb
}: AbilityDetailModalProps) {
  if (!characterAbility) return null;

  const { current_uses, max_uses } = characterAbility;
  const display = getDisplayValues(characterAbility);
  const source = display.source || '其他';
  const recoveryType = display.recovery_type || '常駐';
  const isPassive = recoveryType === '常駐';
  const canUse = !isPassive && current_uses > 0;
  const isPersonalOnly = !characterAbility.ability_id || !characterAbility.ability;

  const sourceColors: Record<string, string> = {
    '種族': 'bg-green-900/30 border-green-700 text-green-400',
    '職業': 'bg-blue-900/30 border-blue-700 text-blue-400',
    '專長': 'bg-purple-900/30 border-purple-700 text-purple-400',
    '背景': 'bg-amber-900/30 border-amber-700 text-amber-400',
    '其他': 'bg-slate-700/50 border-slate-600 text-slate-400'
  };

  const recoveryColors: Record<string, string> = {
    '常駐': 'bg-emerald-900/30 border-emerald-700 text-emerald-400',
    '短休': 'bg-cyan-900/30 border-cyan-700 text-cyan-400',
    '長休': 'bg-rose-900/30 border-rose-700 text-rose-400'
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-slate-800 rounded-xl px-3 py-3 max-w-md w-full">
        <div className="space-y-3">
          {/* 名稱和英文名稱 + 使用按鈕 */}
          <div className="py-2 flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="text-lg font-bold text-white mb-1">{display.name}</div>
              {display.name_en && <div className="text-sm text-slate-400">{display.name_en}</div>}
            </div>
            {canUse && (
              <button
                onClick={() => {
                  onUse();
                  onClose();
                }}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm flex-shrink-0"
              >
                使用
              </button>
            )}
          </div>

          {/* 標籤區：來源、恢復規則、使用次數 */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* 來源標籤 */}
            <div className={`px-3 py-1.5 border rounded-lg font-medium ${sourceColors[source]}`}>
              {source}
            </div>
            
            {/* 恢復規則標籤 */}
            <div className={`px-3 py-1.5 border rounded-lg font-medium ${recoveryColors[recoveryType]}`}>
              {recoveryType}
            </div>

            {/* 使用次數標籤 */}
            {!isPassive && max_uses > 0 && (
              <div className={`px-3 py-1.5 border rounded-lg font-medium ${
                current_uses > 0 
                  ? 'bg-indigo-900/30 border-indigo-700 text-indigo-400' 
                  : 'bg-slate-700/50 border-slate-600 text-slate-400'
              }`}>
                剩餘：{current_uses}/{max_uses}
              </div>
            )}
          </div>

          {/* 效果說明 */}
          {display.description && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">效果</label>
              <div className="bg-slate-700/50 border border-slate-600 p-3 rounded-lg text-slate-300">
                <ReactMarkdown 
                  components={{
                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                    strong: ({ children }) => <strong className="font-bold text-slate-50">{children}</strong>,
                    em: ({ children }) => <em className="italic text-slate-200">{children}</em>,
                    ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                    li: ({ children }) => <li className="text-slate-300">{children}</li>,
                  }}
                >
                  {display.description}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {/* 操作按鈕 */}
          <div className="flex flex-col gap-2 pt-2">
            <div className="flex gap-3">
              <button
                onClick={onEdit}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                編輯
              </button>
              <button
                onClick={onDelete}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                移除
              </button>
            </div>
            {isPersonalOnly && onUploadToDb && (
              <button
                onClick={onUploadToDb}
                className="w-full px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
              >
                上傳到資料庫
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
