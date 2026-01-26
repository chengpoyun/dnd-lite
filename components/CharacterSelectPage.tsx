import React, { useState, useEffect } from 'react'
import type { Character } from '../lib/supabase'
import { HybridDataManager } from '../services/hybridDataManager'
import { AuthService } from '../services/auth'
import { PageContainer, Card, Button, Input, Loading, Title, Subtitle, Avatar, BackButton } from './ui'
import { STYLES, combineStyles } from '../styles/common'
import { formatDate } from '../utils/common'

interface CharacterSelectPageProps {
  userMode: 'authenticated' | 'anonymous'
  onCharacterSelect: (character: Character) => void
  onBack: () => void
}

export const CharacterSelectPage: React.FC<CharacterSelectPageProps> = ({
  userMode,
  onCharacterSelect,
  onBack
}) => {
  const [characters, setCharacters] = useState<Character[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [newCharacterName, setNewCharacterName] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)

  useEffect(() => {
    loadCharacters()
  }, [])

  const loadCharacters = async () => {
    setIsLoading(true)
    try {
      const userCharacters = await HybridDataManager.getUserCharacters()
      setCharacters(userCharacters)
      
      // 如果是匿名用戶且沒有角色，直接顯示創建表單
      if (userMode === 'anonymous' && userCharacters.length === 0) {
        setShowCreateForm(true)
      }
    } catch (error) {
      console.error('載入角色失敗:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateCharacter = async () => {
    if (!newCharacterName.trim()) {
      console.warn('角色名稱為空')
      return
    }
    
    console.log('開始創建角色:', newCharacterName.trim())
    setIsCreating(true)
    
    try {
      console.log('調用 HybridDataManager.createCharacter...')
      const fullCharacterData = await HybridDataManager.createCharacter({
        name: newCharacterName.trim(),
        class: '戰士',
        level: 1
      })
      
      console.log('創建角色結果:', fullCharacterData)
      
      if (fullCharacterData) {
        const newCharacter = fullCharacterData.character
        console.log('新角色:', newCharacter)
        setCharacters(prev => {
          console.log('更新角色列表，之前:', prev)
          const updated = [...prev, newCharacter]
          console.log('更新後:', updated)
          return updated
        })
        setNewCharacterName('')
        setShowCreateForm(false)
        
        console.log('準備選擇新角色:', newCharacter)
        // 直接選擇新創建的角色
        onCharacterSelect(newCharacter)
      } else {
        console.error('創建角色返回空數據')
        alert('創建角色失敗，請稍後再試')
      }
    } catch (error) {
      console.error('創建角色失敗:', error)
      alert(`創建角色失敗: ${error.message || error}`)
    } finally {
      console.log('創建流程結束，設置 isCreating = false')
      setIsCreating(false)
    }
  }

  const handleDeleteCharacter = async (characterId: string) => {
    if (!confirm('確定要刪除這個角色嗎？此操作無法復原。')) return
    
    try {
      await HybridDataManager.deleteCharacter(characterId)
      setCharacters(prev => prev.filter(c => c.id !== characterId))
    } catch (error) {
      console.error('刪除角色失敗:', error)
      alert('刪除角色失敗，請稍後再試')
    }
  }

  const handleSignOut = async () => {
    if (confirm('確定要登出嗎？')) {
      await AuthService.signOut()
      onBack()
    }
  }

  if (isLoading) {
    return (
      <PageContainer>
        <Loading text="載入角色中..." />
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      {/* 標題欄 */}
      <div className={combineStyles(STYLES.layout.flexBetween, STYLES.spacing.marginBottomSmall)}>
        <div className={combineStyles(STYLES.layout.flexCenter, STYLES.spacing.gap)}>
          <BackButton onClick={onBack} />
          <div>
            <Title className="mb-1">角色選擇</Title>
            <Subtitle>
              {userMode === 'anonymous' ? '匿名模式 - 僅限一個角色' : '選擇或創建角色'}
            </Subtitle>
          </div>
        </div>

        {userMode === 'authenticated' && (
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className="text-red-400 hover:text-red-300"
          >
            登出
          </Button>
        )}
      </div>

      {/* 角色列表 */}
      <div className={combineStyles(STYLES.layout.grid, STYLES.spacing.marginBottomSmall)}>
        {characters.map((character) => (
          <Card key={character.id} hover padding="small">
            <div className={STYLES.layout.flexBetween}>
              <div className={combineStyles(STYLES.layout.flexCenter, STYLES.spacing.gap, 'flex-1 min-w-0')}>
                <Avatar emoji="🎭" size="medium" />
                <div className="min-w-0 flex-1">
                  <h3 className={combineStyles(STYLES.text.body, 'font-semibold truncate')}>{character.name}</h3>
                  <p className={STYLES.text.subtitle}>
                    {character.character_class || (character as any).class || '戰士'} 等級 {character.level}
                  </p>
                  <p className={combineStyles(STYLES.text.muted, 'mt-0.5 sm:mt-1')}>
                    最後更新: {formatDate(character.updated_at || character.created_at || Date.now())}
                  </p>
                </div>
              </div>

              <div className={combineStyles(STYLES.layout.flexCenter, 'gap-1 sm:gap-2 flex-shrink-0')}>
                <Button
                  variant="small"
                  onClick={() => onCharacterSelect(character)}
                >
                  選擇
                </Button>
                
                {userMode === 'authenticated' && (
                  <Button
                    variant="icon"
                    onClick={() => handleDeleteCharacter(character.id)}
                    className="opacity-0 group-hover:opacity-100"
                  >
                    <svg className={STYLES.icon.small} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* 創建新角色 */}
      {characters.length === 0 && (
        <div className="text-center py-8 sm:py-12">
          <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">⚔️</div>
          <Title className="mb-2">
            還沒有角色
          </Title>
          <Subtitle className="mb-4 sm:mb-6">
            創建你的第一個 D&D 角色開始冒險
          </Subtitle>
        </div>
      )}

      {/* 創建按鈕或表單 */}
      {!showCreateForm ? (
        <div className="text-center">
          {(userMode === 'authenticated' || characters.length === 0) && (
            <Button
              variant="secondary"
              onClick={() => setShowCreateForm(true)}
              className="gap-2"
            >
              <svg className={STYLES.icon.small} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              創建新角色
            </Button>
          )}
          
          {userMode === 'anonymous' && characters.length > 0 && (
            <div className="text-slate-500 text-xs sm:text-sm text-center">
              匿名模式下僅限一個角色。
              <br />
              <span className="text-amber-400">登入帳號</span> 以創建更多角色。
            </div>
          )}
        </div>
        ) : (
          <Card className="p-4 sm:p-6">
            <Subtitle text="創建新角色" className="mb-3 sm:mb-4" />
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                value={newCharacterName}
                onChange={(e) => setNewCharacterName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateCharacter()}
                placeholder="輸入角色名稱"
                disabled={isCreating}
                className="flex-1"
              />
              
              <div className="flex gap-2 sm:gap-3">
                <Button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    console.log('=== 創建按鈕被點擊 ===', {
                      characterName: newCharacterName,
                      isCreating,
                      disabled: !newCharacterName.trim() || isCreating
                    })
                    
                    if (!newCharacterName.trim()) {
                      window.alert('請輸入角色名稱')
                      return
                    }
                    
                    if (isCreating) {
                      window.alert('正在創建中，請稍候')
                      return
                    }
                    
                    handleCreateCharacter().catch(err => {
                      console.error('創建角色捕獲錯誤:', err)
                      window.alert('創建角色錯誤: ' + err.message)
                    })
                  }}
                  disabled={!newCharacterName.trim() || isCreating}
                  variant="primary"
                  size="md"
                >
                  {isCreating ? '創建中...' : '創建角色'}
                </Button>
                
                <Button
                  onClick={() => {
                    setShowCreateForm(false)
                    setNewCharacterName('')
                  }}
                  variant="ghost"
                  size="md"
                  disabled={isCreating}
                >
                  取消
                </Button>
              </div>
            </div>
          </Card>
        )}
    </PageContainer>
  )
}