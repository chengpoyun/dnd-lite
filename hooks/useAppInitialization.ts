import { useCallback, useEffect, useRef, useState } from 'react';
import type { Character } from '../lib/supabase';
import type { CharacterStats } from '../types';
import { AnonymousService } from '../services/anonymous';
import { DatabaseInitService } from '../services/databaseInit';
import { DetailedCharacterService } from '../services/detailedCharacter';
import { HybridDataManager } from '../services/hybridDataManager';
import { UserSettingsService } from '../services/userSettings';
import { buildCharacterStats, INITIAL_STATS } from '../utils/appInit';

type AppState = 'welcome' | 'conversion' | 'characterSelect' | 'main'
type UserMode = 'authenticated' | 'anonymous'

interface AppInitParams {
  user: { id: string } | null
  authLoading: boolean
}

export function useAppInitialization({ user, authLoading }: AppInitParams) {
  const [appState, setAppState] = useState<AppState>('welcome')
  const [userMode, setUserMode] = useState<UserMode>('anonymous')
  const [needsConversion, setNeedsConversion] = useState(false)
  const [showSessionExpired, setShowSessionExpired] = useState(false)

  const [currentCharacter, setCurrentCharacter] = useState<Character | null>(null)
  const [stats, setStats] = useState<CharacterStats>(INITIAL_STATS)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingCharacter, setIsLoadingCharacter] = useState(false)
  const [isCharacterDataReady, setIsCharacterDataReady] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading || isInitialized) {
      return
    }
    
    const initializeApp = async () => {
      if (isInitialized) {
        console.warn('⚠️ 初始化已在進行中，跳過')
        return
      }
      
      const startTime = performance.now()
      console.log('🚀 開始應用初始化...')
      setIsLoading(true)
      setIsInitialized(true)
      
      const loadWithRetry = async (loadFn: () => Promise<void>, maxRetries = 1) => {
        let lastError: any = null
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            if (attempt > 0) {
              console.log(`🔄 自動重試第 ${attempt} 次...`)
              await new Promise(resolve => setTimeout(resolve, 1000))
            }
            
            await loadFn()
            return
          } catch (error: any) {
            lastError = error
            console.warn(`⚠️ 載入失敗 (嘗試 ${attempt + 1}/${maxRetries + 1}):`, error?.message)
            if (attempt < maxRetries) {
              continue
            }
          }
        }
        
        throw lastError
      }
      
      try {
        const dbInitStart = performance.now()
        await DatabaseInitService.initializeTables()
        console.log(`⏱️ DatabaseInit: ${(performance.now() - dbInitStart).toFixed(1)}ms`)
        
        if (user) {
          const conversionCheckStart = performance.now()
          const hasAnonymousChars = await DetailedCharacterService.hasAnonymousCharactersToConvert()
          console.log(`⏱️ 轉換檢查: ${(performance.now() - conversionCheckStart).toFixed(1)}ms`)
          
          if (hasAnonymousChars) {
            console.log('🔄 檢測到匿名角色，準備轉換')
            setUserMode('anonymous')
            setNeedsConversion(true)
            setAppState('conversion')
          } else {
            setUserMode('authenticated')
            
            await loadWithRetry(async () => {
              const userContext = {
                isAuthenticated: true,
                userId: user.id
              }
              const characters = await HybridDataManager.getUserCharacters(userContext)
              
              if (characters.length > 0) {
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
                      console.warn('⚠️ 上次使用的角色已不存在，已清理')
                      await UserSettingsService.setLastCharacterId(characterToLoad.id)
                    }
                  } else {
                    await UserSettingsService.setLastCharacterId(characterToLoad.id)
                  }
                } catch (settingsError) {
                  console.warn('設定服務錯誤:', settingsError)
                }
                
                setCurrentCharacter(characterToLoad)
                setAppState('main')
              } else {
                console.log('✅ 用戶沒有角色，進入選擇頁面')
                setAppState('characterSelect')
              }
            })
          }
        } else {
          await loadWithRetry(async () => {
            const anonInitStart = performance.now()
            await AnonymousService.init()
            console.log(`⏱️ 匿名服務初始化: ${(performance.now() - anonInitStart).toFixed(1)}ms`)
            
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
              console.log('✅ 匿名用戶沒有角色，進入歡迎頁面')
              setAppState('welcome')
            }
          })
        }
      } catch (error: any) {
        console.error('❌ 初始化失敗（已自動重試）:', error?.message)
        setInitError('載入失敗，可能是網路問題。請點擊重試。')
        setAppState('welcome')
      } finally {
        const endTime = performance.now()
        console.log(`⏱️ 應用初始化總耗時: ${(endTime - startTime).toFixed(1)}ms`)
        setIsLoading(false)
      }
    }
    
    initializeApp()
  }, [user, authLoading, isInitialized])

  useEffect(() => {
    const checkConversion = async () => {
      if (user && userMode === 'anonymous') {
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

  useEffect(() => {
    if (currentCharacter && !isLoadingCharacter) {
      setIsCharacterDataReady(false)
      void loadCharacterStats()
    }
  }, [currentCharacter])

  const loadCharacterStats = async () => {
    if (!currentCharacter || isLoadingCharacter) {
      return
    }
    
    setIsLoadingCharacter(true)

    try {
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
        await UserSettingsService.setLastCharacterId('')
        setCurrentCharacter(null)
        setAppState('characterSelect')
        setIsLoadingCharacter(false)
        return
      }
      
      if (characterData && characterData.character) {
        const finalStats = buildCharacterStats(characterData, stats)
        setStats(finalStats)
        setIsCharacterDataReady(true)
      } else {
        console.warn('⚠️ 角色數據不完整，使用預設值')
        setStats(INITIAL_STATS)
        setIsCharacterDataReady(true)
      }
    } catch (error: any) {
      console.error('❌ 載入角色數據失敗:', error)
      console.error('錯誤詳情:', {
        characterId: currentCharacter?.id,
        characterName: currentCharacter?.name,
        errorMessage: error.message,
        errorStack: error.stack
      })
      setStats(INITIAL_STATS)
      setIsCharacterDataReady(true)
    } finally {
      setIsLoadingCharacter(false)
    }
  }

  const resetInitialization = () => {
    setInitError(null)
    setIsInitialized(false)
    setIsLoading(true)
  }

  const loadCharacterStatsRef = useRef<() => Promise<void>>(() => Promise.resolve())
  loadCharacterStatsRef.current = loadCharacterStats

  /** 清除目前角色的快取並重新載入角色數據（例如儲存能力/物品後可呼叫以更新加值列表） */
  const refetchCharacterStats = useCallback(() => {
    if (!currentCharacter) return
    DetailedCharacterService.clearCharacterCache(currentCharacter.id)
    void loadCharacterStatsRef.current()
  }, [currentCharacter])

  return {
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
    isLoadingCharacter,
    isCharacterDataReady,
    initError,
    setInitError,
    resetInitialization,
    refetchCharacterStats,
  }
}
