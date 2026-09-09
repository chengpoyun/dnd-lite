/**
 * AbilityDetailModal - 特殊能力詳細資訊彈窗
 */

import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import { Modal } from './ui/Modal';
import type { CharacterAbilityWithDetails } from '../lib/supabase';
import { getDisplayValues } from '../services/abilityService';
import { getSpecialEffectId } from '../utils/specialEffects';
import { getAbilitySourceBadgeClass, getAbilityRecoveryBadgeClass } from '../utils/abilityColors';
import { MODAL_CONTAINER_CLASS, MODAL_DESCRIPTION_CLASS } from '../styles/modalStyles';

interface AbilityDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  characterAbility: CharacterAbilityWithDetails | null;
  onEdit: () => void;
  onDelete: () => void;
  onUse: () => void;
}

export default function AbilityDetailModal({
  isOpen,
  onClose,
  characterAbility,
  onEdit,
  onDelete,
  onUse
}: AbilityDetailModalProps) {
  if (!characterAbility) return null;

  const { current_uses, max_uses } = characterAbility;
  const display = getDisplayValues(characterAbility);
  const source = display.source || '其他';
  const recoveryType = display.recovery_type || '常駐';
  const isPassive = recoveryType === '常駐';
  const canUse = !isPassive && current_uses > 0;
  const isSpecial = !!getSpecialEffectId(characterAbility.stat_bonuses);

  return (
    <Modal isOpen={isOpen} onClose={onClose} bodyClassName="px-3 pt-3 pb-6">
      <div className={MODAL_CONTAINER_CLASS}>
        <div className="space-y-3">
          {/* 名稱＋英文名＋來源/恢復規則/使用次數 tag＋使用按鈕，合併成一列 */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg font-bold text-white flex-shrink-0">{display.name}</span>
            {display.name_en && (
              <span className="text-sm text-slate-400 min-w-0 truncate">{display.name_en}</span>
            )}
            <div className={`px-2 py-1 border rounded-md text-sm font-medium flex-shrink-0 ${getAbilitySourceBadgeClass(source, 'bordered')}`}>
              {source}
            </div>
            <div className={`px-2 py-1 border rounded-md text-sm font-medium flex-shrink-0 ${getAbilityRecoveryBadgeClass(recoveryType, 'bordered')}`}>
              {recoveryType}
            </div>
            {!isPassive && max_uses > 0 && (
              <div className={`px-2 py-1 border rounded-md text-sm font-medium flex-shrink-0 ${
                current_uses > 0
                  ? 'bg-indigo-900/30 border-indigo-700 text-indigo-400'
                  : 'bg-slate-700/50 border-slate-600 text-slate-400'
              }`}>
                剩餘：{current_uses}/{max_uses}
              </div>
            )}
            {canUse && (
              <button
                onClick={() => {
                  onUse();
                  onClose();
                }}
                className="ml-auto px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm flex-shrink-0"
              >
                使用
              </button>
            )}
          </div>

          {/* 效果說明：省下的空間全部留給敘述 */}
          {display.description && (
            <div>
              <div className="bg-slate-700/50 border border-slate-600 p-3 rounded-lg text-slate-300">
                <ReactMarkdown
                  remarkPlugins={[remarkBreaks]}
                  components={{
                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                    strong: ({ children }) => <strong className="font-bold text-slate-50">{children}</strong>,
                    em: ({ children }) => <em className="italic text-slate-200">{children}</em>,
                    ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                    li: ({ children }) => <li className="text-slate-300">{children}</li>,
                    a: ({ children, href }) => (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold underline text-blue-400 hover:text-blue-300"
                      >
                        {children}
                      </a>
                    ),
                  }}
                >
                  {display.description}
                </ReactMarkdown>
              </div>
              {isSpecial && (
                <p className={`mt-2 ${MODAL_DESCRIPTION_CLASS}`}>
                  此能力為特殊計算方式，不支援手動修改。
                </p>
              )}
            </div>
          )}
          {isSpecial && !display.description && (
            <p className={`mb-4 ${MODAL_DESCRIPTION_CLASS}`}>
              此能力為特殊計算方式，不支援手動修改。
            </p>
          )}

          {/* 操作按鈕 */}
          <div className="flex flex-col gap-2 pt-2">
            <div className="flex gap-3">
              <button
                onClick={onEdit}
                disabled={isSpecial}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
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
          </div>
        </div>
      </div>
    </Modal>
  );
}
