
import React, { useState } from 'react';

interface Spell {
  id: string;
  name: string;
  level: number;
  isPrepared: boolean;
  school: string;
  castingTime: string;
  range: string;
}

const INITIAL_SPELLS: Spell[] = [
  { id: '1', name: '法師之手 (Mage Hand)', level: 0, isPrepared: true, school: '咒法', castingTime: '1 動作', range: '30 呎' },
  { id: '2', name: '初級幻術 (Minor Illusion)', level: 0, isPrepared: true, school: '幻術', castingTime: '1 動作', range: '30 呎' },
  { id: '3', name: '護盾術 (Shield)', level: 1, isPrepared: true, school: '防護', castingTime: '1 反應', range: '自身' },
  { id: '4', name: '魔法飛彈 (Magic Missile)', level: 1, isPrepared: true, school: '塑能', castingTime: '1 動作', range: '120 呎' },
  { id: '5', name: '隱形術 (Invisibility)', level: 2, isPrepared: false, school: '幻術', castingTime: '1 動作', range: '觸碰' },
];

export const SpellsView: React.FC = () => {
  const [spellSlots, setSpellSlots] = useState({
    1: { current: 4, max: 4 },
    2: { current: 2, max: 2 },
  });

  return (
    <div className="px-4 py-6 space-y-6 h-full overflow-y-auto pb-24 select-none">
      <h2 className="text-2xl font-fantasy text-amber-500 border-b border-amber-900/30 pb-2">法術書</h2>
      
      {/* 法術位追蹤 */}
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(spellSlots).map(([level, data]) => (
          <div key={level} className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800 flex flex-col items-center">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">環階 {level}</span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setSpellSlots(prev => ({ ...prev, [level]: { ...data, current: Math.max(0, data.current - 1) } }))}
                className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-lg active:bg-indigo-900/40"
              >
                -
              </button>
              <span className="text-xl font-mono font-black text-indigo-400">{data.current} / {data.max}</span>
              <button 
                onClick={() => setSpellSlots(prev => ({ ...prev, [level]: { ...data, current: Math.min(data.max, data.current + 1) } }))}
                className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-lg active:bg-indigo-900/40"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 法術列表 */}
      <div className="space-y-4">
        {[0, 1, 2].map(lvl => (
          <div key={lvl} className="space-y-2">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-tighter px-1">
              {lvl === 0 ? '戲法 (Cantrips)' : `環階 ${lvl} 法術`}
            </h3>
            <div className="space-y-1.5">
              {INITIAL_SPELLS.filter(s => s.level === lvl).map(spell => (
                <div key={spell.id} className="bg-slate-800/40 border border-slate-700/50 p-3 rounded-xl flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[14px] font-bold text-slate-200">{spell.name}</span>
                    <span className="text-[10px] text-slate-500">{spell.school} • {spell.castingTime} • {spell.range}</span>
                  </div>
                  {lvl > 0 && (
                    <div className={`w-2 h-2 rounded-full ${spell.isPrepared ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-slate-700'}`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
