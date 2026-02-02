import React, { useState, useEffect, lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { WelcomePage } from './components/WelcomePage';
import { CharacterSheet } from './components/CharacterSheet';
import { SessionExpiredModal } from './components/SessionExpiredModal';

// 延遲載入非關鍵頁面
const CharacterSelectPage = lazy(() => import('./components/CharacterSelectPage').then(m => ({ default: m.CharacterSelectPage })));
const DiceRoller = lazy(() => import('./components/DiceRoller').then(m => ({ default: m.DiceRoller })));
const CombatView = lazy(() => import('./components/CombatView').then(m => ({ default: m.CombatView })));
const ConversionPage = lazy(() => import('./components/ConversionPage').then(m => ({ default: m.ConversionPage })));
const SpellsPage = lazy(() => import('./components/SpellsPage').then(m => ({ default: m.SpellsPage })));
const MonstersPage = lazy(() => import('./components/MonstersPage'));
const ItemsPage = lazy(() => import('./components/ItemsPage'));
const AbilitiesPage = lazy(() => import('./components/AbilitiesPage'));

import { CharacterStats } from './types';
import { getModifier } from './utils/helpers';
import { formatClassDisplay, getPrimaryClass, getTotalLevel, getClassHitDie } from './utils/classUtils';
import { isSpellcaster } from './utils/spellUtils';
import { migrateLegacyCharacterStats, needsMulticlassMigration, ensureDisplayClass } from './utils/migrationHelpers';
import { HybridDataManager } from './services/hybridDataManager';
import { AuthService } from './services/auth';
import { AnonymousService } from './services/anonymous';
import { DatabaseInitService } from './services/databaseInit';
import { UserSettingsService } from './services/userSettings';
import { DetailedCharacterService } from './services/detailedCharacter';
import type { Character, CharacterAbilityScores, CharacterCurrentStats, CharacterCurrency, CharacterUpdateData, CharacterSkillProficiency, CharacterSavingThrow } from './lib/supabase';

enum Tab {
  CHARACTER = 'character',
  ABILITIES = 'abilities',
  COMBAT = 'combat',
  SPELLS = 'spells',
  MONSTERS = 'monsters',
  ITEMS = 'items',
  DICE = 'dice'
}

type AppState = 'welcome' | 'conversion' | 'characterSelect' | 'main'
type UserMode = 'authenticated' | 'anonymous'

const INITIAL_STATS: CharacterStats = {
  name: "新角色",
  class: "戰士",
  level: 1,
  exp: 0,
  hp: { current: 10, max: 10, temp: 0 },
  hitDice: { current: 1, total: 1, die: "d10" },
  ac: 10,
  initiative: 0, // 會在後續計算時被敵捷調整值覆蓋
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
  const { user, isLoading: authLoading, signOut } = useAuth();
  
  // 應用程式狀態
  const [appState, setAppState] = useState<AppState>('welcome')
  const [userMode, setUserMode] = useState<UserMode>('anonymous')
  const [activeTab, setActiveTab] = useState<Tab>(Tab.CHARACTER)
  const [needsConversion, setNeedsConversion] = useState(false)
  const [showSessionExpired, setShowSessionExpired] = useState(false)
  
  // 滑動切換 Tab 狀態
  const [touchStartX, setTouchStartX] = useState<number>(0)
  const [touchStartY, setTouchStartY] = useState<number>(0)
  const [isSwiping, setIsSwiping] = useState(false)
  
  // 角色數據
  const [currentCharacter, setCurrentCharacter] = useState<Character | null>(null)
  const [stats, setStats] = useState<CharacterStats>(INITIAL_STATS)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingCharacter, setIsLoadingCharacter] = useState(false) // 添加角色載入狀態
  const [isCharacterDataReady, setIsCharacterDataReady] = useState(false) // 角色資料是否已載入完成
  const [isSaving, setIsSaving] = useState(false) // 添加保存狀態
  const [isInitialized, setIsInitialized] = useState(false) // 防止重複初始化
  const [initError, setInitError] = useState<string | null>(null) // 初始化錯誤訊息

  // 初始化狀態 - 等待AuthContext確認狀態後才執行
  useEffect(() => {
    // 防止重複初始化：等待認證狀態確認且未初始化過
    if (authLoading || isInitialized) {
      return
    }
    
    const initializeApp = async () => {
      // 防止競爭條件
      if (isInitialized) {
        console.warn('⚠️ 初始化已在進行中，跳過')
        return
      }
      
      const startTime = performance.now()
      console.log('🚀 開始應用初始化...')
      setIsLoading(true)
      setIsInitialized(true)
      
      // 定義帶自動重試的載入函數
      const loadWithRetry = async (loadFn: () => Promise<void>, maxRetries = 1) => {
        let lastError: any = null
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            if (attempt > 0) {
              console.log(`🔄 自動重試第 ${attempt} 次...`)
              await new Promise(resolve => setTimeout(resolve, 1000))
            }
            
            await loadFn()
            return // 成功，直接返回
            
          } catch (error) {
            lastError = error
            console.warn(`⚠️ 載入失敗 (嘗試 ${attempt + 1}/${maxRetries + 1}):`, error?.message)
            
            // 如果還有重試機會，繼續循環
            if (attempt < maxRetries) {
              continue
            }
          }
        }
        
        // 所有重試都失敗，拋出最後的錯誤
        throw lastError
      }
      
      try {
        // 静默初始化，只在錯誤時輸出
        const dbInitStart = performance.now()
        await DatabaseInitService.initializeTables()
        console.log(`⏱️ DatabaseInit: ${(performance.now() - dbInitStart).toFixed(1)}ms`)
        
        if (user) {
          // 先檢查是否有匿名角色需要轉換
          const conversionCheckStart = performance.now()
          const hasAnonymousChars = await DetailedCharacterService.hasAnonymousCharactersToConvert()
          console.log(`⏱️ 轉換檢查: ${(performance.now() - conversionCheckStart).toFixed(1)}ms`)
          
          if (hasAnonymousChars) {
            console.log('🔄 檢測到匿名角色，準備轉換')
            setUserMode('anonymous') // 保持匿名模式以觸發轉換流程
            setNeedsConversion(true)
            setAppState('conversion')
          } else {
            // 沒有匿名角色需要轉換，設定為認證模式
            setUserMode('authenticated')
            
            await loadWithRetry(async () => {
              // 傳入認證用戶上下文
              const userContext = {
                isAuthenticated: true,
                userId: user.id
              }
              const characters = await HybridDataManager.getUserCharacters(userContext)
              
              if (characters.length > 0) {
                // 載入最後使用的角色
                let characterToLoad = characters[0]
                
                try {
                  const settingsStart = performance.now()
                  const lastCharacterId = await UserSettingsService.getLastCharacterId()
                  console.log(`⏱️ 讀取設定: ${(performance.now() - settingsStart).toFixed(1)}ms`)
                  if (lastCharacterId) {
                    const lastCharacter = characters.find(c => c.id === lastCharacterId)
                    if (lastCharacter) {
                      characterToLoad = lastCharacter
                    } else {
                      // 清理不存在的角色 ID
                      console.warn('⚠️ 上次使用的角色已不存在，已清理')
                      await UserSettingsService.setLastCharacterId(characterToLoad.id)
                    }
                  } else {
                    // 儲存第一個角色為預設
                    await UserSettingsService.setLastCharacterId(characterToLoad.id)
                  }
                } catch (settingsError) {
                  // 靜默處理設定錯誤
                  console.warn('設定服務錯誤:', settingsError)
                }
                
                setCurrentCharacter(characterToLoad)
                setAppState('main')
              } else {
                // 真的沒有角色，進入選擇頁面創建
                console.log('✅ 用戶沒有角色，進入選擇頁面')
                setAppState('characterSelect')
              }
            })
          }
        } else {
          // 匿名用戶模式
          await loadWithRetry(async () => {
            const anonInitStart = performance.now()
            await AnonymousService.init()
            console.log(`⏱️ 匿名服務初始化: ${(performance.now() - anonInitStart).toFixed(1)}ms`)
            
            // 傳入匿名用戶上下文
            const userContext = {
              isAuthenticated: false,
              anonymousId: AnonymousService.getAnonymousId()
            }
            const characters = await HybridDataManager.getUserCharacters(userContext)
            
            if (characters.length > 0) {
              setUserMode('anonymous')
              setCurrentCharacter(characters[0])
              setAppState('main')
            } else {
              // 匿名用戶確實沒有角色
              console.log('✅ 匿名用戶沒有角色，進入歡迎頁面')
              setAppState('welcome')
            }
          })
        }
      } catch (error) {
        console.error('❌ 初始化失敗（已自動重試）:', error?.message)
        // 所有重試都失敗後，才設置錯誤狀態
        setInitError('載入失敗，可能是網路問題。請點擊重試。')
        setAppState('welcome')
      } finally {
        const endTime = performance.now()
        console.log(`⏱️ 應用初始化總耗時: ${(endTime - startTime).toFixed(1)}ms`)
        setIsLoading(false)
      }
    }

    initializeApp()
  }, [user, authLoading, isInitialized]) // 添加authLoading依賴，確保認證狀態穩定後才初始化

  // 處理匿名角色轉換
  useEffect(() => {
    const checkConversion = async () => {
      if (user && userMode === 'anonymous') {
        // 用戶剛登入，檢查是否需要轉換匿名角色
        try {
          const hasAnonymousChars = await DetailedCharacterService.hasAnonymousCharactersToConvert()
          if (hasAnonymousChars) {
            setNeedsConversion(true)
            setAppState('conversion')
          } else {
            setUserMode('authenticated')
            setAppState('characterSelect')
          }
        } catch (error) {
          console.error('檢查轉換需求失敗:', error)
          setUserMode('authenticated')
          setAppState('characterSelect')
        }
      }
    }

    checkConversion()
  }, [user, userMode])

  // 載入角色數據 - 添加防重複載入保護
  useEffect(() => {
    if (currentCharacter && !isLoadingCharacter) {
      setIsCharacterDataReady(false) // 重置資料準備狀態
      loadCharacterStats()
    }
  }, [currentCharacter])

  const loadCharacterStats = async () => {
    if (!currentCharacter || isLoadingCharacter) {
      return
    }
    
    setIsLoadingCharacter(true)

    try {
      // 傳入用戶上下文避免冗餘的身份驗證調用
      const userContext = user ? {
        isAuthenticated: true,
        userId: user.id
      } : {
        isAuthenticated: false,
        anonymousId: AnonymousService.getAnonymousId()
      }
      const characterData = await HybridDataManager.getCharacter(currentCharacter.id, userContext)
      
      if (!characterData || !characterData.character) {
        console.error('❌ 角色不存在，清理並返回角色選擇頁面')
        // 清理不存在的角色 ID
        await UserSettingsService.setLastCharacterId('')
        setCurrentCharacter(null)
        setAppState('characterSelect')
        setIsLoadingCharacter(false)
        return
      }
      
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
          initiative: characterData.currentStats?.initiative_bonus !== undefined 
            ? characterData.currentStats.initiative_bonus 
            : (characterData.abilityScores?.dexterity ? getModifier(characterData.abilityScores.dexterity) : 0),
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
          // 載入技能熟練度 - 簡化處理，只載入有記錄的技能
          proficiencies: (() => {
            const skillProfs = characterData.skillProficiencies
            const result: Record<string, number> = {};
            
            try {
              // 檢查是否為數組格式（新格式）
              if (Array.isArray(skillProfs)) {
                skillProfs.forEach(skill => {
                  if (skill && typeof skill === 'object' && skill.skill_name && skill.proficiency_level > 0) {
                    result[skill.skill_name] = skill.proficiency_level;
                  }
                });
                return result;
              }
              
              // 檢查是否已經是物件格式（舊格式/直接格式）
              if (skillProfs && typeof skillProfs === 'object' && !Array.isArray(skillProfs)) {
                // 只包含熟練度 > 0 的技能
                Object.entries(skillProfs as Record<string, number>).forEach(([skillName, level]) => {
                  if (level > 0) {
                    result[skillName] = level;
                  }
                });

                return result;
              }
            } catch (skillError) {
              console.warn('🔧 技能熟練度處理異常，使用預設值:', skillError)
            }
            
            // 預設值 - 空物件（沒有任何技能熟練度）
            return result;
          })(),
          // 載入豁免骰熟練度 - 添加安全檢查和詳細除錯
          savingProficiencies: (() => {
            try {
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
                  
                return proficientSaves
              }
            } catch (savingError) {
              console.warn('🔧 豁免骰處理異常，使用預設值:', savingError)
            }
            return INITIAL_STATS.savingProficiencies
          })(),
          // 載入額外資料（修整期、名聲等）
          downtime: characterData.currentStats?.extra_data?.downtime || INITIAL_STATS.downtime,
          renown: characterData.currentStats?.extra_data?.renown || INITIAL_STATS.renown,
          prestige: characterData.currentStats?.extra_data?.prestige || INITIAL_STATS.prestige,
          customRecords: characterData.currentStats?.extra_data?.customRecords || INITIAL_STATS.customRecords,
          extraData: {
            abilityBonuses: characterData.currentStats?.extra_data?.abilityBonuses || {},
            modifierBonuses: characterData.currentStats?.extra_data?.modifierBonuses || {}
          },
          attacks: characterData.currentStats?.extra_data?.attacks || INITIAL_STATS.attacks,
          // 載入生命骰資料
          hitDice: {
            current: characterData.currentStats?.current_hit_dice || INITIAL_STATS.hitDice.current,
            total: characterData.currentStats?.total_hit_dice || stats.level || INITIAL_STATS.hitDice.total,
            die: characterData.currentStats?.hit_die_type || INITIAL_STATS.hitDice.die
          },
          
          // 載入兼職系統資料（新增）
          classes: characterData.currentStats?.extra_data?.classes ? 
            characterData.currentStats.extra_data.classes.map((c: any, index: number) => ({
              id: c.id || `class-${index}`,
              name: c.name,
              level: c.level,
              hitDie: c.hitDie || getClassHitDie(c.name),
              isPrimary: c.isPrimary
            })) :
            (characterData.classes && characterData.classes.length > 0 ? 
              characterData.classes.map(c => ({
                id: `legacy-${c.class_name}`,
                name: c.class_name,
                level: c.class_level,
                hitDie: c.hit_die,
                isPrimary: c.is_primary
              })) : undefined), // 無資料時使用傳統模式
          
          hitDicePools: characterData.hitDicePools ? {
            d12: { 
              current: characterData.hitDicePools.d12_current, 
              total: characterData.hitDicePools.d12_total 
            },
            d10: { 
              current: characterData.hitDicePools.d10_current, 
              total: characterData.hitDicePools.d10_total 
            },
            d8: { 
              current: characterData.hitDicePools.d8_current, 
              total: characterData.hitDicePools.d8_total 
            },
            d6: { 
              current: characterData.hitDicePools.d6_current, 
              total: characterData.hitDicePools.d6_total 
            }
          } : undefined // 無資料時使用傳統模式
        }
        
        // 執行資料移轉（如果需要）
        let finalStats = extractedStats;
        if (needsMulticlassMigration(extractedStats)) {
          finalStats = migrateLegacyCharacterStats(extractedStats);
        }
        finalStats = ensureDisplayClass(finalStats);
        
        setStats(finalStats)
        setIsCharacterDataReady(true) // 設置資料載入完成
      } else {
        console.warn('⚠️ 角色數據不完整，使用預設值')
        setStats(INITIAL_STATS)
        setIsCharacterDataReady(true) // 即使沒有資料也設為準備完成
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
      setIsCharacterDataReady(true) // 錯誤時也設為準備完成
    } finally {
      setIsLoadingCharacter(false) // 清除載入狀態
    }
  }

  // 保存操作鎖和序列化機制
  const saveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)
  
  // Session 驗證輔助函數
  const validateSessionBeforeSave = async (): Promise<boolean> => {
    // 匿名用戶不需要驗證 session
    if (userMode === 'anonymous') return true
    
    // 認證用戶驗證 session
    const isValid = await UserSettingsService.validateSession()
    if (!isValid) {
      console.log('❌ Session 已失效，顯示登出提示')
      setShowSessionExpired(true)
      return false
    }
    return true
  }
  
  // 移除自動保存 useEffect，改為按需保存
  /*
  // 角色數據自動保存 effect - 只在關鍵數據變化時觸發
  useEffect(() => {
    // ... 自動保存代碼已註釋掉，改為按需保存
  }, []);
  */

  // 專門的數據保存函數 - 按需調用
  
  // 保存技能熟練度
  const saveSkillProficiency = async (skillName: string, level: number) => {
    if (!currentCharacter) return false
    
    // 驗證 session
    if (!await validateSessionBeforeSave()) return false
    
    return await HybridDataManager.updateSingleSkillProficiency(currentCharacter.id, skillName, level)
  }

  // 保存豁免熟練度
  const saveSavingThrowProficiencies = async (proficiencies: string[]) => {
    if (!currentCharacter || isSaving) return false
    
    // 驗證 session
    if (!await validateSessionBeforeSave()) return false
    
    setIsSaving(true)
    try {
      console.log('🛡️ 保存豁免熟練度:', proficiencies)
      const abilityMap: Record<string, string> = {
        str: 'strength', dex: 'dexterity', con: 'constitution',
        int: 'intelligence', wis: 'wisdom', cha: 'charisma'
      }
      
      const savingThrows = proficiencies.map((ability: string) => {
        const fullAbility = abilityMap[ability] || ability;
        return {
          character_id: currentCharacter.id,
          ability: fullAbility as 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma',
          is_proficient: true
        }
      })
      
      const characterUpdate: CharacterUpdateData = { savingThrows }
      const success = await HybridDataManager.updateCharacter(currentCharacter.id, characterUpdate)
      if (success) {
        console.log('✅ 豁免熟練度保存成功')
      }
      return success
    } catch (error) {
      console.error('❌ 豁免熟練度保存失敗:', error)
      return false
    } finally {
      setIsSaving(false)
    }
  }

  // 保存角色基本信息（名字、職業、等級）
  const saveCharacterBasicInfo = async (name: string, characterClass: string, level: number) => {
    if (!currentCharacter || isSaving) return false
    
    // 驗證 session
    if (!await validateSessionBeforeSave()) return false
    
    setIsSaving(true)
    try {
      console.log('📝 保存角色基本信息:', { name, characterClass, level })
      const characterUpdate: CharacterUpdateData = {
        character: {
          ...currentCharacter,
          name: name,
          character_class: characterClass,
          level: level,
          updated_at: new Date().toISOString()
        }
      }
      
      const success = await HybridDataManager.updateCharacter(currentCharacter.id, characterUpdate)
      if (success) {
        console.log('✅ 角色基本信息保存成功')
      }
      return success
    } catch (error) {
      console.error('❌ 角色基本信息保存失敗:', error)
      return false
    } finally {
      setIsSaving(false)
    }
  }

  // 保存能力值
  const saveAbilityScores = async (abilityScores: CharacterStats['abilityScores']) => {
    if (!currentCharacter || isSaving) return false
    
    // 驗證 session
    if (!await validateSessionBeforeSave()) return false
    
    setIsSaving(true)
    try {
      console.log('💪 保存能力值:', abilityScores)
      const characterUpdate: CharacterUpdateData = {
        abilityScores: {
          character_id: currentCharacter.id,
          strength: abilityScores.str,
          dexterity: abilityScores.dex,
          constitution: abilityScores.con,
          intelligence: abilityScores.int,
          wisdom: abilityScores.wis,
          charisma: abilityScores.cha
        } as Partial<CharacterAbilityScores>
      }
      
      const success = await HybridDataManager.updateCharacter(currentCharacter.id, characterUpdate)
      if (success) {
        console.log('✅ 能力值保存成功')
        // 保存成功後，立即更新本地狀態，確保與資料庫一致
        setStats(prev => ({
          ...prev,
          abilityScores: abilityScores
        }))
      }
      return success
    } catch (error) {
      console.error('❌ 能力值保存失敗:', error)
      return false
    } finally {
      setIsSaving(false)
    }
  }

  // 保存當前HP
  const saveHP = async (currentHP: number, maxHP?: number) => {
    if (!currentCharacter || isSaving) return false
    
    // 驗證 session
    if (!await validateSessionBeforeSave()) return false
    
    setIsSaving(true)
    try {
      console.log('❤️ 保存HP:', { currentHP, maxHP })
      const updateData: Partial<CharacterCurrentStats> = {
        character_id: currentCharacter.id,
        current_hp: currentHP
      }
      
      // 如果提供了最大HP，也一起更新
      if (maxHP !== undefined) {
        updateData.max_hp = maxHP
      }
      
      const characterUpdate: CharacterUpdateData = {
        currentStats: updateData
      }
      
      const success = await HybridDataManager.updateCharacter(currentCharacter.id, characterUpdate)
      if (success) {
        console.log('✅ HP保存成功')
      }
      return success
    } catch (error) {
      console.error('❌ HP保存失敗:', error)
      return false
    } finally {
      setIsSaving(false)
    }
  }

  // 保存AC
  const saveAC = async (ac: number) => {
    if (!currentCharacter || isSaving) return false
    
    // 驗證 session
    if (!await validateSessionBeforeSave()) return false
    
    setIsSaving(true)
    try {
      console.log('🛡️ 保存AC:', ac)
      const characterUpdate: CharacterUpdateData = {
        currentStats: {
          character_id: currentCharacter.id,
          armor_class: ac
        } as Partial<CharacterCurrentStats>
      }
      
      const success = await HybridDataManager.updateCharacter(currentCharacter.id, characterUpdate)
      if (success) {
        console.log('✅ AC保存成功')
      }
      return success
    } catch (error) {
      console.error('❌ AC保存失敗:', error)
      return false
    } finally {
      setIsSaving(false)
    }
  }

  // 保存先攻值
  const saveInitiative = async (initiative: number) => {
    if (!currentCharacter || isSaving) return false
    
    // 驗證 session
    if (!await validateSessionBeforeSave()) return false
    
    setIsSaving(true)
    try {
      console.log('⚡ 保存先攻值:', initiative)
      const characterUpdate: CharacterUpdateData = {
        currentStats: {
          character_id: currentCharacter.id,
          initiative_bonus: initiative
        } as Partial<CharacterCurrentStats>
      }
      
      const success = await HybridDataManager.updateCharacter(currentCharacter.id, characterUpdate)
      if (success) {
        console.log('✅ 先攻值保存成功')
      }
      return success
    } catch (error) {
      console.error('❌ 先攻值保存失敗:', error)
      return false
    } finally {
      setIsSaving(false)
    }
  }

  // 保存貨幣和經驗值
  const saveCurrencyAndExp = async (gp: number, exp: number) => {
    if (!currentCharacter || isSaving) return false
    
    // 驗證 session
    if (!await validateSessionBeforeSave()) return false
    
    setIsSaving(true)
    try {
      console.log('💰 保存貨幣和經驗值:', { gp, exp })
      const characterUpdate: CharacterUpdateData = {
        character: {
          ...currentCharacter,
          experience: exp,
          updated_at: new Date().toISOString()
        },
        currency: {
          character_id: currentCharacter.id,
          gp: gp,
          copper: stats.currency.cp || 0,
          silver: stats.currency.sp || 0,
          electrum: stats.currency.ep || 0,
          platinum: stats.currency.pp || 0
        } as Partial<CharacterCurrency>
      }
      
      const success = await HybridDataManager.updateCharacter(currentCharacter.id, characterUpdate)
      if (success) {
        console.log('✅ 貨幣和經驗值保存成功')
      }
      return success
    } catch (error) {
      console.error('❌ 貨幣和經驗值保存失敗:', error)
      return false
    } finally {
      setIsSaving(false)
    }
  }

  // 保存頭像 URL
  const saveAvatarUrl = async (avatarUrl: string) => {
    if (!currentCharacter || isSaving) return false
    
    // 驗證 session
    if (!await validateSessionBeforeSave()) return false
    
    setIsSaving(true)
    try {
      console.log('🖼️ 保存頭像 URL:', avatarUrl)
      const characterUpdate: CharacterUpdateData = {
        character: {
          ...currentCharacter,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        }
      }
      
      const success = await HybridDataManager.updateCharacter(currentCharacter.id, characterUpdate)
      if (success) {
        console.log('✅ 頭像保存成功')
        // 更新本地角色資料
        setCurrentCharacter(prev => prev ? { ...prev, avatar_url: avatarUrl } : null)
      }
      return success
    } catch (error) {
      console.error('❌ 頭像保存失敗:', error)
      return false
    } finally {
      setIsSaving(false)
    }
  }

  // 保存額外數據（downtime、renown、自定義記錄等）
  const saveExtraData = async (extraData: any) => {
    if (!currentCharacter || isSaving) return false
    
    // 驗證 session
    if (!await validateSessionBeforeSave()) return false
    
    setIsSaving(true)
    try {
      // 使用專門的 updateExtraData 方法，只更新 extra_data 欄位
      const success = await DetailedCharacterService.updateExtraData(currentCharacter.id, extraData)
      if (success) {
        console.log('✅ 額外數據保存成功')
      }
      return success
    } catch (error) {
      console.error('❌ 額外數據保存失敗:', error)
      return false
    } finally {
      setIsSaving(false)
    }
  }


  const handleWelcomeNext = (mode: UserMode) => {
    setUserMode(mode)
    if (mode === 'authenticated' && user) {
      // 如果是認證模式但還沒檢查轉換，會在 useEffect 中處理
    } else {
      setAppState('characterSelect')
    }
  }

  const handleConversionComplete = (success: boolean) => {
    setNeedsConversion(false)
    setUserMode('authenticated')
    if (success) {
      setAppState('characterSelect')
    } else {
      // 即使轉換失敗也進入角色選擇頁面
      setAppState('characterSelect')
    }
  }

  const handleCharacterSelect = async (character: Character) => {
    setCurrentCharacter(character)
    // 記錄最後使用的角色，下次啟動時自動載入
    if (userMode === 'authenticated') {
      await UserSettingsService.setLastCharacterId(character.id)
    }
    setAppState('main')
  }

  const handleBackToCharacterSelect = () => {
    setCurrentCharacter(null)
    setAppState('characterSelect')
  }

  const handleBackToWelcome = async () => {
    setAppState('welcome')
    setUserMode('anonymous')
    setCurrentCharacter(null)
    setInitError(null) // 清除錯誤訊息
    // 清除最後使用的角色記錄
    if (userMode === 'authenticated') {
      await UserSettingsService.setLastCharacterId(null)
    }
  }

  // 重試初始化
  const handleRetryInit = async () => {
    setInitError(null)
    setIsInitialized(false) // 重置初始化狀態
    setIsLoading(true)
    // useEffect 會自動重新觸發初始化
  }

  // Session 失效後重新登入
  const handleSessionExpiredRelogin = async () => {
    setShowSessionExpired(false)
    await signOut()
    setAppState('welcome')
    setUserMode('anonymous')
    setCurrentCharacter(null)
  }

  // 渲染邏輯
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center px-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-400 border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-300 mb-2">正在連接資料庫...</p>
          <p className="text-slate-500 text-sm">初次載入可能需要 5-10 秒</p>
        </div>
      </div>
    )
  }

  // Session Expired Modal（全域覆蓋）
  if (showSessionExpired) {
    return <SessionExpiredModal isOpen={true} onRelogin={handleSessionExpiredRelogin} />
  }

  // 歡迎頁面
  if (appState === 'welcome') {
    return <WelcomePage onNext={handleWelcomeNext} initError={initError} onRetry={handleRetryInit} />
  }

  // 角色轉換頁面
  if (appState === 'conversion' && user) {
    return (
      <Suspense fallback={
        <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
            <p className="text-slate-400">載入轉換頁面...</p>
          </div>
        </div>
      }>
        <ConversionPage 
          userId={user.id} 
          onComplete={handleConversionComplete} 
        />
      </Suspense>
    )
  }

  // 角色選擇頁面
  if (appState === 'characterSelect') {
    // 準備 userContext
    const selectPageUserContext = user ? {
      isAuthenticated: true,
      userId: user.id
    } : {
      isAuthenticated: false,
      anonymousId: AnonymousService.getAnonymousId()
    }
    
    return (
      <CharacterSelectPage
        userMode={userMode}
        onCharacterSelect={handleCharacterSelect}
        onBack={handleBackToWelcome}
        userContext={selectPageUserContext}
      />
    )
  }

  // 主應用程式
  if (appState === 'main' && currentCharacter) {
    // 動態生成可用的 tabs 列表
    const availableTabs = [
      Tab.CHARACTER,
      Tab.ABILITIES,
      ...(isSpellcaster(stats.classes?.map(c => c.name) || [stats.class]) ? [Tab.SPELLS] : []),
      Tab.COMBAT,
      Tab.MONSTERS,
      Tab.ITEMS,
      Tab.DICE
    ]

    // 滑動處理函數
    const handleTouchStart = (e: React.TouchEvent) => {
      setTouchStartX(e.touches[0].clientX)
      setTouchStartY(e.touches[0].clientY)
      setIsSwiping(true)
    }

    const handleTouchMove = (e: React.TouchEvent) => {
      if (!isSwiping) return
      
      const touchEndX = e.touches[0].clientX
      const touchEndY = e.touches[0].clientY
      const deltaX = touchEndX - touchStartX
      const deltaY = touchEndY - touchStartY
      
      // 判斷是否為主要水平滑動
      // 注意：不使用 preventDefault，改用 CSS touch-action 控制
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
        // 標記為水平滑動中
      }
    }

    const handleTouchEnd = (e: React.TouchEvent) => {
      if (!isSwiping) return
      setIsSwiping(false)
      
      const touchEndX = e.changedTouches[0].clientX
      const touchEndY = e.changedTouches[0].clientY
      const deltaX = touchEndX - touchStartX
      const deltaY = touchEndY - touchStartY
      
      // 判斷是否為水平滑動
      if (Math.abs(deltaX) < Math.abs(deltaY)) return
      
      // 最小滑動距離
      const minSwipeDistance = 50
      
      if (Math.abs(deltaX) > minSwipeDistance) {
        const currentIndex = availableTabs.indexOf(activeTab)
        
        if (deltaX > 0) {
          // 右滑 - 切換到上一個 tab
          if (currentIndex > 0) {
            setActiveTab(availableTabs[currentIndex - 1])
          }
        } else {
          // 左滑 - 切換到下一個 tab
          if (currentIndex < availableTabs.length - 1) {
            setActiveTab(availableTabs[currentIndex + 1])
          }
        }
      }
    }

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        {/* 分頁導航 */}
        <nav className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 shadow-lg">
          <div className="flex overflow-x-auto">
            {[
              { id: Tab.CHARACTER, label: '角色', icon: '👤' },
              { id: Tab.ABILITIES, label: '能力', icon: '⚡' },
              ...(isSpellcaster(stats.classes?.map(c => c.name) || [stats.class]) 
                ? [{ id: Tab.SPELLS, label: '法術', icon: '✨' }] 
                : []),
              { id: Tab.COMBAT, label: '戰鬥', icon: '⚔️' },
              { id: Tab.MONSTERS, label: '怪物', icon: '👹' },
              { id: Tab.ITEMS, label: '道具', icon: '📦' },
              { id: Tab.DICE, label: '骰子', icon: '🎲' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
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
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors whitespace-nowrap ml-auto"
            >
              <span className="text-base">🔄</span>
              切換角色
            </button>
          </div>
        </nav>

        {/* 主要內容 */}
        <main 
          className="p-6"
          style={{ touchAction: 'pan-y' }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {activeTab === Tab.CHARACTER && (
            <>
              {isCharacterDataReady ? (
                <CharacterSheet
                  stats={stats}
                  setStats={setStats}
                  characterId={currentCharacter?.id}
                  onSaveSkillProficiency={saveSkillProficiency}
                  onSaveSavingThrowProficiencies={saveSavingThrowProficiencies}
                  onSaveCharacterBasicInfo={saveCharacterBasicInfo}
                  onSaveAbilityScores={saveAbilityScores}
                  onSaveCurrencyAndExp={saveCurrencyAndExp}
                  onSaveExtraData={saveExtraData}
                  onSaveAvatarUrl={saveAvatarUrl}
                />
              ) : (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">載入角色資料中...</p>
                  </div>
                </div>
              )}
            </>
          )}
          {activeTab === Tab.COMBAT && (
            <Suspense fallback={
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
                  <p className="text-slate-400">載入戰鬥頁面...</p>
                </div>
              </div>
            }>
              <CombatView 
                stats={stats} 
                setStats={setStats} 
                characterId={currentCharacter?.id}
                onSaveHP={saveHP}
                onSaveAC={saveAC}
                onSaveInitiative={saveInitiative}
              />
            </Suspense>
          )}

          {activeTab === Tab.MONSTERS && (
            <Suspense fallback={
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
                  <p className="text-slate-400">載入怪物頁面...</p>
                </div>
              </div>
            }>
              <MonstersPage />
            </Suspense>
          )}

          {activeTab === Tab.ITEMS && (
            <Suspense fallback={
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
                  <p className="text-slate-400">載入道具頁面...</p>
                </div>
              </div>
            }>
              <ItemsPage characterId={currentCharacter?.id || ''} />
            </Suspense>
          )}

          {activeTab === Tab.ABILITIES && currentCharacter && (
            <Suspense fallback={
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
                  <p className="text-slate-400">載入特殊能力頁面...</p>
                </div>
              </div>
            }>
              <AbilitiesPage characterId={currentCharacter.id} />
            </Suspense>
          )}

          {activeTab === Tab.SPELLS && currentCharacter && (
            <Suspense fallback={
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
                  <p className="text-slate-400">載入法術頁面...</p>
                </div>
              </div>
            }>
              <SpellsPage
                characterId={currentCharacter.id}
                characterClasses={stats.classes || [
                  { 
                    name: stats.class, 
                    level: stats.level, 
                    hitDie: getClassHitDie(stats.class) as any,
                    isPrimary: true 
                  }
                ]}
                intelligence={stats.abilityScores.int}
              />
            </Suspense>
          )}

          {activeTab === Tab.DICE && (
            <Suspense fallback={
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
                  <p className="text-slate-400">載入骰子頁面...</p>
                </div>
              </div>
            }>
              <DiceRoller />
            </Suspense>
          )}
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