import React from 'react';
import type { CharacterAbilityWithDetails } from '../lib/supabase';
import { getDisplayValues } from '../services/abilityService';
import { ListCard, ListCardTitleRow } from './ui';
import { combineStyles, conditionalStyle } from '../styles/common';

interface AbilityCardProps {
  characterAbility: CharacterAbilityWithDetails;
  onClick: () => void;
  /** 左側拖拉把手（僅此區域可拖曳排序） */
  dragHandle?: React.ReactNode;
  /** 是否正在被拖曳（用於樣式） */
  isDragging?: boolean;
}

const sourceColors: Record<string, { bgLight: string; text: string }> = {
  '職業': { bgLight: 'bg-blue-500/20', text: 'text-blue-400' },
  '種族': { bgLight: 'bg-green-500/20', text: 'text-green-400' },
  '裝備': { bgLight: 'bg-indigo-500/20', text: 'text-indigo-400' },
  '專長': { bgLight: 'bg-purple-500/20', text: 'text-purple-400' },
  '背景': { bgLight: 'bg-amber-500/20', text: 'text-amber-400' },
  '其他': { bgLight: 'bg-slate-500/20', text: 'text-slate-400' }
};

const recoveryTypeColors: Record<string, { bgLight: string; text: string }> = {
  '常駐': { bgLight: 'bg-emerald-500/20', text: 'text-emerald-400' },
  '短休': { bgLight: 'bg-cyan-500/20', text: 'text-cyan-400' },
  '長休': { bgLight: 'bg-rose-500/20', text: 'text-rose-400' }
};

export const AbilityCard: React.FC<AbilityCardProps> = ({
  characterAbility,
  onClick,
  dragHandle,
  isDragging = false
}) => {
  const { current_uses, max_uses } = characterAbility;
  const display = getDisplayValues(characterAbility);
  const sourceColor = sourceColors[display.source] || sourceColors['其他'];
  const recoveryColor = recoveryTypeColors[display.recovery_type] || recoveryTypeColors['常駐'];

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
                    <span className={`text-[12px] px-1.5 py-0.5 rounded ${sourceColor.bgLight} ${sourceColor.text} font-bold whitespace-nowrap`}>
                      {display.source}
                    </span>
                    <span className={`text-[12px] px-1.5 py-0.5 rounded ${recoveryColor.bgLight} ${recoveryColor.text} font-bold whitespace-nowrap`}>
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
