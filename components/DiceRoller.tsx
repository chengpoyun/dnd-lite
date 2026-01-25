
import React, { useState } from 'react';

const DICE_TYPES = [4, 6, 8, 10, 12, 20, 100];

type RollMode = 'normal' | 'advantage' | 'disadvantage';

interface RollDetail {
  die: number;
  results: number[]; // 最終採用的結果
  rawResults?: number[][]; // 優勢/劣勢時儲存成對的原始結果 [ [roll1, roll2], ... ]
  subtotal: number;
}

interface BatchRollResult {
  details: RollDetail[];
  total: number;
  modifier: number;
  mode: RollMode;
  formula: string;
  timestamp: number;
}

export const DiceRoller: React.FC = () => {
  const [diceInput, setDiceInput] = useState('');
  const [rollMode, setRollMode] = useState<RollMode>('normal');
  const [rollHistory, setRollHistory] = useState<BatchRollResult[]>([]);
  const [isRolling, setIsRolling] = useState(false);

  const toggleRollMode = () => {
    setRollMode(prev => {
      if (prev === 'normal') return 'advantage';
      if (prev === 'advantage') return 'disadvantage';
      return 'normal';
    });
  };

  const getModeLabel = (mode: RollMode) => {
    switch (mode) {
      case 'advantage': return '優勢';
      case 'disadvantage': return '劣勢';
      default: return '正常';
    }
  };

  const getModeColor = (mode: RollMode) => {
    switch (mode) {
      case 'advantage': return 'bg-emerald-600 border-emerald-500 text-white';
      case 'disadvantage': return 'bg-rose-600 border-rose-500 text-white';
      default: return 'bg-slate-800/50 border-slate-700 text-slate-400';
    }
  };

  const addDie = (sides: number) => {
    setDiceInput(prev => {
      const trimmed = prev.trim();
      if (!trimmed) return `1d${sides}`;
      
      const lastPartRegex = new RegExp(`(\\d+)d${sides}$`);
      const match = trimmed.match(lastPartRegex);
      
      if (match) {
        const count = parseInt(match[1]) + 1;
        return trimmed.replace(lastPartRegex, `${count}d${sides}`);
      }
      
      return `${trimmed} + 1d${sides}`;
    });
  };

  const clearSelection = () => {
    setDiceInput('');
  };

  const clearHistory = () => {
    setRollHistory([]);
  };

  const executeRoll = () => {
    const input = diceInput.trim().toLowerCase();
    if (!input) return;

    setIsRolling(true);
    
    setTimeout(() => {
      let grandTotal = 0;
      let modifier = 0;
      const details: RollDetail[] = [];
      const formula = input;

      const parts = input.split(/[\s\+]+|(?=-)/);
      
      parts.forEach(part => {
        const p = part.trim();
        if (!p) return;

        const diceMatch = p.match(/^(\d*)d(\d+)$/);
        if (diceMatch) {
          const count = parseInt(diceMatch[1]) || 1;
          const sides = parseInt(diceMatch[2]);
          const results: number[] = [];
          const rawResults: number[][] = [];

          for (let i = 0; i < count; i++) {
            if (rollMode === 'normal') {
              const r = Math.floor(Math.random() * sides) + 1;
              results.push(r);
            } else {
              const r1 = Math.floor(Math.random() * sides) + 1;
              const r2 = Math.floor(Math.random() * sides) + 1;
              rawResults.push([r1, r2]);
              results.push(rollMode === 'advantage' ? Math.max(r1, r2) : Math.min(r1, r2));
            }
          }

          const subtotal = results.reduce((a, b) => a + b, 0);
          grandTotal += subtotal;
          details.push({ 
            die: sides, 
            results, 
            rawResults: rollMode !== 'normal' ? rawResults : undefined,
            subtotal 
          });
        } else {
          const num = parseInt(p);
          if (!isNaN(num)) {
            modifier += num;
            grandTotal += num;
          }
        }
      });

      const newResult: BatchRollResult = {
        details,
        total: grandTotal,
        modifier,
        mode: rollMode,
        formula,
        timestamp: Date.now()
      };

      setRollHistory(prev => [newResult, ...prev].slice(0, 10));
      setIsRolling(false);
    }, 400);
  };

  // Helper to determine special colors based on d20 results
  const getD20Status = (record: BatchRollResult) => {
    const d20Details = record.details.filter(d => d.die === 20);
    if (d20Details.length === 0) return 'none';
    
    const allD20Results = d20Details.flatMap(d => d.results);
    if (allD20Results.includes(20)) return 'success';
    if (allD20Results.includes(1)) return 'fumble';
    return 'normal';
  };

  // Helper for summary total text color
  const getTotalTextColorClass = (record: BatchRollResult) => {
    const status = getD20Status(record);
    if (status === 'success') return 'text-emerald-500 drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]';
    if (status === 'fumble') return 'text-rose-500 drop-shadow-[0_0_15px_rgba(244,63,94,0.4)]';
    return 'text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.4)]';
  };

  // Helper for individual die results
  const getDieColorClasses = (dieSides: number, value: number, isSelected: boolean = true) => {
    if (dieSides === 20) {
      if (value === 20) return isSelected ? 'bg-emerald-600 border-emerald-400 text-white shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'text-emerald-400 border-emerald-800 bg-emerald-950/30 opacity-60';
      if (value === 1) return isSelected ? 'bg-rose-600 border-rose-400 text-white shadow-[0_0_10px_rgba(244,63,94,0.5)]' : 'text-rose-400 border-rose-800 bg-rose-950/30 opacity-60';
      // d20 2-19 matches amber/yellow theme
      return isSelected ? 'bg-amber-500 border-amber-400 text-slate-950' : 'text-amber-400 border-amber-800 bg-amber-950/30 opacity-40';
    }
    
    if (!isSelected) return 'text-slate-200 border-slate-600 bg-slate-700 opacity-40';
    
    // Normal high result (max of the die) for other dice
    if (value === dieSides) return 'bg-amber-500 border-amber-400 text-slate-950';
    
    return 'bg-slate-950 border-slate-800 text-slate-300';
  };

  return (
    <div className="flex flex-col gap-6 p-4 select-none h-full overflow-y-auto pb-24">
      
      {/* 標題列 */}
      <h2 className="text-2xl font-fantasy text-amber-500 border-b border-amber-900/30 pb-2">擲骰密室</h2>

      {/* 骰子選單與模式切換 */}
      <div className="grid grid-cols-4 gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
        {DICE_TYPES.map(d => (
          <button
            key={d}
            onClick={() => addDie(d)}
            disabled={isRolling}
            className="flex flex-col items-center justify-center py-4 bg-slate-800/50 rounded-2xl border border-slate-700 active:bg-amber-500/20 active:border-amber-500 transition-all active:scale-90 shadow-sm"
          >
            <span className="text-amber-400 font-black text-lg">d{d}</span>
          </button>
        ))}
        <button
          onClick={toggleRollMode}
          disabled={isRolling}
          className={`flex flex-col items-center justify-center py-4 rounded-2xl border transition-all active:scale-90 shadow-sm ${getModeColor(rollMode)}`}
        >
          <span className="text-[10px] font-black uppercase tracking-tighter mb-0.5 opacity-70">模式</span>
          <span className="text-sm font-black">{getModeLabel(rollMode)}</span>
        </button>
      </div>

      {/* 當前擲骰摘要 (最新的結果) */}
      {rollHistory.length > 0 && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="text-center py-4 bg-slate-900/40 rounded-3xl border border-slate-800 shadow-xl mb-2 relative overflow-hidden">
             <div className="absolute top-0 right-0 px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-bl-xl bg-slate-800 text-slate-500 border-l border-b border-slate-700">
              最新結果
            </div>
            <div className="text-slate-500 text-xs font-black uppercase tracking-widest mb-1">總結點數</div>
            <div className={`text-7xl font-black font-fantasy leading-tight ${getTotalTextColorClass(rollHistory[0])}`}>
              {rollHistory[0].total}
            </div>
            <div className="flex flex-col items-center mt-1">
              <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">{rollHistory[0].formula}</span>
              {rollHistory[0].modifier !== 0 && (
                <div className="text-[11px] text-slate-400 font-bold mt-0.5">
                  修正值: {rollHistory[0].modifier > 0 ? '+' : ''}{rollHistory[0].modifier}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 手動輸入區 */}
      <div className="space-y-2">
        <div className="relative group">
          <input
            type="text"
            value={diceInput}
            onChange={(e) => setDiceInput(e.target.value)}
            placeholder="點擊上方骰子或手動輸入 (例: 2d6 + 5)"
            className="w-full bg-slate-900/60 rounded-2xl border border-slate-700 p-5 text-xl font-mono text-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 shadow-inner placeholder:text-slate-600 placeholder:italic placeholder:text-sm"
          />
          {diceInput && (
            <button 
              onClick={clearSelection}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-2"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 控制按鈕 */}
      <div className="flex gap-3">
        <button
          onClick={clearSelection}
          disabled={!diceInput || isRolling}
          className="flex-1 bg-slate-800 text-slate-400 py-4 rounded-2xl border border-slate-700 font-bold active:bg-slate-700 disabled:opacity-30 transition-all shadow-md"
        >
          清空
        </button>
        <button
          onClick={executeRoll}
          disabled={!diceInput || isRolling}
          className={`flex-[2] py-4 rounded-2xl font-black text-2xl shadow-lg transition-all active:scale-95 
            ${diceInput 
              ? 'bg-amber-600 text-white shadow-amber-900/30' 
              : 'bg-slate-800 text-slate-600 border border-slate-700 opacity-50'}`}
        >
          {isRolling ? '投擲中...' : 'ROLL !'}
        </button>
      </div>

      {/* 擲骰紀錄清單 */}
      <div className="space-y-4 pt-2">
        <div className="flex justify-between items-center px-1 border-b border-slate-800 pb-2">
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">擲骰紀錄 (保留10筆)</div>
          {rollHistory.length > 0 && (
            <button onClick={clearHistory} className="text-[10px] text-rose-400/60 hover:text-rose-400 font-bold uppercase">清除紀錄</button>
          )}
        </div>
        
        {rollHistory.length > 0 ? (
          <div className="flex flex-col gap-4">
            {rollHistory.map((record, rIdx) => (
              <div key={record.timestamp} className={`bg-slate-800/20 rounded-2xl p-4 border transition-colors ${rIdx === 0 ? 'border-amber-500/40 bg-amber-500/5 shadow-inner' : 'border-slate-800/60'}`}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-black text-slate-400 uppercase font-mono">{record.formula}</span>
                      {record.mode !== 'normal' && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase border ${getModeColor(record.mode)}`}>
                          {getModeLabel(record.mode)}
                        </span>
                      )}
                    </div>
                    <div className="text-[9px] text-slate-600 font-bold">{new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                  </div>
                  <div className="text-right">
                    <span className={`text-2xl font-black font-fantasy leading-none ${getTotalTextColorClass(record)}`}>
                      {record.total}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {record.details.map((detail, dIdx) => (
                    <div key={dIdx} className="flex flex-wrap gap-1.5 items-center">
                      {detail.rawResults ? (
                        detail.rawResults.map((pair, pIdx) => (
                          <div key={pIdx} className="flex gap-1 bg-slate-900/60 p-1 rounded-lg border border-slate-800/50">
                            {pair.map((val, vIdx) => {
                              const isSelected = record.mode === 'advantage' 
                                ? val === Math.max(...pair) && (vIdx === pair.indexOf(val))
                                : val === Math.min(...pair) && (vIdx === pair.indexOf(val));
                              
                              const colorClass = getDieColorClasses(detail.die, val, isSelected);

                              return (
                                <div key={vIdx} className={`w-7 h-7 rounded flex items-center justify-center font-mono font-black text-[11px] border transition-all ${colorClass}`}>
                                  {val}
                                </div>
                              );
                            })}
                          </div>
                        ))
                      ) : (
                        detail.results.map((res, resIdx) => {
                          const colorClass = getDieColorClasses(detail.die, res, true);
                          return (
                            <div key={resIdx} className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-black text-sm border shadow-inner ${colorClass}`}>
                              {res}
                            </div>
                          );
                        })
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          !isRolling && (
            <div className="py-12 flex flex-col items-center justify-center text-slate-600 italic text-center gap-4 opacity-40">
              <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-slate-700">🎲</div>
              <p className="text-sm font-medium tracking-wide">「諸神正在等待你的投擲...」</p>
            </div>
          )
        )}
      </div>
    </div>
  );
};
