import React, { useState, useEffect } from 'react';
import { CharacterSheet } from './components/CharacterSheet';
import { DiceRoller } from './components/DiceRoller';
import { CombatView } from './components/CombatView';
import { SpellsView } from './components/SpellsView';
import { InventoryView } from './components/InventoryView';
import { CharacterStats } from './types';

enum Tab {
  CHARACTER = 'character',
  COMBAT = 'combat',
  SPELLS = 'spells',
  ITEMS = 'items',
  DICE = 'dice'
}

const STORAGE_KEY = 'dnd_char_stats_v3';

const INITIAL_STATS: CharacterStats = {
  name: "吉姆利",
  class: "戰士",
  level: 3,
  exp: 2700,
  hp: { current: 32, max: 32, temp: 0 },
  hitDice: { current: 3, total: 3, die: "d10" },
  ac: 18,
  initiative: 0,
  speed: 30,
  abilityScores: { str: 16, dex: 10, con: 16, int: 8, wis: 12, cha: 10 },
  savingThrows: { str: true, con: true },
  proficiencies: { "运动": 2, "威吓": 1, "洞察": 1 },
  currency: { cp: 0, sp: 0, ep: 0, gp: 150, pp: 0 }
};

const deepMerge = (target: any, source: any): any => {
  const result = { ...target };
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
};

const AppDev: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.CHARACTER);
  
  const [stats, setStats] = useState<CharacterStats>(() => {
    try {
      const savedString = localStorage.getItem(STORAGE_KEY);
      if (savedString) {
        const parsed = JSON.parse(savedString);
        if (Array.isArray(parsed.proficiencies)) {
          const record: Record<string, number> = {};
          parsed.proficiencies.forEach((skill: string) => { record[skill] = 1; });
          parsed.proficiencies = record;
        }
        return deepMerge(INITIAL_STATS, parsed);
      }
    } catch (e) {
      console.error("Critical: Character data loading failed", e);
    }
    return INITIAL_STATS;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  }, [stats]);

  const renderContent = () => {
    switch (activeTab) {
      case Tab.CHARACTER: return <CharacterSheet stats={stats} setStats={setStats} />;
      case Tab.COMBAT: return <CombatView stats={stats} setStats={setStats} />;
      case Tab.SPELLS: return <SpellsView />;
      case Tab.ITEMS: return <InventoryView stats={stats} setStats={setStats} />;
      case Tab.DICE: return <DiceRoller />;
      default: return <CharacterSheet stats={stats} setStats={setStats} />;
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto overflow-hidden bg-slate-950">
      {/* 開發模式提示 */}
      <div className="bg-amber-600 text-slate-900 text-xs px-2 py-1 text-center font-medium">
        🔧 開發模式 - 認證功能暫時停用
      </div>
      
      <main className="flex-1 overflow-y-auto pb-16">
        {renderContent()}
      </main>

      {/* 底部導航列 */}
      <nav className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-slate-900 border-t border-slate-800 z-50">
        <div className="flex items-center justify-around py-2 px-1">
          <button onClick={() => setActiveTab(Tab.CHARACTER)} className={`flex flex-col items-center flex-1 transition-all duration-200 ${activeTab === Tab.CHARACTER ? 'text-amber-500 scale-110' : 'text-slate-500'}`}>
            <span className="text-xl">👤</span>
            <span className="text-[14px] mt-0.5 font-black uppercase tracking-tighter">角色</span>
          </button>
          <button onClick={() => setActiveTab(Tab.COMBAT)} className={`flex flex-col items-center flex-1 transition-all duration-200 ${activeTab === Tab.COMBAT ? 'text-amber-500 scale-110' : 'text-slate-500'}`}>
            <span className="text-xl">⚔️</span>
            <span className="text-[14px] mt-0.5 font-black uppercase tracking-tighter">戰鬥</span>
          </button>
          <button onClick={() => setActiveTab(Tab.SPELLS)} className={`flex flex-col items-center flex-1 transition-all duration-200 ${activeTab === Tab.SPELLS ? 'text-amber-500 scale-110' : 'text-slate-500'}`}>
            <span className="text-xl">✨</span>
            <span className="text-[14px] mt-0.5 font-black uppercase tracking-tighter">法術</span>
          </button>
          <button onClick={() => setActiveTab(Tab.ITEMS)} className={`flex flex-col items-center flex-1 transition-all duration-200 ${activeTab === Tab.ITEMS ? 'text-amber-500 scale-110' : 'text-slate-500'}`}>
            <span className="text-xl">🎒</span>
            <span className="text-[14px] mt-0.5 font-black uppercase tracking-tighter">道具</span>
          </button>
          <button onClick={() => setActiveTab(Tab.DICE)} className={`flex flex-col items-center flex-1 transition-all duration-200 ${activeTab === Tab.DICE ? 'text-amber-500 scale-110' : 'text-slate-500'}`}>
            <span className="text-xl">🎲</span>
            <span className="text-[14px] mt-0.5 font-black uppercase tracking-tighter">擲骰</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default AppDev;