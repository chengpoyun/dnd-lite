import React, { useState } from 'react';
import { CharacterSpell } from '../services/spellService';
import { getSpellLevelText, getSchoolColor } from '../utils/spellUtils';

interface SpellCardProps {
  characterSpell: CharacterSpell;
  onTogglePrepared: (spellId: string, isPrepared: boolean) => void;
  onForget: (spellId: string) => void;
  onEdit: (spell: CharacterSpell['spell']) => void;
  canPrepareMore: boolean;
  isCantrip: boolean;
}

export const SpellCard: React.FC<SpellCardProps> = ({
  characterSpell,
  onTogglePrepared,
  onForget,
  onEdit,
  canPrepareMore,
  isCantrip
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const spell = characterSpell.spell!;
  const schoolColor = getSchoolColor(spell.school);

  const handleTogglePrepared = () => {
    if (!characterSpell.is_prepared && !canPrepareMore && !isCantrip) {
      // 無法準備更多時顯示警告（但仍允許操作）
      if (!confirm('已達到可準備法術數量上限，確定要準備此法術嗎？')) {
        return;
      }
    }
    onTogglePrepared(spell.id, !characterSpell.is_prepared);
  };

  const handleForget = () => {
    if (confirm(`確定要遺忘「${spell.name}」嗎？`)) {
      onForget(spell.id);
    }
  };

  return (
    <div className={`bg-slate-800/30 rounded-xl border ${characterSpell.is_prepared ? 'border-amber-500/50' : 'border-slate-700'} overflow-hidden`}>
      {/* 收合狀態 */}
      <div className="flex items-center">
        {/* 準備狀態圓點 */}
        {!isCantrip && (
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
        )}
        
        <div 
          className="flex-1 p-4 cursor-pointer active:bg-slate-700/30"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* 法術名稱 */}
            <div className="flex-1 min-w-0">
              <h3 className="text-[16px] font-bold text-slate-200 truncate">{spell.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[14px] text-slate-500">{getSpellLevelText(spell.level)}</span>
                {spell.concentration && (
                  <span className="text-[12px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold">專注</span>
                )}
                {spell.ritual && (
                  <span className="text-[12px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-bold">儀式</span>
                )}
              </div>
            </div>

            {/* 學派標籤 */}
            <div className={`px-3 py-1 rounded-lg ${schoolColor.bgLight} ${schoolColor.text} text-[14px] font-bold flex-shrink-0`}>
              {spell.school}
            </div>
          </div>

          {/* 展開圖示 */}
          <div className="text-slate-500 flex-shrink-0">
            {isExpanded ? '▼' : '▶'}
          </div>
        </div>
        </div>
      </div>

      {/* 展開狀態 */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-700">
          {/* 基本資訊 */}
          <div className="grid grid-cols-2 gap-3 pt-3">
            <div>
              <div className="text-[12px] text-slate-500 mb-1">施法時間</div>
              <div className="text-[14px] text-slate-300">{spell.casting_time}</div>
            </div>
            <div>
              <div className="text-[12px] text-slate-500 mb-1">持續時間</div>
              <div className="text-[14px] text-slate-300">{spell.duration}</div>
            </div>
            <div>
              <div className="text-[12px] text-slate-500 mb-1">射程</div>
              <div className="text-[14px] text-slate-300">{spell.range}</div>
            </div>
            <div>
              <div className="text-[12px] text-slate-500 mb-1">來源</div>
              <div className="text-[14px] text-slate-300">{spell.source}</div>
            </div>
          </div>

          {/* 成分 */}
          <div>
            <div className="text-[12px] text-slate-500 mb-1">成分</div>
            <div className="flex gap-2 flex-wrap">
              {spell.verbal && (
                <span className="px-2 py-1 rounded bg-slate-700 text-slate-300 text-[12px]">聲音 (V)</span>
              )}
              {spell.somatic && (
                <span className="px-2 py-1 rounded bg-slate-700 text-slate-300 text-[12px]">姿勢 (S)</span>
              )}
              {spell.material && (
                <span className="px-2 py-1 rounded bg-slate-700 text-slate-300 text-[12px]">材料 (M)</span>
              )}
            </div>
            {spell.material && (
              <div className="text-[14px] text-slate-400 mt-2">材料：{spell.material}</div>
            )}
          </div>

          {/* 法術效果 */}
          <div>
            <div className="text-[12px] text-slate-500 mb-1">法術效果</div>
            <div className="text-[14px] text-slate-300 whitespace-pre-wrap">{spell.description}</div>
          </div>

          {/* 操作按鈕 */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(spell);
              }}
              className="flex-1 py-2 px-4 rounded-lg bg-blue-600/20 text-blue-400 font-bold text-[14px] active:bg-blue-600/30"
            >
              編輯法術
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleForget();
              }}
              className="flex-1 py-2 px-4 rounded-lg bg-rose-600/20 text-rose-400 font-bold text-[14px] active:bg-rose-600/30"
            >
              遺忘法術
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
