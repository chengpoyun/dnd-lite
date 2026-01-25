
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
  proficiencies: ["運動", "威嚇", "歷史", "生存"],
  savingProficiencies: ["str", "con"],
  downtime: 14,
  renown: { used: 1200, total: 5000 },
  prestige: { org: "皇家古生物學院", level: 1, rankName: "階級一" },
  attacks: [
    { name: "戰斧 (雙手)", bonus: 5, damage: "1d10 + 3", type: "揮砍" },
    { name: "戰斧 (單手)", bonus: 5, damage: "1d8 + 3", type: "揮砍" },
    { name: "手弩", bonus: 2, damage: "1d6", type: "穿刺" }
  ],
  currency: { cp: 120, sp: 45, ep: 0, gp: 320, pp: 5 },
  avatarUrl: undefined,
  customRecords: [
    { id: 'initial-prestige', name: "皇家古生物學院", value: "1", note: "階級一" }
  ]
};

const deepMerge = (initial: any, saved: any): any => {
  const result = { ...initial, ...saved };
  for (const key in initial) {
    if (initial[key] && typeof initial[key] === 'object' && !Array.isArray(initial[key])) {
      result[key] = { ...initial[key], ...(saved[key] || {}) };
    }
    // 確保數組也被正確保留
    if (Array.isArray(initial[key]) && Array.isArray(saved[key])) {
      result[key] = saved[key];
    }
  }
  return result;
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.CHARACTER);
  
  const [stats, setStats] = useState<CharacterStats>(() => {
    try {
      const savedString = localStorage.getItem(STORAGE_KEY);
      if (savedString) {
        const parsed = JSON.parse(savedString);
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
      <main className="flex-1 overflow-y-auto pb-16">
        {renderContent()}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-slate-900/95 backdrop-blur-md border-t border-slate-800 safe-bottom shadow-2xl z-50">
        <div className="flex justify-around items-center h-16">
          <button onClick={() => setActiveTab(Tab.CHARACTER)} className={`flex flex-col items-center flex-1 transition-all duration-200 ${activeTab === Tab.CHARACTER ? 'text-amber-500 scale-110' : 'text-slate-500'}`}>
            <span className="text-xl">👤</span>
            <span className="text-[10px] mt-0.5 font-black uppercase tracking-tighter">角色</span>
          </button>
          <button onClick={() => setActiveTab(Tab.COMBAT)} className={`flex flex-col items-center flex-1 transition-all duration-200 ${activeTab === Tab.COMBAT ? 'text-amber-500 scale-110' : 'text-slate-500'}`}>
            <span className="text-xl">⚔️</span>
            <span className="text-[10px] mt-0.5 font-black uppercase tracking-tighter">戰鬥</span>
          </button>
          <button onClick={() => setActiveTab(Tab.SPELLS)} className={`flex flex-col items-center flex-1 transition-all duration-200 ${activeTab === Tab.SPELLS ? 'text-amber-500 scale-110' : 'text-slate-500'}`}>
            <span className="text-xl">📖</span>
            <span className="text-[10px] mt-0.5 font-black uppercase tracking-tighter">法術</span>
          </button>
          <button onClick={() => setActiveTab(Tab.ITEMS)} className={`flex flex-col items-center flex-1 transition-all duration-200 ${activeTab === Tab.ITEMS ? 'text-amber-500 scale-110' : 'text-slate-500'}`}>
            <span className="text-xl">🎒</span>
            <span className="text-[10px] mt-0.5 font-black uppercase tracking-tighter">道具</span>
          </button>
          <button onClick={() => setActiveTab(Tab.DICE)} className={`flex flex-col items-center flex-1 transition-all duration-200 ${activeTab === Tab.DICE ? 'text-amber-500 scale-110' : 'text-slate-500'}`}>
            <span className="text-xl">🎲</span>
            <span className="text-[10px] mt-0.5 font-black uppercase tracking-tighter">擲骰</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default App;
