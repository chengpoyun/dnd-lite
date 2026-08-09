import React from 'react';
import type { CombatItem } from '../utils/combatItemMapping';

/**
 * 戰鬥頁的「動作／附贈動作／反應／職業資源」清單區塊。
 * 從 CombatView.tsx 拆出（原本定義在同一個檔案的最下方）。
 */
interface ActionListProps {
  title: string;
  items: CombatItem[];
  colorClass: string;
  onAdd: () => void;
  isEditMode: boolean;
  onRemove: (id: string) => void;
  onUse: (id: string) => void;
  isTwoCol?: boolean;
  categoryUsage?: { current: number; max: number };
  onEditCategoryUsage?: () => void;
}

const ActionList: React.FC<ActionListProps> = ({ title, items, colorClass, onAdd, isEditMode, onRemove, onUse, isTwoCol = false, categoryUsage, onEditCategoryUsage }) => {
  const isCategoryDisabled = categoryUsage && categoryUsage.current <= 0;
  
  return (
    <div className="bg-slate-900/60 p-2 rounded-2xl border border-slate-800/80 space-y-1.5 shadow-inner">
      <div className="flex justify-between items-center border-b border-slate-800 pb-1.5 px-1">
        <h3 className={`text-[16px] font-black uppercase tracking-widest ${colorClass} flex items-center gap-2`}>
          {title}
          <button onClick={onAdd} className="w-4 h-4 rounded bg-slate-800 flex items-center justify-center text-[16px] opacity-50 active:scale-90 active:bg-slate-700 transition-all">+</button>
        </h3>
        {categoryUsage && onEditCategoryUsage ? (
          <button 
            onClick={onEditCategoryUsage}
            className={`text-[16px] font-mono font-black px-2 py-1 rounded border active:scale-95 transition-all ${
              isCategoryDisabled 
                ? 'text-slate-600 border-slate-800 bg-slate-950' 
                : `${colorClass.replace('text-', 'text-')} border-slate-700 bg-slate-800/50`
            }`}
          >
            {categoryUsage.current}/{categoryUsage.max}
          </button>
        ) : (
          <span className="text-[16px] font-bold text-slate-700 uppercase tracking-tighter">點擊消耗</span>
        )}
      </div>
      <div className={`grid ${isTwoCol ? 'grid-cols-2' : 'grid-cols-4'} gap-1`}>
        {items.map((item) => {
          // 規則：如果 max:1 且 recovery: 'round'，不顯示數值標籤
          const showCounter = !(item.max === 1 && item.recovery === 'round');

          return (
            <div key={item.id} className="relative">
              <button
                onClick={() => onUse(item.id)}
                className={`w-full flex ${isTwoCol ? 'items-center gap-3 h-[70px]' : 'flex-col items-center justify-center h-[120px]'} rounded-xl border transition-all text-left group
                  ${(item.current > 0 || isEditMode) && !isCategoryDisabled
                    ? 'bg-slate-800/40 border-slate-700/50 active:scale-95 active:bg-slate-700/50 shadow-sm' 
                    : 'bg-slate-950 border-slate-900/50 opacity-20'
                  }`}
                disabled={isCategoryDisabled && !isEditMode}
              >
                {isTwoCol ? (
                  <>
                    <div className="flex flex-col items-center justify-center border-r border-slate-700/50 shrink-0">
                      <span className="text-2xl leading-none">{item.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[16px] font-black text-slate-500 truncate leading-none mb-1.5 uppercase tracking-tighter">{item.name}</div>
                      <div className="flex items-baseline gap-1.5">
                        <span className={`text-3xl font-mono font-black leading-none ${item.current > 0 && !isCategoryDisabled ? colorClass : 'text-slate-600'}`}>
                          {item.current}
                        </span>
                        <span className="text-[16px] text-slate-700 font-bold">/ {item.max}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="text-3xl mb-1">{item.icon}</span>
                    <span className="text-[16px] font-bold text-slate-400 truncate w-full text-center tracking-tight leading-tight">{item.name}</span>
                    {showCounter && (
                      <div className="flex items-center gap-1 mt-1 opacity-80">
                         <span className={`text-[16px] font-mono font-black ${item.current > 0 && !isCategoryDisabled ? colorClass : 'text-slate-600'}`}>{item.current}/{item.max}</span>
                      </div>
                    )}
                  </>
                )}
              </button>
              {isEditMode && !item.is_default && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center text-[16px] font-black border border-slate-950 shadow-lg z-10 active:scale-75 transition-transform"
                >✕</button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActionList;
