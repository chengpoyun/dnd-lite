
import React, { useState } from 'react';
import { CharacterStats, CustomRecord } from '../types';
import { getModifier, getProfBonus, evaluateValue } from '../utils/helpers';

interface CharacterSheetProps {
  stats: CharacterStats;
  setStats: React.Dispatch<React.SetStateAction<CharacterStats>>;
}

const STAT_LABELS: Record<string, string> = {
  str: "力量", dex: "敏捷", con: "體質", int: "智力", wis: "感知", cha: "魅力"
};

const SKILLS = [
  { name: "運動", base: "str" }, { name: "特技", base: "dex" }, { name: "巧手", base: "dex" }, { name: "隱匿", base: "dex" },
  { name: "奧法", base: "int" }, { name: "歷史", base: "int" }, { name: "調查", base: "int" }, { name: "自然", base: "int" }, { name: "宗教", base: "int" },
  { name: "馴獸", base: "wis" }, { name: "察言", base: "wis" }, { name: "醫術", base: "wis" }, { name: "觀察", base: "wis" }, { name: "生存", base: "wis" },
  { name: "欺瞞", base: "cha" }, { name: "威嚇", base: "cha" }, { name: "表演", base: "cha" }, { name: "說服", base: "cha" },
];

export const CharacterSheet: React.FC<CharacterSheetProps> = ({ stats, setStats }) => {
  const [modal, setModal] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<CustomRecord | null>(null);
  const [tempVal, setTempVal] = useState('');
  
  const profBonus = getProfBonus(stats.level);

  const toggleSkill = (name: string) => {
    setStats(prev => ({
      ...prev,
      proficiencies: prev.proficiencies.includes(name) 
        ? prev.proficiencies.filter(s => s !== name) 
        : [...prev.proficiencies, name]
    }));
  };

  const handleHPChange = () => {
    const current = evaluateValue(tempVal, stats.hp.current, stats.hp.max);
    setStats(prev => ({ ...prev, hp: { ...prev.hp, current } }));
    setModal(null);
  };

  return (
    <div className="p-3 space-y-4 select-none">
      {/* Header */}
      <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-2xl">
            {stats.avatarUrl ? <img src={stats.avatarUrl} className="w-full h-full rounded-full object-cover" /> : "👤"}
          </div>
          <div>
            <h1 className="text-lg font-fantasy text-white leading-none">{stats.name}</h1>
            <p className="text-[10px] text-slate-500 font-black mt-1 uppercase">LV {stats.level} {stats.class}</p>
          </div>
        </div>
        <div 
          onClick={() => { setTempVal(''); setModal('hp'); }}
          className={`px-3 py-1 rounded-full border-2 text-center transition-all active:scale-90 cursor-pointer ${stats.hp.current < stats.hp.max * 0.3 ? 'border-rose-500 bg-rose-950/30' : 'border-emerald-500 bg-emerald-950/30'}`}
        >
          <span className="text-[10px] block font-black opacity-60">HP</span>
          <span className="text-lg font-black">{stats.hp.current} / {stats.hp.max}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2">
        {Object.entries(stats.abilityScores).map(([key, val]) => {
          const mod = getModifier(val);
          return (
            <div key={key} className="bg-slate-800/60 p-2 rounded-xl border border-slate-700 text-center">
              <span className="text-[10px] font-black text-slate-500 uppercase">{STAT_LABELS[key]}</span>
              <div className="text-2xl font-fantasy text-amber-500 font-bold leading-tight">{val}</div>
              <div className="text-xs font-bold text-slate-400">{mod >= 0 ? '+' : ''}{mod}</div>
            </div>
          );
        })}
      </div>

      {/* Skills */}
      <div className="bg-slate-900/40 p-3 rounded-2xl border border-slate-800 shadow-inner">
        <div className="flex justify-between items-center mb-2 border-b border-slate-800 pb-1">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">技能與熟練</h3>
          <span className="text-[10px] font-black text-amber-500 uppercase">熟練 +{profBonus}</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {SKILLS.map(s => {
            const isProf = stats.proficiencies.includes(s.name);
            const mod = getModifier((stats.abilityScores as any)[s.base]) + (isProf ? profBonus : 0);
            return (
              <div 
                key={s.name} 
                onClick={() => toggleSkill(s.name)}
                className={`flex justify-between items-center px-2 py-1.5 rounded-lg border transition-all active:scale-95 ${isProf ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-800/20 border-slate-800'}`}
              >
                <span className={`text-xs truncate ${isProf ? 'text-amber-400 font-bold' : 'text-slate-500'}`}>{s.name}</span>
                <span className={`text-sm font-mono font-black ${isProf ? 'text-white' : 'text-slate-600'}`}>{mod >= 0 ? '+' : ''}{mod}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* HP Modal */}
      {modal === 'hp' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" onClick={() => setModal(null)} />
          <div className="relative bg-slate-900 border border-slate-700 w-full max-w-xs rounded-2xl p-6 shadow-2xl animate-in zoom-in duration-150">
            <h3 className="text-base font-fantasy text-emerald-500 mb-4 border-b border-slate-800 pb-2">修改生命值</h3>
            <input 
              type="text" value={tempVal} onChange={e => setTempVal(e.target.value)} 
              className="w-full bg-slate-800 border border-slate-700 rounded-xl py-4 text-4xl text-center text-white focus:outline-none" 
              placeholder={stats.hp.current.toString()} autoFocus
            />
            <div className="flex gap-2 mt-6">
              <button onClick={() => setModal(null)} className="flex-1 py-3 bg-slate-800 rounded-xl font-bold text-slate-400">取消</button>
              <button onClick={handleHPChange} className="flex-1 py-3 bg-emerald-600 rounded-xl font-bold text-white">套用</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
