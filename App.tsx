import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { WelcomePage } from './components/WelcomePage';
import { CharacterSheet } from './components/CharacterSheet';
import { SessionExpiredModal } from './components/SessionExpiredModal';
import { useAppInitialization } from './hooks/useAppInitialization';

// 延遲載入非關鍵頁面
const CharacterSelectPage = lazy(() => import('./components/CharacterSelectPage').then(m => ({ default: m.CharacterSelectPage })));
const DiceRoller = lazy(() => import('./components/DiceRoller').then(m => ({ default: m.DiceRoller })));
const CombatView = lazy(() => import('./components/CombatView').then(m => ({ default: m.CombatView })));
const ConversionPage = lazy(() => import('./components/ConversionPage').then(m => ({ default: m.ConversionPage })));
const SpellsPage = lazy(() => import('./components/SpellsPage').then(m => ({ default: m.SpellsPage })));
const MonstersPage = lazy(() => import('./components/MonstersPage'));
const ItemsPage = lazy(() => import('./components/ItemsPage'));
const AbilitiesPage = lazy(() => import('./components/AbilitiesPage'));
const AboutPage = lazy(() => import('./components/AboutPage'));

import { CharacterStats } from './types';
import { formatClassDisplay, getPrimaryClass, getTotalLevel, getClassHitDie } from './utils/classUtils';
import { isSpellcaster } from './utils/spellUtils';
import { HybridDataManager } from './services/hybridDataManager';
import { DetailedCharacterService } from './services/detailedCharacter';
import { AnonymousService } from './services/anonymous';
import { UserSettingsService } from './services/userSettings';
import type { Character, CharacterAbilityScores, CharacterCurrentStats, CharacterCurrency, CharacterUpdateData, CharacterSkillProficiency, CharacterSavingThrow } from './lib/supabase';

enum Tab {
  CHARACTER = 'character',
  ABILITIES = 'abilities',
  COMBAT = 'combat',
  SPELLS = 'spells',
  MONSTERS = 'monsters',
  ITEMS = 'items',
  DICE = 'dice',
  ABOUT = 'about'
}

type AppState = 'welcome' | 'conversion' | 'characterSelect' | 'main'
type UserMode = 'authenticated' | 'anonymous'

const AuthenticatedApp: React.FC = () => {
  const { user, isLoading: authLoading, signOut } = useAuth();
  
  const {
    appState,
    setAppState,
    userMode,
    setUserMode,
    needsConversion,
    setNeedsConversion,
    showSessionExpired,
    setShowSessionExpired,
    currentCharacter,
    setCurrentCharacter,
    stats,
    setStats,
    isLoading,
    isCharacterDataReady,
    initError,
    setInitError,
    resetInitialization,
  } = useAppInitialization({ user, authLoading })

  // 應用程式狀態
  const [activeTab, setActiveTab] = useState<Tab>(Tab.CHARACTER)
  
  // 滑動切換 Tab 狀態
  const [touchStartX, setTouchStartX] = useState<number>(0)
  const [touchStartY, setTouchStartY] = useState<number>(0)
  const [isSwiping, setIsSwiping] = useState(false)
  const navContainerRef = useRef<HTMLDivElement>(null)
  const activeTabRef = useRef<HTMLButtonElement>(null)
  
  // 角色數據
  const [isSaving, setIsSaving] = useState(false) // 添加保存狀態

  // 當 activeTab 改變時，自動滾動到對應的 tab 按鈕
  useEffect(() => {
    if (activeTabRef.current && navContainerRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      })
    }
  }, [activeTab])

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

  // 保存屬性額外調整值（寫入 character_ability_scores 的 *_bonus / *_modifier_bonus）
  const saveAbilityBonuses = async (abilityBonuses: Record<string, number>, modifierBonuses: Record<string, number>) => {
    if (!currentCharacter || isSaving) return false
    if (!await validateSessionBeforeSave()) return false
    setIsSaving(true)
    try {
      const success = await DetailedCharacterService.updateAbilityBonuses(currentCharacter.id, abilityBonuses, modifierBonuses)
      if (success) console.log('✅ 屬性加成保存成功')
      return success
    } catch (error) {
      console.error('❌ 屬性加成保存失敗:', error)
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

  // 保存速度值
  const saveSpeed = async (speed: number) => {
    if (!currentCharacter || isSaving) return false
    
    // 驗證 session
    if (!await validateSessionBeforeSave()) return false
    
    setIsSaving(true)
    try {
      console.log('🏃 保存速度值:', speed)
      const characterUpdate: CharacterUpdateData = {
        currentStats: {
          character_id: currentCharacter.id,
          speed: speed
        } as Partial<CharacterCurrentStats>
      }
      
      const success = await HybridDataManager.updateCharacter(currentCharacter.id, characterUpdate)
      if (success) {
        console.log('✅ 速度值保存成功')
      }
      return success
    } catch (error) {
      console.error('❌ 速度值保存失敗:', error)
      return false
    } finally {
      setIsSaving(false)
    }
  }

  // 保存法術攻擊加值
  const saveSpellAttackBonus = async (newBonus: number) => {
    if (!currentCharacter || isSaving) return false
    
    // 驗證 session
    if (!await validateSessionBeforeSave()) return false
    
    setIsSaving(true)
    try {
      console.log('🎯 保存法術攻擊加值:', newBonus)
      const characterUpdate: CharacterUpdateData = {
        character: currentCharacter,
        currentStats: {
          character_id: currentCharacter.id,
          spell_attack_bonus: newBonus
        } as Partial<CharacterCurrentStats>
      }
      
      const success = await HybridDataManager.updateCharacter(currentCharacter.id, characterUpdate)
      if (success) {
        console.log('✅ 法術攻擊加值保存成功')
        // 更新本地狀態
        setStats(prev => ({
          ...prev,
          spell_attack_bonus: newBonus
        }))
      }
      return success
    } catch (error) {
      console.error('❌ 法術攻擊加值保存失敗:', error)
      return false
    } finally {
      setIsSaving(false)
    }
  }

  // 保存法術豁免DC
  const saveSpellSaveDC = async (newDC: number) => {
    if (!currentCharacter || isSaving) return false
    
    // 驗證 session
    if (!await validateSessionBeforeSave()) return false
    
    setIsSaving(true)
    try {
      console.log('🛡️ 保存法術豁免DC:', newDC)
      const characterUpdate: CharacterUpdateData = {
        character: currentCharacter,
        currentStats: {
          character_id: currentCharacter.id,
          spell_save_dc: newDC
        } as Partial<CharacterCurrentStats>
      }
      
      const success = await HybridDataManager.updateCharacter(currentCharacter.id, characterUpdate)
      if (success) {
        console.log('✅ 法術豁免DC保存成功')
        // 更新本地狀態
        setStats(prev => ({
          ...prev,
          spell_save_dc: newDC
        }))
      }
      return success
    } catch (error) {
      console.error('❌ 法術豁免DC保存失敗:', error)
      return false
    } finally {
      setIsSaving(false)
    }
  }

  // 保存武器命中加值
  const saveWeaponAttackBonus = async (newBonus: number) => {
    if (!currentCharacter || isSaving) return false
    if (!await validateSessionBeforeSave()) return false
    setIsSaving(true)
    try {
      const characterUpdate: CharacterUpdateData = {
        character: currentCharacter,
        currentStats: {
          character_id: currentCharacter.id,
          weapon_attack_bonus: newBonus
        } as Partial<CharacterCurrentStats>
      }
      const success = await HybridDataManager.updateCharacter(currentCharacter.id, characterUpdate)
      if (success) {
        setStats(prev => ({ ...prev, weapon_attack_bonus: newBonus }))
      }
      return success
    } catch (error) {
      console.error('❌ 武器命中保存失敗:', error)
      return false
    } finally {
      setIsSaving(false)
    }
  }

  // 保存武器傷害加值
  const saveWeaponDamageBonus = async (newBonus: number) => {
    if (!currentCharacter || isSaving) return false
    if (!await validateSessionBeforeSave()) return false
    setIsSaving(true)
    try {
      const characterUpdate: CharacterUpdateData = {
        character: currentCharacter,
        currentStats: {
          character_id: currentCharacter.id,
          weapon_damage_bonus: newBonus
        } as Partial<CharacterCurrentStats>
      }
      const success = await HybridDataManager.updateCharacter(currentCharacter.id, characterUpdate)
      if (success) {
        setStats(prev => ({ ...prev, weapon_damage_bonus: newBonus }))
      }
      return success
    } catch (error) {
      console.error('❌ 武器傷害加值保存失敗:', error)
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

  // 保存戰鬥筆記
  const saveCombatNotes = async (notes: string | null) => {
    if (!currentCharacter || isSaving) return false;
    if (!(await validateSessionBeforeSave())) return false;
    setIsSaving(true);
    try {
      const success = await DetailedCharacterService.updateCurrentStats(currentCharacter.id, { combat_notes: notes });
      if (success) console.log('✅ 戰鬥筆記保存成功');
      return success;
    } catch (error) {
      console.error('❌ 戰鬥筆記保存失敗:', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

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
    setActiveTab(Tab.CHARACTER) // 選擇角色後切換到角色頁面
    setAppState('main')
  }

  const handleBackToCharacterSelect = () => {
    setCurrentCharacter(null)
    setAppState('characterSelect')
  }

  const handleLogout = async () => {
    await signOut()
    setAppState('welcome')
    setUserMode('anonymous')
    setCurrentCharacter(null)
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
    resetInitialization()
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
      Tab.DICE,
      Tab.ABOUT
    ]

    // 滑動處理函數
    const handleTouchStart = (e: React.TouchEvent) => {
      // 檢查是否有 modal 開啟（檢查是否有 fixed overlay）
      const isModalOpen = document.querySelector('.fixed.inset-0.z-\\[120\\]') !== null ||
                          document.querySelector('.fixed.inset-0.z-\\[100\\]') !== null;
      
      // 如果有 modal 開啟，不處理滑動
      if (isModalOpen) return;
      
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
          <div ref={navContainerRef} className="flex overflow-x-auto">
            {[
              { id: Tab.CHARACTER, label: '角色', icon: '👤' },
              { id: Tab.ABILITIES, label: '能力', icon: '⚡' },
              ...(isSpellcaster(stats.classes?.map(c => c.name) || [stats.class]) 
                ? [{ id: Tab.SPELLS, label: '法術', icon: '✨' }] 
                : []),
              { id: Tab.COMBAT, label: '戰鬥', icon: '⚔️' },
              { id: Tab.MONSTERS, label: '怪物', icon: '👹' },
              { id: Tab.ITEMS, label: '道具', icon: '📦' },
              { id: Tab.DICE, label: '骰子', icon: '🎲' },
              { id: Tab.ABOUT, label: '關於', icon: 'ℹ️' }
            ].map((tab) => (
              <button
                key={tab.id}
                ref={activeTab === tab.id ? activeTabRef : null}
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
                  onSaveAbilityBonuses={saveAbilityBonuses}
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
                onSaveSpeed={saveSpeed}
                onSaveSpellAttackBonus={saveSpellAttackBonus}
                onSaveSpellSaveDC={saveSpellSaveDC}
                onSaveWeaponAttackBonus={saveWeaponAttackBonus}
                onSaveWeaponDamageBonus={saveWeaponDamageBonus}
                onSaveCombatNotes={saveCombatNotes}
                showSpellStats={isSpellcaster(stats.classes?.map(c => c.name) || [stats.class])}
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

          {activeTab === Tab.ABOUT && (
            <Suspense fallback={
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
                  <p className="text-slate-400">載入關於頁面...</p>
                </div>
              </div>
            }>
              <AboutPage
                userMode={userMode}
                onSwitchCharacter={handleBackToCharacterSelect}
                onLogout={handleLogout}
              />
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