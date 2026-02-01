import React, { useState, useEffect } from 'react'
import { DetailedCharacterService } from '../services/detailedCharacter'
import { useAuth } from '../contexts/AuthContext'
import type { Character } from '../lib/supabase'

interface CharacterSelectorProps {
  currentCharacterId: string | null
  onCharacterChange: (character: Character) => void
  onCreateCharacter: () => void
  userContext?: {
    isAuthenticated: boolean
    userId?: string
    anonymousId?: string
  }
}

export const CharacterSelector: React.FC<CharacterSelectorProps> = ({
  currentCharacterId,
  onCharacterChange,
  onCreateCharacter,
  userContext
}) => {
  const { user } = useAuth()
  const [characters, setCharacters] = useState<Character[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  // 防止重複載入
  const hasLoadedRef = React.useRef(false)

  useEffect(() => {
    if (!hasLoadedRef.current && (user || userContext)) {
      console.log('[DEBUG] CharacterSelector 首次載入')
      hasLoadedRef.current = true
      loadCharacters()
    }
  }, [user, userContext])

  const loadCharacters = async () => {
    try {
      setIsLoading(true)
      const userCharacters = await DetailedCharacterService.getUserCharacters(userContext)
      setCharacters(userCharacters)
    } catch (error) {
      console.error('載入角色清單失敗:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateCharacter = () => {
    // 匿名用戶只能有一個角色
    if (!user && characters.length >= 1) {
      alert('匿名用戶只能創建一個角色。請登入 Google 帳號以創建更多角色。')
      return
    }
    onCreateCharacter()
    setIsDropdownOpen(false)
  }

  const currentCharacter = characters.find(char => char.id === currentCharacterId)
  const otherCharacters = characters.filter(char => char.id !== currentCharacterId)

  return (
    <div className="relative">
      {/* 目前角色按鈕 */}
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 rounded-lg p-3 transition-colors duration-200 min-w-0 max-w-48"
      >
        <div className="flex-1 min-w-0 text-left">
          {currentCharacter ? (
            <>
              <div className="text-sm font-medium text-slate-200 truncate">
                {currentCharacter.name}
              </div>
              <div className="text-xs text-slate-400 truncate">
                Lv.{currentCharacter.level} {currentCharacter.character_class}
                {!user && <span className="ml-1 text-amber-400">(匿名)</span>}
              </div>
            </>
          ) : (
            <div className="text-sm text-slate-400">
              選擇角色
            </div>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 flex-shrink-0 ${
            isDropdownOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 角色選擇下拉選單 */}
      {isDropdownOpen && (
        <div className="absolute left-0 top-12 w-72 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50">
          {/* 標題 */}
          <div className="p-4 border-b border-slate-700">
            <h3 className="text-sm font-medium text-slate-200 flex items-center justify-between">
              選擇角色
              {!user && (
                <span className="text-xs text-amber-400 bg-amber-400/10 px-2 py-1 rounded">
                  匿名模式 (最多1個)
                </span>
              )}
            </h3>
          </div>

          {/* 角色清單 */}
          <div className="max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-amber-500 border-t-transparent mx-auto"></div>
                <span className="text-xs text-slate-400 mt-2 block">載入中...</span>
              </div>
            ) : (
              <>
                {/* 其他角色 */}
                {otherCharacters.map((character) => (
                  <button
                    key={character.id}
                    onClick={() => {
                      onCharacterChange(character)
                      setIsDropdownOpen(false)
                    }}
                    className="w-full p-3 text-left hover:bg-slate-700 transition-colors duration-200 border-b border-slate-700/50 last:border-b-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                        <span className="text-lg text-slate-900 font-bold">
                          {character.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-200 truncate">
                          {character.name}
                          {character.is_anonymous && <span className="ml-1 text-amber-400 text-xs">(匿名)</span>}
                        </div>
                        <div className="text-xs text-slate-400 truncate">
                          Lv.{character.level} {character.character_class}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}

                {/* 無角色提示 */}
                {characters.length === 0 && (
                  <div className="p-4 text-center">
                    <span className="text-sm text-slate-400">還沒有角色</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* 創建新角色按鈕 */}
          <div className="p-3 border-t border-slate-700">
            <button
              onClick={handleCreateCharacter}
              disabled={!user && characters.length >= 1}
              className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-slate-900 font-medium py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-amber-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {!user && characters.length >= 1 ? '需要登入以創建更多' : '創建新角色'}
            </button>
            {!user && characters.length >= 1 && (
              <p className="text-xs text-slate-500 mt-2 text-center">
                匿名用戶限制一個角色
              </p>
            )}
          </div>
        </div>
      )}

      {/* 點擊外部關閉下拉選單 */}
      {isDropdownOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </div>
  )
}