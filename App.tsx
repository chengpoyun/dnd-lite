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
import type { Character, CharacterAbilityScores, CharacterCurrentStats, CharacterCurrency, CharacterUpdateData } from './lib/supabase';

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
          // 檢查是否有角色
          const characters = await HybridDataManager.getUserCharacters()
          if (characters.length > 0) {
            // 有角色，直接載入最後使用的角色
            const lastCharacterId = localStorage.getItem('dnd_last_character_id')
            let characterToLoad = characters[0] // 預設使用第一個角色
            
            // 如果有記錄最後使用的角色，嘗試找到它
            if (lastCharacterId) {
              const lastCharacter = characters.find(c => c.id === lastCharacterId)
              if (lastCharacter) {
                characterToLoad = lastCharacter
              } else {
                // 最後記錄的角色不存在，清除記錄
                localStorage.removeItem('dnd_last_character_id')
              }
            }
            
            // 更新最後使用的角色記錄
            localStorage.setItem('dnd_last_character_id', characterToLoad.id)
            
            // 直接設定角色並進入主頁面
            setCurrentCharacter(characterToLoad)
            setAppState('main')
          } else {
            setAppState('characterSelect') // 沒有角色，顯示角色選擇頁來創建第一個角色
          }
        } else {
          // 檢查是否有本地角色數據
          const characters = await HybridDataManager.getUserCharacters()
          if (characters.length > 0) {
            setUserMode('anonymous')
            
            // 有角色，直接載入最後使用的角色
            const lastCharacterId = localStorage.getItem('dnd_last_character_id')
            let characterToLoad = characters[0] // 預設使用第一個角色
            
            // 如果有記錄最後使用的角色，嘗試找到它
            if (lastCharacterId) {
              const lastCharacter = characters.find(c => c.id === lastCharacterId)
              if (lastCharacter) {
                characterToLoad = lastCharacter
              } else {
                // 最後記錄的角色不存在，清除記錄
                localStorage.removeItem('dnd_last_character_id')
              }
            }
            
            // 更新最後使用的角色記錄
            localStorage.setItem('dnd_last_character_id', characterToLoad.id)
            
            // 直接設定角色並進入主頁面
            setCurrentCharacter(characterToLoad)
            setAppState('main')
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
      
      // 添加除錯資訊
      console.log('📊 角色數據載入:', {
        hasCharacterData: !!characterData,
        skillProficienciesType: Array.isArray(characterData?.skillProficiencies) ? 'array' : typeof characterData?.skillProficiencies,
        skillProficienciesLength: Array.isArray(characterData?.skillProficiencies) ? characterData.skillProficiencies.length : 'not-array',
        savingThrowsType: Array.isArray(characterData?.savingThrows) ? 'array' : typeof characterData?.savingThrows
      })
      
      if (characterData && characterData.character) {
        // 從完整角色數據中提取 CharacterStats
        const extractedStats = {
          ...INITIAL_STATS,
          name: characterData.character.name,
          class: characterData.character.character_class || (characterData.character as any).class || '戰士',
          level: characterData.character.level,
          exp: characterData.character.experience || INITIAL_STATS.exp,
          avatarUrl: characterData.character.avatar_url || INITIAL_STATS.avatarUrl,
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
            gp: characterData.currency?.gp || INITIAL_STATS.currency.gp,
            pp: characterData.currency?.platinum || INITIAL_STATS.currency.pp
          },
          // 載入技能熟練度 - 處理不同的數據格式
          proficiencies: (() => {
            const skillProfs = characterData.skillProficiencies
            
            try {
              // 檢查是否為數組格式（新格式）
              if (Array.isArray(skillProfs)) {
                return skillProfs.reduce((acc, skill) => {
                  if (skill && typeof skill === 'object' && skill.skill_name) {
                    acc[skill.skill_name] = skill.proficiency_level || 1
                  }
                  return acc
                }, {} as Record<string, number>)
              }
              
              // 檢查是否已經是物件格式（舊格式/直接格式）
              if (skillProfs && typeof skillProfs === 'object' && !Array.isArray(skillProfs)) {
                return skillProfs as Record<string, number>
              }
            } catch (skillError) {
              console.warn('🔧 技能熟練度處理異常，使用預設值:', skillError)
            }
            
            // 預設值
            return INITIAL_STATS.proficiencies
          })(),
          // 載入豁免骰熟練度 - 添加安全檢查和詳細除錯
          savingProficiencies: (() => {
            try {
              console.log('🎯 豁免骰載入除錯:', {
                savingThrowsData: characterData.savingThrows,
                isArray: Array.isArray(characterData.savingThrows),
                length: characterData.savingThrows?.length
              })
              
              if (Array.isArray(characterData.savingThrows)) {
                const proficientSaves = characterData.savingThrows
                  .filter(st => st && st.is_proficient)
                  .map(st => {
                    // 將完整的資料庫名稱映射回前端使用的縮寫
                    const abilityMap = {
                      strength: 'str',
                      dexterity: 'dex', 
                      constitution: 'con',
                      intelligence: 'int',
                      wisdom: 'wis',
                      charisma: 'cha'
                    } as any
                    return abilityMap[st.ability] || st.ability
                  }) as (keyof typeof INITIAL_STATS.abilityScores)[]
                  
                console.log('🎯 過濾後的豁免熟練度:', proficientSaves)
                return proficientSaves
              }
            } catch (savingError) {
              console.warn('🔧 豁免骰處理異常，使用預設值:', savingError)
            }
            console.log('🎯 使用預設豁免熟練度')
            return INITIAL_STATS.savingProficiencies
          })(),
          // 載入額外資料（修整期、名聲等）
          downtime: characterData.currentStats?.extra_data?.downtime || INITIAL_STATS.downtime,
          renown: characterData.currentStats?.extra_data?.renown || INITIAL_STATS.renown,
          prestige: characterData.currentStats?.extra_data?.prestige || INITIAL_STATS.prestige,
          customRecords: characterData.currentStats?.extra_data?.customRecords || INITIAL_STATS.customRecords,
          attacks: characterData.currentStats?.extra_data?.attacks || INITIAL_STATS.attacks,
          // 載入生命骰資料
          hitDice: {
            current: characterData.currentStats?.current_hit_dice || INITIAL_STATS.hitDice.current,
            total: characterData.currentStats?.total_hit_dice || stats.level || INITIAL_STATS.hitDice.total,
            die: characterData.currentStats?.hit_die_type || INITIAL_STATS.hitDice.die
          }
        }
        setStats(extractedStats)
        console.log('✅ 角色數據載入成功')
      } else {
        console.warn('⚠️ 角色數據不完整，使用預設值')
        setStats(INITIAL_STATS)
      }
    } catch (error) {
      console.error('❌ 載入角色數據失敗:', error)
      console.error('錯誤詳情:', {
        characterId: currentCharacter?.id,
        characterName: currentCharacter?.name,
        errorMessage: error.message,
        errorStack: error.stack
      })
      // 設置預設值以防止應用崩潰
      setStats(INITIAL_STATS)
    }
  }

  // 保存角色數據
  useEffect(() => {
    const saveCharacterData = async () => {
      if (currentCharacter && appState === 'main') {
        try {
          // 更新完整的角色數據
          const characterUpdates: CharacterUpdateData = {
            character: {
              ...currentCharacter,
              name: stats.name || '未命名角色',
              character_class: stats.class || '戰士',
              level: stats.level || 1,
              experience: stats.exp || 0,
              avatar_url: stats.avatarUrl,
              updated_at: new Date().toISOString()
            },
            currentStats: {
              character_id: currentCharacter.id,
              current_hp: stats.hp.current || 1,
              max_hp: stats.hp.max || 1,
              temporary_hp: stats.hp.temp || 0,
              current_hit_dice: stats.hitDice.current || 0,
              total_hit_dice: stats.hitDice.total || stats.level || 1, // 使用角色等級作為預設值
              armor_class: stats.ac || 10,
              initiative_bonus: stats.initiative || 0, // 使用角色的先攻修正
              speed: stats.speed || 30,
              hit_die_type: stats.hitDice.die || 'd8', // 使用實際的骰子類型
              extra_data: {
                downtime: stats.downtime || 0,
                renown: stats.renown || { used: 0, total: 0 },
                prestige: stats.prestige || { org: '', level: 0, rankName: '' },
                customRecords: stats.customRecords || [],
                attacks: stats.attacks || []
              }
            } as Partial<CharacterCurrentStats>,
            abilityScores: {
              character_id: currentCharacter.id,
              strength: stats.abilityScores.str || 10,
              dexterity: stats.abilityScores.dex || 10,
              constitution: stats.abilityScores.con || 10,
              intelligence: stats.abilityScores.int || 10,
              wisdom: stats.abilityScores.wis || 10,
              charisma: stats.abilityScores.cha || 10
            } as Partial<CharacterAbilityScores>,
            currency: {
              character_id: currentCharacter.id,
              gp: stats.currency.gp || 0, // 使用統一的 gp 欄位
              copper: stats.currency.cp || 0,
              silver: stats.currency.sp || 0,
              electrum: stats.currency.ep || 0,
              platinum: stats.currency.pp || 0
            } as Partial<CharacterCurrency>
          };

          console.log('💾 準備保存到 DB:', {
            skillProficiencies: stats.proficiencies || {},
            savingProficiencies: stats.savingProficiencies || [],
            formattedSavingThrows: (stats.savingProficiencies || []).map(ability => ({
              character_id: currentCharacter.id,
              ability,
              is_proficient: true
            }))
          });

          // 使用 HybridDataManager 保存數據
          await HybridDataManager.updateCharacter(currentCharacter.id, characterUpdates);
          console.log('角色數據已保存');
        } catch (error) {
          console.error('保存角色數據失敗:', error);
        }
      }
    };

    const timeoutId = setTimeout(saveCharacterData, 1000); // 延遲保存避免頻繁寫入
    return () => clearTimeout(timeoutId)
  }, [stats, currentCharacter, appState])

  // 事件處理
  const handleWelcomeNext = (mode: UserMode) => {
    setUserMode(mode)
    setAppState('characterSelect')
  }

  const handleCharacterSelect = (character: Character) => {
    setCurrentCharacter(character)
    // 記錄最後使用的角色，下次啟動時自動載入
    localStorage.setItem('dnd_last_character_id', character.id)
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
    // 清除最後使用的角色記錄
    localStorage.removeItem('dnd_last_character_id')
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
            
            {/* 角色切換按鈕 */}
            <button
              onClick={handleBackToCharacterSelect}
              className="flex items-center gap-2 px-6 py-4 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors whitespace-nowrap ml-auto"
            >
              <span className="text-base">🔄</span>
              切換角色
            </button>
          </div>
        </nav>

        {/* 主要內容 */}
        <main className="p-6">
          {activeTab === Tab.CHARACTER && (
            <CharacterSheet stats={stats} setStats={setStats} />
          )}
          {activeTab === Tab.COMBAT && (
            <CombatView stats={stats} setStats={setStats} characterId={currentCharacter?.id} />
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