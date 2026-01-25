import React, { useState, useEffect } from 'react';
import { CharacterSheet } from './components/CharacterSheet';
import { DiceRoller } from './components/DiceRoller';
import { CombatView } from './components/CombatView';
import { SpellsView } from './components/SpellsView';
import { InventoryView } from './components/InventoryView';
import { CharacterStats } from './types';
import { CharacterService, CacheService } from './services/database';
import { MigrationService } from './services/migration';

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
  proficiencies: { "運動": 1, "威嚇": 1, "歷史": 1, "生存": 1 },
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
    if (Array.isArray(initial[key]) && Array.isArray(saved[key])) {
      result[key] = saved[key];
    }
  }
  return result;
};

const App: React.FC = () => {
  // 修改預設分頁為 CHARACTER
  const [activeTab, setActiveTab] = useState<Tab>(Tab.CHARACTER);
  
  // 角色数据库管理
  const [currentCharacterId, setCurrentCharacterId] = useState<string | null>(null);
  const [stats, setStats] = useState<CharacterStats>(INITIAL_STATS);
  const [isLoading, setIsLoading] = useState(true);
  const [isMigrated, setIsMigrated] = useState(false);

  // 初始化数据
  useEffect(() => {
    const initializeData = async () => {
      try {
        setIsLoading(true);
        
        // 检查是否需要迁移数据
        if (MigrationService.needsMigration() && !isMigrated) {
          console.log('检测到需要迁移的角色数据...');
          const migratedId = await MigrationService.migrateCharacterData('我的角色');
          if (migratedId) {
            setCurrentCharacterId(migratedId);
            localStorage.setItem('current_character_id', migratedId);
            setIsMigrated(true);
          }
        }
        
        // 尝试从缓存或 localStorage 获取当前角色 ID
        let characterId = currentCharacterId;
        if (!characterId) {
          characterId = localStorage.getItem('current_character_id');
        }
        
        if (characterId) {
          // 从数据库加载角色数据
          let character = CacheService.getCachedCharacter(characterId);
          if (!character) {
            character = await CharacterService.getCharacter(characterId);
            if (character) {
              CacheService.cacheCharacter(character);
            }
          }
          
          if (character) {
            setStats(character.stats);
            setCurrentCharacterId(character.id);
          } else {
            // 角色不存在，创建新角色
            await createNewCharacter();
          }
        } else {
          // 没有角色 ID，创建新角色
          await createNewCharacter();
        }
        
      } catch (error) {
        console.error('数据初始化失败:', error);
        // Fallback 到 localStorage
        await loadFromLegacyStorage();
      } finally {
        setIsLoading(false);
      }
    };

    const createNewCharacter = async () => {
      try {
        const character = await CharacterService.createCharacter({
          name: '我的角色',
          stats: INITIAL_STATS
        });
        
        if (character) {
          setStats(character.stats);
          setCurrentCharacterId(character.id);
          localStorage.setItem('current_character_id', character.id);
          CacheService.cacheCharacter(character);
        }
      } catch (error) {
        console.error('创建新角色失败:', error);
        await loadFromLegacyStorage();
      }
    };

    const loadFromLegacyStorage = async () => {
      try {
        const savedString = localStorage.getItem(STORAGE_KEY);
        if (savedString) {
          const parsed = JSON.parse(savedString);
          // 如果舊資料是 Array，轉換為 Record
          if (Array.isArray(parsed.proficiencies)) {
            const record: Record<string, number> = {};
            parsed.proficiencies.forEach((skill: string) => { record[skill] = 1; });
            parsed.proficiencies = record;
          }
          setStats(deepMerge(INITIAL_STATS, parsed));
        }
      } catch (e) {
        console.error("Critical: Character data loading failed", e);
        setStats(INITIAL_STATS);
      }
    };

    initializeData();
  }, [currentCharacterId, isMigrated]);

  // 保存角色数据到数据库
  useEffect(() => {
    const saveCharacterData = async () => {
      if (currentCharacterId && !isLoading) {
        try {
          const updatedCharacter = await CharacterService.updateCharacter(currentCharacterId, {
            stats: stats
          });
          
          if (updatedCharacter) {
            CacheService.cacheCharacter(updatedCharacter);
          }
        } catch (error) {
          console.error('保存角色数据失败:', error);
          // Fallback 到 localStorage
          localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
        }
      } else if (!currentCharacterId && !isLoading) {
        // 如果没有角色 ID，保存到 localStorage 作为备份
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
      }
    };

    saveCharacterData();
  }, [stats, currentCharacterId, isLoading]);

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
        {/* 数据加载状态 */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-500 border-t-transparent"></div>
              <span className="text-[14px] text-amber-500/80">正在加载角色数据...</span>
            </div>
          </div>
        ) : (
          <>
            {renderContent()}
          </>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-slate-900/95 backdrop-blur-md border-t border-slate-800 safe-bottom shadow-2xl z-50">
        <div className="flex justify-around items-center h-16">
          <button onClick={() => setActiveTab(Tab.CHARACTER)} className={`flex flex-col items-center flex-1 transition-all duration-200 ${activeTab === Tab.CHARACTER ? 'text-amber-500 scale-110' : 'text-slate-500'}`}>
            <span className="text-xl">👤</span>
            <span className="text-[14px] mt-0.5 font-black uppercase tracking-tighter">角色</span>
          </button>
          <button onClick={() => setActiveTab(Tab.COMBAT)} className={`flex flex-col items-center flex-1 transition-all duration-200 ${activeTab === Tab.COMBAT ? 'text-amber-500 scale-110' : 'text-slate-500'}`}>
            <span className="text-xl">⚔️</span>
            <span className="text-[14px] mt-0.5 font-black uppercase tracking-tighter">戰鬥</span>
          </button>
          <button onClick={() => setActiveTab(Tab.SPELLS)} className={`flex flex-col items-center flex-1 transition-all duration-200 ${activeTab === Tab.SPELLS ? 'text-amber-500 scale-110' : 'text-slate-500'}`}>
            <span className="text-xl">📖</span>
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

export default App;