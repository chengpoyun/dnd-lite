import React from 'react';
import { CharacterSpell, getDisplayValues } from '../services/spellService';
import { getSpellLevelText, getSchoolColor } from '../utils/spellUtils';

interface SpellCardProps {
  characterSpell: CharacterSpell;
  onTogglePrepared: (characterSpellId: string, spellId: string | null, isPrepared: boolean, needsWarning: boolean) => void;
  onClick: () => void;
  canPrepareMore: boolean;
  isCantrip: boolean;
}

export const SpellCard: React.FC<SpellCardProps> = ({
  characterSpell,
  onTogglePrepared,
  onClick,
  canPrepareMore,
  isCantrip
}) => {
  const display = getDisplayValues(characterSpell);
  const schoolColor = getSchoolColor(display.displaySchool);

  const handleTogglePrepared = () => {
    const needsWarning = !characterSpell.is_prepared && !canPrepareMore && !isCantrip;
    onTogglePrepared(
      characterSpell.id,
      characterSpell.spell?.id || characterSpell.spell_id,
      !characterSpell.is_prepared,
      needsWarning
    );
  };

  return (
    <div className={`bg-slate-800/30 rounded-xl border ${characterSpell.is_prepared ? 'border-amber-500/50' : 'border-slate-700'} overflow-hidden`}>
      <div className="flex items-center">
        {/* 準備狀態圓點 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleTogglePrepared();
          }}
          className="flex-shrink-0 p-4 active:bg-slate-700/30"
        >
          <div className={`w-4 h-4 rounded-full border-2 transition-all ${
            characterSpell.is_prepared 
              ? 'bg-emerald-500 border-emerald-500' 
              : 'border-slate-500'
          }`} />
        </button>
        
        {/* 法術資訊 - 點擊顯示詳細 */}
        <div 
          className="flex-1 p-4 cursor-pointer active:bg-slate-700/30"
          onClick={onClick}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex-1 min-w-0">
                <h3 className="text-[20px] font-bold text-slate-200 truncate">{display.displayName}</h3>
                <div className="flex items-center gap-2 mt-1">
                  {display.displayConcentration && (
                    <span className="text-[12px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold">專注</span>
                  )}
                  {display.displayRitual && (
                    <span className="text-[12px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-bold">儀式</span>
                  )}
                </div>
              </div>

              {/* 學派標籤 */}
              <div className={`px-3 py-1 rounded-lg ${schoolColor.bgLight} ${schoolColor.text} text-[14px] font-bold flex-shrink-0`}>
                {display.displaySchool}
              </div>
            </div>

            {/* 箭頭圖示 */}
            <div className="text-slate-500 flex-shrink-0">▶</div>
          </div>
        </div>
      </div>
    </div>
  );
};
