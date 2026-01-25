
import React, { useState, useEffect } from 'react';
import { CharacterSheet } from './components/CharacterSheet';
import { DiceRoller } from './components/DiceRoller';
import { CombatView } from './components/CombatView';
import { SpellsView } from './components/SpellsView';
import { InventoryView } from './components/InventoryView';
import { CharacterStats } from './types';

enum Tab {
  CHARACTER = 'char',
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
    { name: "戰斧 (單手)", bonus: 5, damage: "1d8 + 3", type: "揮砍" }
  ],
  currency: { cp: 0, sp: 0, ep: 0, gp: 320, pp: 0 },
  customRecords: []
};

const deepMerge = (init: any, saved: any) => {
  const result = { ...init, ...saved };
  for (const key in init) {
    if (init[key] && typeof init[key] === 'object' && !Array.isArray(init[key])) {
      result[key] = { ...init[key], ...(saved[key] || {}) };
    }
  }
  return result;
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.CHARACTER);
  const [stats, setStats] = useState<CharacterStats>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? deepMerge(INITIAL_STATS, JSON.parse(saved)) : INITIAL_STATS;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  }, [stats]);

  const TabButton = ({ tab, icon, label }: { tab: Tab, icon: string, label: string }) => (
    <button 
      onClick={() => setActiveTab(tab)} 
      className={`flex flex-col items-center flex-1 transition-all duration-200 ${activeTab === tab ? 'text-amber-500 scale-110' : 'text-slate-500'}`}
    >
      <span className="text-xl">{icon}</span>
      <span className="text-[9px] mt-0.5 font-black uppercase tracking-tighter">{label}</span>
    </button>
  );

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto overflow-hidden bg-slate-950 shadow-2xl">
      <main className="flex-1 overflow-y-auto pb-20">
        {activeTab === Tab.CHARACTER && <CharacterSheet stats={stats} setStats={setStats} />}
        {activeTab === Tab.COMBAT && <CombatView stats={stats} setStats={setStats} />}
        {activeTab === Tab.SPELLS && <SpellsView />}
        {activeTab === Tab.ITEMS && <InventoryView stats={stats} setStats={setStats} />}
        {activeTab === Tab.DICE && <DiceRoller />}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-slate-900/95 backdrop-blur-md border-t border-slate-800 safe-bottom z-50">
        <div className="flex justify-around items-center h-16 px-2">
          <TabButton tab={Tab.CHARACTER} icon="👤" label="角色" />
          <TabButton tab={Tab.COMBAT} icon="⚔️" label="戰鬥" />
          <TabButton tab={Tab.DICE} icon="🎲" label="擲骰" />
          <TabButton tab={Tab.ITEMS} icon="🎒" label="道具" />
          <TabButton tab={Tab.SPELLS} icon="📖" label="法術" />
        </div>
      </nav>
    </div>
  );
};

export default App;
