import React from 'react';
import type { CharacterAbilityWithDetails } from '../lib/supabase';
import { getDisplayValues } from '../services/abilityService';

interface AbilityCardProps {
  characterAbility: CharacterAbilityWithDetails;
  onClick: () => void;
}

const sourceColors: Record<string, { bgLight: string; text: string }> = {
  '種族': { bgLight: 'bg-green-500/20', text: 'text-green-400' },
  '職業': { bgLight: 'bg-blue-500/20', text: 'text-blue-400' },
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
  onClick
}) => {
  const { current_uses, max_uses } = characterAbility;
  const display = getDisplayValues(characterAbility);
  const sourceColor = sourceColors[display.source] || sourceColors['其他'];
  const recoveryColor = recoveryTypeColors[display.recovery_type] || recoveryTypeColors['常駐'];

  const isPassive = display.recovery_type === '常駐';
  const hasUses = !isPassive && max_uses > 0;

  return (
    <div className="bg-slate-800/30 rounded-xl border border-slate-700 overflow-hidden">
      <div 
        className="p-4 cursor-pointer active:bg-slate-700/30"
        onClick={onClick}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-1 min-w-0">
              <h3 className="text-[20px] font-bold text-slate-200 truncate">{display.name}</h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {/* 來源標籤 */}
                <span className={`text-[12px] px-1.5 py-0.5 rounded ${sourceColor.bgLight} ${sourceColor.text} font-bold`}>
                  {display.source}
                </span>
                
                {/* 恢復規則標籤 */}
                <span className={`text-[12px] px-1.5 py-0.5 rounded ${recoveryColor.bgLight} ${recoveryColor.text} font-bold`}>
                  {display.recovery_type}
                </span>

                {/* 使用次數顯示 */}
                {hasUses && (
                  <span className={`text-[12px] px-1.5 py-0.5 rounded font-bold ${
                    current_uses > 0 
                      ? 'bg-indigo-500/20 text-indigo-400' 
                      : 'bg-slate-600/50 text-slate-400'
                  }`}>
                    {current_uses}/{max_uses}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 箭頭圖示 */}
          <div className="text-slate-500 flex-shrink-0">▶</div>
        </div>
      </div>
    </div>
  );
};
