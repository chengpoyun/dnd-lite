import React, { useState, useEffect } from 'react'
import type { Character } from '../lib/supabase'
import { HybridDataManager } from '../services/hybridDataManager'
import { AuthService } from '../services/auth'
import { PageContainer, Card, Button, Input, Loading, Title, Subtitle, Avatar, BackButton, Modal } from './ui'
import { ConfirmDeleteModal } from './ConfirmDeleteModal'
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
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [characterToDelete, setCharacterToDelete] = useState<Character | null>(null)
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)

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

  const handleDeleteClick = (character: Character) => {
    setCharacterToDelete(character)
    setShowDeleteConfirm(true)
  }

  const handleDeleteConfirm = async () => {
    if (!characterToDelete) return
    
    try {
      await HybridDataManager.deleteCharacter(characterToDelete.id)
      setCharacters(prev => prev.filter(c => c.id !== characterToDelete.id))
      setShowDeleteConfirm(false)
      setCharacterToDelete(null)
    } catch (error) {
      console.error('刪除角色失敗:', error)
      alert('刪除角色失敗，請稍後再試')
    }
  }

  const handleSignOut = async () => {
    await AuthService.signOut()
    onBack()
  }

  const handleSignIn = async () => {
    if (isSigningIn) return
    
    setIsSigningIn(true)
    try {
      const result = await AuthService.signInWithGoogle()
      if (result.success) {
        console.log('✅ Google 登入成功，等待頁面重新導向...')
        // 登入成功後，頁面會重新導向，由 App.tsx 處理後續邏輯
      } else {
        console.error('❌ Google 登入失敗:', result.error)
        alert('登入失敗: ' + result.error)
      }
    } catch (error) {
      console.error('登入過程出錯:', error)
      alert('登入過程出錯: ' + error.message)
    } finally {
      setIsSigningIn(false)
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
            onClick={() => setShowSignOutConfirm(true)}
            className="text-red-400 hover:text-red-300"
          >
            登出
          </Button>
        )}
      </div>

      {/* 角色列表 */}
      <div className={combineStyles(STYLES.layout.grid, STYLES.spacing.marginBottomSmall)}>
        {characters.map((character) => (
          <Card key={character.id} hover padding="small" className="group">
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
                    onClick={() => handleDeleteClick(character)}
                    className="text-red-400 hover:text-red-300 opacity-70 hover:opacity-100 transition-opacity"
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
            >
              <span className="flex items-center gap-2">
                <svg className={STYLES.icon.small} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                創建新角色
              </span>
            </Button>
          )}
          
          {userMode === 'anonymous' && characters.length > 0 && (
            <div className="text-slate-500 text-xs sm:text-sm text-center">
              匿名模式下僅限一個角色。
              <br />
              <button
                onClick={handleSignIn}
                disabled={isSigningIn}
                className="text-amber-400 hover:text-amber-300 underline decoration-dotted underline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSigningIn ? '登入中...' : '登入帳號'}
              </button> 以創建更多角色。
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
        
        {/* 確認刪除 Modal */}
        <ConfirmDeleteModal
          isOpen={showDeleteConfirm}
          characterName={characterToDelete?.name || ''}
          onConfirm={handleDeleteConfirm}
          onCancel={() => {
            setShowDeleteConfirm(false)
            setCharacterToDelete(null)
          }}
        />
        
        {/* 確認登出 Modal */}
        <Modal isOpen={showSignOutConfirm} onClose={() => setShowSignOutConfirm(false)}>
          <div className="text-center">
            <div className="text-4xl mb-4">🚪</div>
            <h2 className="text-xl font-bold mb-4">確定要登出嗎？</h2>
            <p className="text-slate-400 mb-6">登出後將返回歡迎頁面</p>
            <div className="flex gap-3 justify-center">
              <Button
                variant="ghost"
                onClick={() => setShowSignOutConfirm(false)}
              >
                取消
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  setShowSignOutConfirm(false)
                  handleSignOut()
                }}
              >
                確定登出
              </Button>
            </div>
          </div>
        </Modal>
    </PageContainer>
  )
}