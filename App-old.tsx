import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { WelcomePage } from './components/WelcomePage';
import { CharacterSelectPage } from './components/CharacterSelectPage';
import { CharacterSheet } from './components/CharacterSheet';
import { DiceRoller } from './components/DiceRoller';
import { CombatView } from './components/CombatView';
import { SpellsView } from './components/SpellsView';
import { InventoryView } from './components/InventoryView';
import { CharacterStats, Character } from './types';
import { HybridDataManager } from './services/hybridDataManager';
import { AuthService } from './services/auth';

enum Tab {
  CHARACTER = 'character',
  COMBAT = 'combat',
  SPELLS = 'spells',
  ITEMS = 'items',
  DICE = 'dice'
}

type AppState = 'welcome' | 'characterSelect' | 'main'
type UserMode = 'authenticated' | 'anonymous'

const STORAGE_KEY = 'dnd_char_stats_v3';

const INITIAL_STATS: CharacterStats = {
  name: "新角色",
  class: "戰士",
  level: 1,
  exp: 0,
  hp: { current: 10, max: 10, temp: 0 },
  hitDice: { current: 1, total: 1, die: "d10" },
  ac: 10,
  initiative: 0,
  speed: 30,
  abilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  proficiencies: {},
  savingProficiencies: [],
  downtime: 0,
  renown: { used: 0, total: 0 },
  prestige: { org: "", level: 0, rankName: "" },
  attacks: [],
  currency: { cp: 0, sp: 0, ep: 0, gp: 50, pp: 0 },
  avatarUrl: undefined,
  customRecords: []
};

const STORAGE_KEY = 'dnd_char_stats_v3';

const INITIAL_STATS: CharacterStats = {
  name: "新角色",
  class: "戰士",
  level: 1,
  exp: 0,
  hp: { current: 10, max: 10, temp: 0 },
  hitDice: { current: 1, total: 1, die: "d10" },
  ac: 10,
  initiative: 0,
  speed: 30,
  abilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  proficiencies: {},
  savingProficiencies: [],
  downtime: 0,
  renown: { used: 0, total: 0 },
  prestige: { org: "", level: 0, rankName: "" },
  attacks: [],
  currency: { cp: 0, sp: 0, ep: 0, gp: 50, pp: 0 },
  avatarUrl: undefined,
  customRecords: []
};

const AuthenticatedApp: React.FC = () => {
  const { user } = useAuth();
  
  // 應用程式狀態
  const [appState, setAppState] = useState<AppState>('welcome')
  const [userMode, setUserMode] = useState<UserMode>('anonymous')
  const [activeTab, setActiveTab] = useState<Tab>(Tab.CHARACTER)
  
  // 角色數據
  const [currentCharacter, setCurrentCharacter] = useState<Character | null>(null)
  const [stats, setStats] = useState<CharacterStats>(INITIAL_STATS)
  const [isLoading, setIsLoading] = useState(true)

  // 初始化狀態
  useEffect(() => {
    const initializeApp = async () => {
      setIsLoading(true)
      try {
        // 檢查用戶登入狀態
        const authState = await AuthService.checkAuthState()
        if (authState.isAuthenticated) {
          setUserMode('authenticated')
          // 檢查是否有角色，決定跳轉到角色選擇或歡迎頁
          const characters = await HybridDataManager.getUserCharacters()
          if (characters.length > 0) {
            setAppState('characterSelect')
          } else {
            setAppState('characterSelect') // 仍然顯示角色選擇頁來創建第一個角色
          }
        } else {
          // 檢查是否有本地角色數據
          const characters = await HybridDataManager.getUserCharacters()
          if (characters.length > 0) {
            setUserMode('anonymous')
            setAppState('characterSelect')
          } else {
            setAppState('welcome')
          }
        }
      } catch (error) {
        console.error('初始化失敗:', error)
        setAppState('welcome')
      } finally {
        setIsLoading(false)
      }
    }

    initializeApp()
  }, [user])

  // 載入角色數據
  useEffect(() => {
    if (currentCharacter) {
      loadCharacterStats()
    }
  }, [currentCharacter])

  const loadCharacterStats = async () => {
    if (!currentCharacter) return

    try {
      const characterData = await HybridDataManager.getCharacter(currentCharacter.id)
      if (characterData) {
        setStats(characterData.stats || INITIAL_STATS)
      }
    } catch (error) {
      console.error('載入角色數據失敗:', error)
    }
  }

  // 保存角色數據
  useEffect(() => {
    const saveCharacterData = async () => {
      if (currentCharacter && appState === 'main') {
        try {
          await HybridDataManager.updateCharacter(currentCharacter.id, {
            stats,
            updatedAt: new Date().toISOString()
          })
        } catch (error) {
          console.error('保存角色數據失敗:', error)
        }
      }
    }

    const timeoutId = setTimeout(saveCharacterData, 1000) // 延遲保存避免頻繁寫入
    return () => clearTimeout(timeoutId)
  }, [stats, currentCharacter, appState])

  // 事件處理
  const handleWelcomeNext = (mode: UserMode) => {
    setUserMode(mode)
    setAppState('characterSelect')
  }

  const handleCharacterSelect = (character: Character) => {
    setCurrentCharacter(character)
    setAppState('main')
  }

  const handleBackToCharacterSelect = () => {
    setCurrentCharacter(null)
    setAppState('characterSelect')
  }

  const handleBackToWelcome = () => {
    setAppState('welcome')
    setUserMode('anonymous')
    setCurrentCharacter(null)
  }

  // 渲染邏輯
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-400 border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-400">載入中...</p>
        </div>
      </div>
    )
  }

  // 歡迎頁面
  if (appState === 'welcome') {
    return <WelcomePage onNext={handleWelcomeNext} />
  }

  // 角色選擇頁面
  if (appState === 'characterSelect') {
    return (
      <CharacterSelectPage
        userMode={userMode}
        onCharacterSelect={handleCharacterSelect}
        onBack={handleBackToWelcome}
      />
    )
  }

  // 主應用程式
  if (appState === 'main' && currentCharacter) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        {/* 標題欄 */}
        <header className="bg-slate-900 border-b border-slate-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBackToCharacterSelect}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-xl font-bold text-amber-400">{currentCharacter.name}</h1>
              <span className="text-slate-400 text-sm">
                {currentCharacter.class} 等級 {currentCharacter.level}
              </span>
            </div>
            
            <div className="text-slate-400 text-sm">
              {userMode === 'anonymous' ? '匿名模式' : '已登入'}
            </div>
          </div>
        </header>

        {/* 分頁導航 */}
        <nav className="bg-slate-900/50 border-b border-slate-800">
          <div className="flex overflow-x-auto">
            {[
              { id: Tab.CHARACTER, label: '角色', icon: '👤' },
              { id: Tab.COMBAT, label: '戰鬥', icon: '⚔️' },
              { id: Tab.SPELLS, label: '法術', icon: '✨' },
              { id: Tab.ITEMS, label: '道具', icon: '🎒' },
              { id: Tab.DICE, label: '骰子', icon: '🎲' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-amber-400 border-b-2 border-amber-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="text-base">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        {/* 主要內容 */}
        <main className="p-6">
          {activeTab === Tab.CHARACTER && (
            <CharacterSheet stats={stats} setStats={setStats} />
          )}
          {activeTab === Tab.COMBAT && (
            <CombatView stats={stats} setStats={setStats} />
          )}
          {activeTab === Tab.SPELLS && (
            <SpellsView stats={stats} setStats={setStats} />
          )}
          {activeTab === Tab.ITEMS && (
            <InventoryView stats={stats} setStats={setStats} />
          )}
          {activeTab === Tab.DICE && <DiceRoller />}
        </main>
      </div>
    )
  }

  return null
}
              platinum: stats.currency.pp
            });
          } else {
            // 降級到舊格式
            const updatedCharacter = await CharacterService.updateCharacter(currentCharacterId, {
              stats: stats
            });
            
            if (updatedCharacter) {
              CacheService.cacheCharacter(updatedCharacter);
            }
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
  }, [stats, currentCharacterId, isLoading, fullCharacterData]);

  // 角色切換處理
  const handleCharacterChange = async (character: Character) => {
    try {
      await loadCharacterById(character.id);
    } catch (error) {
      console.error('切換角色失敗:', error);
      // 降級處理
      setCurrentCharacterId(character.id);
      localStorage.setItem('current_character_id', character.id);
    }
  };

  // 創建新角色處理
  const handleCreateCharacter = async () => {
    await createNewCharacter();
  };

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
      {/* Production 環境 - 已移除開發工具 */}
      
      {/* 頂部用戶資訊 */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-2">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎲</span>
            <span className="text-lg font-bold text-amber-400">D&D 助手</span>
          </div>
          <UserProfile />
        </div>
        {/* 角色選擇器 */}
        <CharacterSelector
          currentCharacterId={currentCharacterId}
          onCharacterChange={handleCharacterChange}
          onCreateCharacter={handleCreateCharacter}
        />
      </header>

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

// 主 App 組件
const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

// App 內容組件（需要在 AuthProvider 內部才能使用 useAuth）
const AppContent: React.FC = () => {
  const { user, isLoading: isAuthLoading } = useAuth();

  if (isAuthLoading) {
    // 認證狀態載入中
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-500 border-t-transparent"></div>
          <span className="text-[14px] text-amber-500/80">載入中...</span>
        </div>
      </div>
    );
  }

  // 不論是否登入，都顯示主應用
  // 匿名用戶可以使用基本功能，但角色數量會受限
  return <AuthenticatedApp />;
};

export default App;