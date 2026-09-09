import React from 'react';
import type { CharacterAbilityWithDetails } from '../lib/supabase';
import { getDisplayValues } from '../services/abilityService';
import { ListCard, ListCardTitleRow } from './ui';
import { combineStyles, conditionalStyle } from '../styles/common';
import { getAbilitySourceBadgeClass, getAbilityRecoveryBadgeClass } from '../utils/abilityColors';

interface AbilityCardProps {
  characterAbility: CharacterAbilityWithDetails;
  onClick: () => void;
  /** 左側拖拉把手（僅此區域可拖曳排序） */
  dragHandle?: React.ReactNode;
  /** 是否正在被拖曳（用於樣式） */
  isDragging?: boolean;
}

export const AbilityCard: React.FC<AbilityCardProps> = ({
  characterAbility,
  onClick,
  dragHandle,
  isDragging = false
}) => {
  const { current_uses, max_uses } = characterAbility;
  const display = getDisplayValues(characterAbility);
  const sourceColorClass = getAbilitySourceBadgeClass(display.source);
  const recoveryColorClass = getAbilityRecoveryBadgeClass(display.recovery_type);

  const isPassive = display.recovery_type === '常駐';
  const hasUses = !isPassive && max_uses > 0;

  return (
    <ListCard
      dragHandle={dragHandle}
      onClick={onClick}
      className={combineStyles(
        'rounded-xl bg-slate-800/30',
        conditionalStyle(isDragging, 'opacity-70 shadow-lg ring-2 ring-amber-500/50')
      )}
    >
      <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-1 min-w-0">
              <ListCardTitleRow
                title={<h3 className="text-[20px] font-bold text-slate-200">{display.name}</h3>}
                tags={
                  <>
                    <span className={`text-[12px] px-1.5 py-0.5 rounded ${sourceColorClass} font-bold whitespace-nowrap`}>
                      {display.source}
                    </span>
                    <span className={`text-[12px] px-1.5 py-0.5 rounded ${recoveryColorClass} font-bold whitespace-nowrap`}>
                      {display.recovery_type}
                    </span>
                    {hasUses && (
                      <span className={`text-[12px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap ${
                        current_uses > 0 
                          ? 'bg-indigo-500/20 text-indigo-400' 
                          : 'bg-slate-600/50 text-slate-400'
                      }`}>
                        {current_uses}/{max_uses}
                      </span>
                    )}
                  </>
                }
              />
              {/* 描述文字放在最多兩行，超過顯示... */}
              {display.description && (
                <div className="mt-1 text-slate-400 text-[14px] break-words whitespace-pre-line line-clamp-2">
                  {display.description}
                </div>
              )}
            </div>            
          </div>

          {/* 箭頭圖示 */}
          <div className="text-slate-500 flex-shrink-0">▶</div>
        </div>
    </ListCard>
  );
};
