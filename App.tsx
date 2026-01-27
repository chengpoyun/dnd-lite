import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { WelcomePage } from './components/WelcomePage';
import { CharacterSelectPage } from './components/CharacterSelectPage';
import { CharacterSheet } from './components/CharacterSheet';
import { DiceRoller } from './components/DiceRoller';
import { CombatView } from './components/CombatView';

import { CharacterStats } from './types';
import { getModifier } from './utils/helpers';
import { HybridDataManager } from './services/hybridDataManager';
import { AuthService } from './services/auth';
import { AnonymousService } from './services/anonymous';
import { DatabaseInitService } from './services/databaseInit';
import { UserSettingsService } from './services/userSettings';
import { DetailedCharacterService } from './services/detailedCharacter';
import type { Character, CharacterAbilityScores, CharacterCurrentStats, CharacterCurrency, CharacterUpdateData, CharacterSkillProficiency, CharacterSavingThrow } from './lib/supabase';

enum Tab {
  CHARACTER = 'character',
  COMBAT = 'combat',
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
  const { user } = useAuth();
  
  // 應用程式狀態
  const [appState, setAppState] = useState<AppState>('welcome')
  const [userMode, setUserMode] = useState<UserMode>('anonymous')
  const [activeTab, setActiveTab] = useState<Tab>(Tab.CHARACTER)
  
  // 角色數據
  const [currentCharacter, setCurrentCharacter] = useState<Character | null>(null)
  const [stats, setStats] = useState<CharacterStats>(INITIAL_STATS)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingCharacter, setIsLoadingCharacter] = useState(false) // 添加角色載入狀態
  const [isCharacterDataReady, setIsCharacterDataReady] = useState(false) // 角色資料是否已載入完成
  const [isSaving, setIsSaving] = useState(false) // 添加保存狀態鎖

  // 初始化狀態
  useEffect(() => {
    const initializeApp = async () => {
      setIsLoading(true)
      
      // 添加超時機制
      const timeoutId = setTimeout(() => {
        console.error('初始化超時，強制進入歡迎頁面')
        setAppState('welcome')
        setIsLoading(false)
      }, 10000) // 10秒超時
      
      try {
        console.log('🚀 開始初始化應用...')
        
        // 首先初始化資料庫
        console.log('1. 初始化資料庫...')
        await DatabaseInitService.initializeTables()
        
        // 檢查用戶登入狀態  
        console.log('2. 檢查用戶登入狀態...')
        const isAuth = await AuthService.isAuthenticated()
        if (isAuth) {
          console.log('3. 用戶已認證，設置認證模式')
          setUserMode('authenticated')
          
          // 檢查是否有角色
          console.log('4. 載入角色列表...')
          const characters = await HybridDataManager.getUserCharacters()
          console.log(`找到 ${characters.length} 個角色`)
          
          if (characters.length > 0) {
            console.log('5. 有角色數據，載入最後使用的角色...')
            
            let characterToLoad = characters[0] // 預設使用第一個角色
            
            try {
              const lastCharacterId = await UserSettingsService.getLastCharacterId()
              console.log('6. 最後使用角色 ID:', lastCharacterId)
              
              // 如果有記錄最後使用的角色，嘗試找到它
              if (lastCharacterId) {
                const lastCharacter = characters.find(c => c.id === lastCharacterId)
                if (lastCharacter) {
                  characterToLoad = lastCharacter
                } else {
                  // 最後記錄的角色不存在，清除記錄
                  await UserSettingsService.setLastCharacterId(null)
                }
              }
            } catch (settingsError) {
              console.error('無法載入用戶設定，使用預設角色:', settingsError)
              characterToLoad = characters[0]
            }
            
            console.log('7. 設定角色並進入主頁面:', characterToLoad.name)
            
            // 更新最後使用的角色記錄
            try {
              await UserSettingsService.setLastCharacterId(characterToLoad.id)
            } catch (updateError) {
              console.warn('無法更新最後使用角色記錄:', updateError)
            }
            
            // 直接設定角色並進入主頁面
            setCurrentCharacter(characterToLoad)
            setAppState('main')
            console.log('✅ 成功載入角色，進入主應用')
          } else {
            setAppState('characterSelect') // 沒有角色，顯示角色選擇頁來創建第一個角色
          }
        } else {
          // 檢查是否有本地角色數據
          const characters = await HybridDataManager.getUserCharacters()
          if (characters.length > 0) {
            setUserMode('anonymous')
            
            // 有角色，直接載入最後使用的角色（匿名模式下無法使用 UserSettingsService）
            let characterToLoad = characters[0] // 預設使用第一個角色
            
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
        console.error('😨 初始化失敗:', error)
        // 在出錯時進入歡迎頁面
        setAppState('welcome')
      } finally {
        clearTimeout(timeoutId) // 清理超時定時器
        setIsLoading(false)
        console.log('⚙️ 初始化完成')
      }
    }

    initializeApp()
  }, [user])

  // 載入角色數據
  useEffect(() => {
    if (currentCharacter) {
      setIsCharacterDataReady(false) // 重置資料準備狀態
      loadCharacterStats()
    }
  }, [currentCharacter])

  const loadCharacterStats = async () => {
    if (!currentCharacter || isLoadingCharacter) return
    
    setIsLoadingCharacter(true) // 設置載入狀態

    try {
      const characterData = await HybridDataManager.getCharacter(currentCharacter.id)
      
      // 添加除錯資訊
      console.log('📊 角色數據載入:', {
        hasCharacterData: !!characterData,
        currentCharacter: currentCharacter.name,
        characterId: currentCharacter.id,
        characterDataKeys: characterData ? Object.keys(characterData) : 'null',
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
                console.log('📊 載入技能熟練度（陣列格式）:', result);
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
                console.log('📊 載入技能熟練度（物件格式）:', result);
                return result;
              }
            } catch (skillError) {
              console.warn('🔧 技能熟練度處理異常，使用預設值:', skillError)
            }
            
            // 預設值 - 空物件（沒有任何技能熟練度）
            console.log('📊 使用預設技能熟練度（空）');
            return result;
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
    
    console.log('🎯 保存技能熟練度:', { skillName, level })
    return await HybridDataManager.updateSingleSkillProficiency(currentCharacter.id, skillName, level)
  }

  // 保存豁免熟練度
  const saveSavingThrowProficiencies = async (proficiencies: string[]) => {
    if (!currentCharacter || isSaving) return false
    
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
      }
      return success
    } catch (error) {
      console.error('❌ 能力值保存失敗:', error)
      return false
    } finally {
      setIsSaving(false)
    }
  }

  // 保存貨幣和經驗值
  const saveCurrencyAndExp = async (gp: number, exp: number) => {
    if (!currentCharacter || isSaving) return false
    
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
    
    setIsSaving(true)
    try {
      console.log('📊 保存額外數據:', extraData)
      
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

  // 手動保存功能
  const handleManualSave = async () => {
    if (!currentCharacter || isSaving) {
      console.log('❌ 無法手動保存：', { 
        hasCharacter: !!currentCharacter, 
        isSaving: isSaving 
      })
      return
    }
    
    setIsSaving(true)
    setIsLoadingCharacter(true)
    try {
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
          total_hit_dice: stats.hitDice.total || stats.level || 1,
          armor_class: stats.ac || 10,
          initiative_bonus: stats.initiative || 0,
          speed: stats.speed || 30,
          hit_die_type: stats.hitDice.die || 'd8',
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
          gp: stats.currency.gp || 0,
          copper: stats.currency.cp || 0,
          silver: stats.currency.sp || 0,
          electrum: stats.currency.ep || 0,
          platinum: stats.currency.pp || 0
        } as Partial<CharacterCurrency>,
        // 添加技能熟練度保存 - 直接處理 proficiencies 物件
        skillProficiencies: Object.entries(stats.proficiencies || {}).map(([skillName, proficiency]) => ({
          character_id: currentCharacter.id,
          skill_name: skillName,
          proficiency_level: proficiency as number,
          updated_at: new Date().toISOString()
        } as Omit<CharacterSkillProficiency, 'id'>)),
        // 添加豁免熟練度保存
        savingThrows: (stats.savingProficiencies || []).map((ability: string) => {
          // 將縮寫形式轉換為完整名稱
          const abilityMap: Record<string, string> = {
            str: 'strength',
            dex: 'dexterity', 
            con: 'constitution',
            int: 'intelligence',
            wis: 'wisdom',
            cha: 'charisma'
          }
          return {
            character_id: currentCharacter.id,
            ability: abilityMap[ability] || ability,
            is_proficient: true
          }
        })
      }

      const success = await HybridDataManager.updateCharacter(currentCharacter.id, characterUpdates)
      
      if (success) {
        alert('✅ 角色數據保存成功！')
      } else {
        alert('❌ 保存失敗，請檢查網絡連接或重試')
      }
    } catch (error) {
      console.error('手動保存失敗:', error)
      alert('❌ 保存時發生錯誤，請重試')
    } finally {
      setIsLoadingCharacter(false)
      setIsSaving(false) // 釋放保存鎖
    }
  }
  const handleWelcomeNext = (mode: UserMode) => {
    setUserMode(mode)
    setAppState('characterSelect')
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
    // 清除最後使用的角色記錄
    if (userMode === 'authenticated') {
      await UserSettingsService.setLastCharacterId(null)
    }
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
            
            {/* 手動保存按鈕 */}
            <button
              onClick={handleManualSave}
              disabled={isLoadingCharacter}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap ${
                isLoadingCharacter 
                  ? 'text-slate-500 cursor-not-allowed' 
                  : 'text-green-400 hover:text-green-200'
              }`}
            >
              <span className="text-base">💾</span>
              {isLoadingCharacter ? '保存中...' : '保存'}
            </button>
            
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
            <>
              {isCharacterDataReady ? (
                <CharacterSheet
                  stats={stats}
                  setStats={setStats}
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
            <CombatView stats={stats} setStats={setStats} characterId={currentCharacter?.id} />
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