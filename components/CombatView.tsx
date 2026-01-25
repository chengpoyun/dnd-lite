
import React, { useState, useEffect } from 'react';
import { CharacterStats } from '../types';
import { evaluateValue } from '../utils/helpers';

interface CombatViewProps {
  stats: CharacterStats;
  setStats: React.Dispatch<React.SetStateAction<CharacterStats>>;
}

export const CombatView: React.FC<CombatViewProps> = ({ stats, setStats }) => {
  const [actions, setActions] = useState({ action: 1, bonus: 1, reaction: 1 });
  const [round, setRound] = useState(1);
  const [tempVal, setTempVal] = useState('');

  const nextTurn = () => {
    setRound(prev => prev + 1);
    setActions({ action: 1, bonus: 1, reaction: 1 });
  };

  const useAction = (key: keyof typeof actions) => {
    if (actions[key] > 0) setActions(prev => ({ ...prev, [key]: prev[key] - 1 }));
  };

  const ActionBox = ({ name, type, color, icon }: { name: string, type: keyof typeof actions, color: string, icon: string }) => (
    <button 
      onClick={() => useAction(type)}
      disabled={actions[type] === 0}
      className={`p-4 rounded-2xl border transition-all active:scale-95 flex flex-col items-center justify-center gap-2 ${actions[type] > 0 ? `bg-slate-800/40 border-${color}-500/30` : 'bg-slate-900/20 border-slate-800 opacity-30 grayscale'}`}
    >
      <span className="text-2xl">{icon}</span>
      <div className="text-center">
        <span className={`text-[10px] font-black uppercase tracking-widest block text-${color}-500`}>{name}</span>
        <span className="text-lg font-mono font-black">{actions[type]} / 1</span>
      </div>
    </button>
  );

  return (
    <div className="p-3 space-y-4 select-none">
      <div className="flex justify-between items-center px-1">
        <div className="bg-indigo-950/30 px-3 py-1 rounded-full border border-indigo-500/20">
          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">回合 {round}</span>
        </div>
        <button onClick={nextTurn} className="bg-indigo-600 px-4 py-1.5 rounded-lg text-xs font-black text-white active:scale-95 transition-all">下一回合</button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <ActionBox name="主要動作" type="action" color="amber" icon="⚔️" />
        <ActionBox name="附贈動作" type="bonus" color="indigo" icon="⚡" />
        <ActionBox name="反應動作" type="reaction" color="rose" icon="🛡️" />
      </div>

      <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-800 shadow-inner">
        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 border-b border-slate-800 pb-1">武器攻擊</h3>
        <div className="space-y-2">
          {stats.attacks.map((atk, i) => (
            <div key={i} className="bg-slate-800/40 p-3 rounded-xl border border-slate-700 flex justify-between items-center">
              <div>
                <span className="text-sm font-bold text-slate-200">{atk.name}</span>
                <p className="text-[10px] text-slate-500 mt-0.5">命中: +{atk.bonus} | 傷害: {atk.damage}</p>
              </div>
              <div className="bg-slate-900 px-2 py-1 rounded border border-slate-700 font-mono text-xs text-amber-500 font-bold">Roll</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
