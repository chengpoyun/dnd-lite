
import React, { useState } from 'react';
import { CharacterStats } from '../types';

interface SkillsViewProps {
  stats: CharacterStats;
  setStats: React.Dispatch<React.SetStateAction<CharacterStats>>;
}

const STAT_LABELS: Record<keyof CharacterStats['abilityScores'], string> = {
  str: "力量 (STR)", dex: "敏捷 (DEX)", con: "體質 (CON)", int: "智力 (INT)", wis: "感知 (WIS)", cha: "魅力 (CHA)"
};

const SKILLS_MAP: { name: string; base: keyof CharacterStats['abilityScores'] }[] = [
  { name: "運動", base: "str" },
  { name: "特技", base: "dex" }, { name: "巧手", base: "dex" }, { name: "隱匿", base: "dex" },
  { name: "奧法", base: "int" }, { name: "歷史", base: "int" }, { name: "調查", base: "int" }, { name: "自然", base: "int" }, { name: "宗教", base: "int" },
  { name: "馴獸", base: "wis" }, { name: "察言", base: "wis" }, { name: "醫術", base: "wis" }, { name: "觀察", base: "wis" }, { name: "生存", base: "wis" },
  { name: "欺瞞", base: "cha" }, { name: "威嚇", base: "cha" }, { name: "表演", base: "cha" }, { name: "說服", base: "cha" },
];

export const SkillsView: React.FC<SkillsViewProps> = ({ stats, setStats }) => {
  const [selectedSkill, setSelectedSkill] = useState<{ name: string; base: keyof CharacterStats['abilityScores'] } | null>(null);
  
  const getModifier = (score: number) => Math.floor((score - 10) / 2);
  const profBonus = Math.ceil(stats.level / 4) + 1;

  // Fix: Handle proficiencies as a Record<string, number> instead of an array.
  // Updated to correctly manage Record updates.
  const toggleSkill = (skillName: string) => {
    setStats(prev => {
      const newProfs = { ...prev.proficiencies };
      if (newProfs[skillName]) {
        delete newProfs[skillName];
      } else {
        newProfs[skillName] = 1;
      }
      return { ...prev, proficiencies: newProfs };
    });
    setSelectedSkill(null);
  };

  const groupedSkills = SKILLS_MAP.reduce((acc, skill) => {
    if (!acc[skill.base]) acc[skill.base] = [];
    acc[skill.base].push(skill);
    return acc;
  }, {} as Record<string, typeof SKILLS_MAP>);

  return (
    <div className="px-4 py-6 space-y-6 h-full overflow-y-auto pb-24 select-none">
      <div className="flex justify-between items-baseline border-b border-slate-800 pb-2">
        <h2 className="text-2xl font-fantasy text-amber-500">技能調整</h2>
        <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">熟練 +{profBonus}</span>
      </div>
      
      <div className="space-y-6">
        {Object.entries(groupedSkills).map(([base, skills]) => (
          <div key={base} className="space-y-2">
            <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest px-1 border-l-2 border-indigo-500/50 ml-1 pl-2">
              {STAT_LABELS[base as keyof CharacterStats['abilityScores']]}
            </h3>
            <div className="grid grid-cols-1 gap-1.5">
              {skills.map(skill => {
                // Fix: Look up proficiency in the record object instead of using array methods.
                const profLevel = stats.proficiencies[skill.name] || 0;
                const isProf = profLevel > 0;
                const baseMod = getModifier(stats.abilityScores[skill.base]);
                const bonus = baseMod + (profLevel * profBonus);

                return (
                  <button
                    key={skill.name}
                    onClick={() => setSelectedSkill(skill)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all active:scale-[0.98]
                      ${isProf 
                        ? 'bg-amber-500/10 border-amber-500/40' 
                        : 'bg-slate-800/40 border-slate-700/50'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all
                        ${isProf 
                          ? 'bg-amber-500 border-amber-400 text-slate-950' 
                          : 'bg-slate-900 border-slate-700 text-transparent'
                        }`}
                      >
                        <span className="text-[10px] font-black">✓</span>
                      </div>
                      <span className={`text-[15px] font-bold ${isProf ? 'text-amber-400' : 'text-slate-300'}`}>
                        {skill.name}
                      </span>
                    </div>
                    <span className={`text-xl font-mono font-black ${isProf ? 'text-white' : 'text-slate-500'}`}>
                      {bonus >= 0 ? '+' : ''}{bonus}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 技能編輯彈窗 */}
      {selectedSkill && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" onClick={() => setSelectedSkill(null)} />
          <div className="relative bg-slate-900 border border-slate-700 w-full max-w-xs rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="text-center mb-6">
              <h3 className="text-xl font-fantasy text-amber-500 mb-1">{selectedSkill.name}</h3>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                關聯屬性：{STAT_LABELS[selectedSkill.base]}
              </p>
            </div>

            <div className="bg-slate-950/50 rounded-xl p-4 mb-6 border border-slate-800">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-slate-400 font-bold">屬性加成</span>
                <span className="text-sm font-mono text-white">
                  {getModifier(stats.abilityScores[selectedSkill.base]) >= 0 ? '+' : ''}
                  {getModifier(stats.abilityScores[selectedSkill.base])}
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-800 pt-2 mb-2">
                <span className="text-xs text-slate-400 font-bold">熟練獎勵</span>
                {/* Fix: Check Record for proficiency and correctly multiply by proficiency level (1 or 2). */}
                <span className={`text-sm font-mono ${(stats.proficiencies[selectedSkill.name] || 0) > 0 ? 'text-amber-500' : 'text-slate-600'}`}>
                  {(stats.proficiencies[selectedSkill.name] || 0) > 0 ? `+${(stats.proficiencies[selectedSkill.name] || 1) * profBonus}` : '+0'}
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-700 pt-2">
                <span className="text-sm text-amber-500 font-black">最終加值</span>
                {/* Fix: Calculation logic for Record-based proficiency. */}
                <span className="text-2xl font-mono font-black text-white">
                  {(((stats.proficiencies[selectedSkill.name] || 0) * profBonus) + getModifier(stats.abilityScores[selectedSkill.base])) >= 0 ? '+' : ''}
                  {((stats.proficiencies[selectedSkill.name] || 0) * profBonus) + getModifier(stats.abilityScores[selectedSkill.base])}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <button 
                // Fix: Check Record key existence for button state and label.
                onClick={() => toggleSkill(selectedSkill.name)}
                className={`w-full py-4 rounded-xl font-black text-lg transition-all active:scale-95 shadow-lg
                  ${(stats.proficiencies[selectedSkill.name] || 0) > 0
                    ? 'bg-slate-800 text-red-400 border border-red-900/30'
                    : 'bg-amber-600 text-white shadow-amber-900/20'
                  }`}
              >
                {(stats.proficiencies[selectedSkill.name] || 0) > 0 ? '取消熟練' : '標記為熟練'}
              </button>
              <button 
                onClick={() => setSelectedSkill(null)}
                className="w-full py-3 bg-transparent text-slate-500 font-bold text-sm"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
