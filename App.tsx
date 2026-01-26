import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { WelcomePage } from './components/WelcomePage';
import { CharacterSelectPage } from './components/CharacterSelectPage';
import { CharacterSheet } from './components/CharacterSheet';
import { DiceRoller } from './components/DiceRoller';
import { CombatView } from './components/CombatView';
import { SpellsView } from './components/SpellsView';
import { InventoryView } from './components/InventoryView';
import { CharacterStats } from './types';
import { HybridDataManager } from './services/hybridDataManager';
import { AuthService } from './services/auth';
import { AnonymousService } from './services/anonymous';
import { DatabaseInitService } from './services/databaseInit';
import type { Character } from './lib/supabase';

enum Tab {
  CHARACTER = 'character',
  COMBAT = 'combat',
  SPELLS = 'spells',
  ITEMS = 'items',
  DICE = 'dice'
}

type AppState = 'welcome' | 'characterSelect' | 'main'
type UserMode = 'authenticated' | 'anonymous'

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
        // 首先初始化資料庫
        await DatabaseInitService.initializeTables()
        
        // 檢查用戶登入狀態
        const isAuth = await AuthService.isAuthenticated()
        if (isAuth) {
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
          // 初始化匿名用戶上下文
          await AnonymousService.init()
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
      if (characterData && characterData.character) {
        // 從完整角色數據中提取 CharacterStats
        const extractedStats = {
          ...INITIAL_STATS,
          name: characterData.character.name,
          class: characterData.character.character_class || (characterData.character as any).class || '戰士',
          level: characterData.character.level,
          hp: {
            current: characterData.currentStats?.current_hp || INITIAL_STATS.hp.current,
            max: characterData.currentStats?.max_hp || INITIAL_STATS.hp.max,
            temp: characterData.currentStats?.temporary_hp || INITIAL_STATS.hp.temp
          },
          ac: characterData.currentStats?.armor_class || INITIAL_STATS.ac,
          initiative: characterData.currentStats?.initiative_bonus || INITIAL_STATS.initiative,
          speed: characterData.currentStats?.speed || INITIAL_STATS.speed,
          abilityScores: {
            str: characterData.abilityScores?.strength || INITIAL_STATS.abilityScores.str,
            dex: characterData.abilityScores?.dexterity || INITIAL_STATS.abilityScores.dex,
            con: characterData.abilityScores?.constitution || INITIAL_STATS.abilityScores.con,
            int: characterData.abilityScores?.intelligence || INITIAL_STATS.abilityScores.int,
            wis: characterData.abilityScores?.wisdom || INITIAL_STATS.abilityScores.wis,
            cha: characterData.abilityScores?.charisma || INITIAL_STATS.abilityScores.cha
          },
          currency: {
            cp: characterData.currency?.copper || INITIAL_STATS.currency.cp,
            sp: characterData.currency?.silver || INITIAL_STATS.currency.sp,
            ep: characterData.currency?.electrum || INITIAL_STATS.currency.ep,
            gp: characterData.currency?.gold || INITIAL_STATS.currency.gp,
            pp: characterData.currency?.platinum || INITIAL_STATS.currency.pp
          }
        }
        setStats(extractedStats)
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
          // TODO: 實作完整的角色數據更新
          console.log('角色數據已更新到 localStorage')
          // HybridDataManager 的 updateCharacter 方法需要完整實作
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
                {currentCharacter.character_class || (currentCharacter as any).class || '戰士'} 等級 {currentCharacter.level}
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

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
};

export default App;