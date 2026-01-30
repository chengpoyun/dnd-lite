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

        // 支援 kh (keep highest) 和 kl (keep lowest) 語法
        // 例如：2d20kh1 = 擲 2 顆 d20，保留最高的 1 顆
        const keepMatch = p.match(/^(\d*)d(\d+)k([hl])(\d+)$/);
        const diceMatch = p.match(/^(\d*)d(\d+)$/);
        
        if (keepMatch) {
          const count = parseInt(keepMatch[1]) || 1;
          const sides = parseInt(keepMatch[2]);
          const keepType = keepMatch[3]; // 'h' 或 'l'
          const keepCount = parseInt(keepMatch[4]);
          
          if (keepCount >= count) {
            // 如果要保留的數量 >= 擲骰數量，視為一般擲骰
            const results: number[] = [];
            for (let i = 0; i < count; i++) {
              results.push(Math.floor(Math.random() * sides) + 1);
            }
            const subtotal = results.reduce((a, b) => a + b, 0);
            grandTotal += subtotal;
            details.push({ die: sides, results, subtotal });
          } else {
            // 擲出所有骰子
            const allRolls: number[] = [];
            for (let i = 0; i < count; i++) {
              allRolls.push(Math.floor(Math.random() * sides) + 1);
            }
            
            // 排序並決定保留哪些
            const sorted = [...allRolls].sort((a, b) => keepType === 'h' ? b - a : a - b);
            const kept = sorted.slice(0, keepCount);
            const keptSet = new Set<number>();
            
            // 標記哪些骰子被保留（處理重複數字的情況）
            const rollsWithIndex = allRolls.map((val, idx) => ({ val, idx, kept: false }));
            kept.forEach(keptValue => {
              const found = rollsWithIndex.find(r => r.val === keptValue && !r.kept);
              if (found) found.kept = true;
            });
            
            // 建立原始結果（每個擲骰配對其是否被保留）
            const rawResults: number[][] = [];
            const results: number[] = [];
            
            rollsWithIndex.forEach(roll => {
              rawResults.push([roll.val, roll.kept ? 1 : 0]); // [骰子值, 是否被保留]
              if (roll.kept) results.push(roll.val);
            });
            
            const subtotal = results.reduce((a, b) => a + b, 0);
            grandTotal += subtotal;
            details.push({ 
              die: sides, 
              results, 
              rawResults,
              subtotal 
            });
          }
        } else if (diceMatch) {
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

  const getTotalTextColorClass = (record: BatchRollResult) => {
    const d20Details = record.details.filter(d => d.die === 20);
    const allD20Results = d20Details.flatMap(d => d.results);
    if (allD20Results.includes(20)) return 'text-emerald-500';
    if (allD20Results.includes(1)) return 'text-rose-500';
    return 'text-amber-500';
  };

  const getDieColorClasses = (dieSides: number, value: number, isSelected: boolean = true) => {
    if (dieSides === 20) {
      if (value === 20) return isSelected ? 'bg-emerald-600 border-emerald-400 text-white' : 'text-emerald-400 opacity-60';
      if (value === 1) return isSelected ? 'bg-rose-600 border-rose-400 text-white' : 'text-rose-400 opacity-60';
      return isSelected ? 'bg-amber-500 border-amber-400 text-slate-950' : 'text-amber-400 opacity-40';
    }
    if (!isSelected) return 'text-slate-200 border-slate-600 opacity-40';
    if (value === dieSides) return 'bg-amber-500 border-amber-400 text-slate-950';
    return 'bg-slate-950 border-slate-800 text-slate-300';
  };

  return (
    <div className="flex flex-col gap-6 p-4 select-none h-full overflow-y-auto pb-24">
      <div className="grid grid-cols-4 gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
        {DICE_TYPES.map(d => (
          <button
            key={d}
            onClick={() => addDie(d)}
            disabled={isRolling}
            className="flex flex-col items-center justify-center py-4 bg-slate-800/50 rounded-2xl border border-slate-700 active:bg-amber-500/20 transition-all active:scale-90 shadow-sm"
          >
            <span className="text-amber-400 font-black text-[20px]">d{d}</span>
          </button>
        ))}
        <button
          onClick={toggleRollMode}
          disabled={isRolling}
          className={`flex flex-col items-center justify-center py-4 rounded-2xl border transition-all active:scale-90 shadow-sm ${getModeColor(rollMode)}`}
        >
          <span className="text-[14px] font-black uppercase tracking-tighter mb-0.5 opacity-70">模式</span>
          <span className="text-[15px] font-black">{getModeLabel(rollMode)}</span>
        </button>
      </div>

      <div className="space-y-2">
        <input
          type="text"
          value={diceInput}
          onChange={(e) => setDiceInput(e.target.value)}
          placeholder="例: 2d20kh1, 3d6+5"
          className="w-full bg-slate-900/60 rounded-2xl border border-slate-700 p-5 text-2xl font-mono text-amber-400 focus:outline-none placeholder:text-slate-600 placeholder:text-[14px]"
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={clearSelection}
          disabled={!diceInput || isRolling}
          className="flex-1 bg-slate-800 text-slate-400 py-4 rounded-2xl border border-slate-700 font-bold active:bg-slate-700 text-[16px]"
        >
          清空
        </button>
        <button
          onClick={executeRoll}
          disabled={!diceInput || isRolling}
          className={`flex-[2] py-4 rounded-2xl font-black text-2xl shadow-lg transition-all active:scale-95 bg-amber-600 text-white`}
        >
          {isRolling ? '投擲中...' : 'ROLL !'}
        </button>
      </div>

      <div className="space-y-4 pt-2">
        <div className="flex justify-between items-center px-1 border-b border-slate-800 pb-2">
          <div className="text-[18px] font-black text-slate-500 uppercase tracking-widest">擲骰紀錄</div>
          {rollHistory.length > 0 && (
            <button
              onClick={() => setRollHistory([])}
              className="text-[14px] font-bold text-slate-600 hover:text-rose-400 transition-colors active:scale-95"
            >
              清除紀錄
            </button>
          )}
        </div>
        {rollHistory.map((record, rIdx) => (
          <div key={record.timestamp} className={`bg-slate-800/20 rounded-2xl p-4 border ${rIdx === 0 ? 'border-amber-500/40 bg-amber-500/5' : 'border-slate-800/60'}`}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="text-[16px] font-black text-slate-400 uppercase font-mono">{record.formula}</span>
                {record.mode !== 'normal' && (
                  <span className={`ml-2 px-2 py-0.5 rounded text-[12px] font-black uppercase ${record.mode === 'advantage' ? 'bg-emerald-600/20 text-emerald-400' : 'bg-rose-600/20 text-rose-400'}`}>
                    {getModeLabel(record.mode)}
                  </span>
                )}
              </div>
              <span className={`text-[36px] font-black font-fantasy leading-none ${getTotalTextColorClass(record)}`}>
                {record.total}
              </span>
            </div>
            
            {/* 顯示骰子詳情 */}
            <div className="space-y-2">
              {record.details.map((detail, dIdx) => (
                <div key={dIdx} className="flex items-center gap-2 flex-wrap">
                  <span className="text-[16px] text-slate-500 font-bold">d{detail.die}:</span>
                  {detail.rawResults ? (
                    // 檢查是 kh/kl 模式還是優勢/劣勢模式
                    detail.rawResults[0] && detail.rawResults[0].length === 2 && detail.rawResults[0][1] <= 1 ? (
                      // kh/kl 模式：[骰子值, 是否被保留(0或1)]
                      detail.rawResults.map((data, pIdx) => {
                        const [value, isKept] = data;
                        if (isKept === 1) {
                          // 被保留的骰子：使用明顯的樣式
                          return (
                            <span key={pIdx} className={`inline-flex items-center justify-center w-11 h-11 rounded-lg border-2 font-bold text-[18px] shadow-lg ${getDieColorClasses(detail.die, value, true)}`}>
                              {value}
                            </span>
                          );
                        } else {
                          // 未被保留的骰子：保持可讀但明顯較暗
                          return (
                            <span key={pIdx} className="inline-flex items-center justify-center w-11 h-11 rounded-lg border border-slate-700 font-bold text-[18px] text-slate-400 bg-slate-900/50 opacity-60">
                              {value}
                            </span>
                          );
                        }
                      })
                    ) : (
                      // 優勢/劣勢模式：[骰子1, 骰子2]
                      detail.rawResults.map((pair, pIdx) => {
                        const selected = detail.results[pIdx];
                        const [r1, r2] = pair;
                        const isR1Selected = (record.mode === 'advantage' ? r1 >= r2 : r1 <= r2);
                        return (
                          <div key={pIdx} className="flex gap-1.5">
                            <span className={`inline-flex items-center justify-center w-11 h-11 rounded-lg border-2 font-bold text-[18px] ${getDieColorClasses(detail.die, r1, isR1Selected)}`}>
                              {r1}
                            </span>
                            <span className={`inline-flex items-center justify-center w-11 h-11 rounded-lg border-2 font-bold text-[18px] ${getDieColorClasses(detail.die, r2, !isR1Selected)}`}>
                              {r2}
                            </span>
                          </div>
                        );
                      })
                    )
                  ) : (
                    // 一般模式：只顯示結果
                    detail.results.map((r, rIdx) => (
                      <span key={rIdx} className={`inline-flex items-center justify-center w-11 h-11 rounded-lg border-2 font-bold text-[18px] ${getDieColorClasses(detail.die, r)}`}>
                        {r}
                      </span>
                    ))
                  )}
                  {detail.results.length > 1 && (
                    <span className="text-[16px] text-slate-500 font-bold ml-1">
                      = {detail.subtotal}
                    </span>
                  )}
                </div>
              ))}
              {record.modifier !== 0 && (
                <div className="text-[16px] text-slate-500 font-bold">
                  調整值: {record.modifier > 0 ? '+' : ''}{record.modifier}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};