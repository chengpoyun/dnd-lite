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
      <h2 className="text-2xl font-fantasy text-amber-500 border-b border-amber-900/30 pb-2">擲骰密室</h2>

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
          placeholder="例: 2d6 + 5"
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
        <div className="text-[14px] font-black text-slate-500 uppercase tracking-widest px-1 border-b border-slate-800 pb-2">擲骰紀錄</div>
        {rollHistory.map((record, rIdx) => (
          <div key={record.timestamp} className={`bg-slate-800/20 rounded-2xl p-4 border ${rIdx === 0 ? 'border-amber-500/40 bg-amber-500/5' : 'border-slate-800/60'}`}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="text-[14px] font-black text-slate-400 uppercase font-mono">{record.formula}</span>
                <div className="text-[14px] text-slate-600 font-bold">{new Date(record.timestamp).toLocaleTimeString()}</div>
              </div>
              <span className={`text-[28px] font-black font-fantasy leading-none ${getTotalTextColorClass(record)}`}>
                {record.total}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};