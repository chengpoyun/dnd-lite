import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { SpellCard } from './SpellCard';
import { SpellDetailModal } from './SpellDetailModal';
import { LearnSpellModal } from './LearnSpellModal';
import { CharacterSpellEditModal } from './CharacterSpellEditModal';
import { AddPersonalSpellModal } from './AddPersonalSpellModal';
import { Modal, ModalButton } from './ui/Modal';
import { MODAL_CONTAINER_CLASS, MODAL_FOOTER_BUTTONS_CLASS, MODAL_BUTTON_CANCEL_CLASS, MODAL_BUTTON_APPLY_INDIGO_CLASS, MODAL_DESCRIPTION_CLASS } from '../styles/modalStyles';
import {
  CharacterSpell,
  CreateCharacterSpellData,
  getCharacterSpells,
  learnSpell,
  forgetSpell,
  togglePrepared,
  createCharacterSpell,
  getDisplayValues,
  getPreparedSpellsCount,
  getPreparedCantripsCount
} from '../services/spellService';
import { 
  calculateMaxPrepared,
  calculateMaxCantrips,
  getSpellcasterLevel,
  getSpellLevelText 
} from '../utils/spellUtils';
import { ClassInfo } from '../types';

interface SpellsPageProps {
  characterId: string;
  characterClasses: ClassInfo[];
  /** 智力調整值（應為 final，含能力加值、裝備等） */
  intelligenceModifier: number;
}

export const SpellsPage: React.FC<SpellsPageProps> = ({
  characterId,
  characterClasses,
  intelligenceModifier
}) => {
  const [characterSpells, setCharacterSpells] = useState<CharacterSpell[]>([]);
  const [isLearnModalOpen, setIsLearnModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isOverLimitWarningOpen, setIsOverLimitWarningOpen] = useState(false);
  const [isAddPersonalModalOpen, setIsAddPersonalModalOpen] = useState(false);
  const [pendingPrepareSpell, setPendingPrepareSpell] = useState<{ characterSpellId: string; spellId: string | null; isPrepared: boolean } | null>(null);
  const [selectedCharacterSpell, setSelectedCharacterSpell] = useState<CharacterSpell | null>(null);
  const [editingCharacterSpell, setEditingCharacterSpell] = useState<CharacterSpell | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [preparedCount, setPreparedCount] = useState(0);
  const [preparedCantripsCount, setPreparedCantripsCount] = useState(0);

  // 計算施法職業等級和可準備數量
  const spellcasterLevel = useMemo(() => 
    getSpellcasterLevel(characterClasses), 
    [characterClasses]
  );

  const maxPrepared = useMemo(() => 
    calculateMaxPrepared(intelligenceModifier, spellcasterLevel),
    [intelligenceModifier, spellcasterLevel]
  );

  const maxCantrips = useMemo(() => 
    calculateMaxCantrips(spellcasterLevel),
    [spellcasterLevel]
  );

  const loadCharacterSpells = useCallback(async () => {
    setIsLoading(true);
    try {
      const spells = await getCharacterSpells(characterId);
      setCharacterSpells(spells);
    } catch (error) {
      console.error('載入角色法術失敗:', error);
    } finally {
      setIsLoading(false);
    }
  }, [characterId]);

  const updatePreparedCount = useCallback(async () => {
    try {
      const [count, cantripsCount] = await Promise.all([
        getPreparedSpellsCount(characterId),
        getPreparedCantripsCount(characterId)
      ]);
      const personalPrepared = characterSpells.filter(cs => !cs.spell_id && cs.is_prepared);
      const personalCantrips = personalPrepared.filter(cs => getDisplayValues(cs).displayLevel === 0);
      const personalSpells = personalPrepared.filter(cs => getDisplayValues(cs).displayLevel > 0);
      setPreparedCount(count + personalSpells.length);
      setPreparedCantripsCount(cantripsCount + personalCantrips.length);
    } catch (error) {
      console.error('更新已準備法術數量失敗:', error);
    }
  }, [characterId, characterSpells]);

  useEffect(() => {
    loadCharacterSpells();
  }, [loadCharacterSpells]);

  useEffect(() => {
    updatePreparedCount();
  }, [characterSpells, updatePreparedCount]);

  const handleLearnSpell = async (spellId: string) => {
    try {
      const newCharacterSpell = await learnSpell(characterId, spellId);
      setCharacterSpells(prev => [...prev, newCharacterSpell]);
      setIsLearnModalOpen(false);
    } catch (error) {
      console.error('學習法術失敗:', error);
      throw error;
    }
  };

  const handleForgetSpell = async (spellId: string | null, characterSpellId?: string) => {
    try {
      await forgetSpell(characterId, spellId, characterSpellId);
      setCharacterSpells(prev => 
        characterSpellId
          ? prev.filter(cs => cs.id !== characterSpellId)
          : prev.filter(cs => cs.spell?.id !== spellId)
      );
    } catch (error) {
      console.error('遺忘法術失敗:', error);
    }
  };

  const handleTogglePrepared = async (characterSpellId: string, spellId: string | null, isPrepared: boolean) => {
    try {
      await togglePrepared(characterId, spellId, isPrepared, characterSpellId);
      setCharacterSpells(prev => 
        prev.map(cs => 
          cs.id === characterSpellId
            ? { ...cs, is_prepared: isPrepared }
            : cs
        )
      );
    } catch (error) {
      console.error('切換準備狀態失敗:', error);
    }
  };

  const handleTogglePreparedWithWarning = (characterSpellId: string, spellId: string | null, isPrepared: boolean, needsWarning: boolean) => {
    if (needsWarning && isPrepared) {
      // 顯示警告 modal (isPrepared=true 代表正在準備法術)
      setPendingPrepareSpell({ characterSpellId, spellId, isPrepared });
      setIsOverLimitWarningOpen(true);
    } else {
      // 直接執行
      handleTogglePrepared(characterSpellId, spellId, isPrepared);
    }
  };

  const closeOverLimitWarning = useCallback(() => {
    setIsOverLimitWarningOpen(false);
    setPendingPrepareSpell(null);
  }, []);

  const handleConfirmOverLimit = () => {
    if (pendingPrepareSpell) {
      handleTogglePrepared(pendingPrepareSpell.characterSpellId, pendingPrepareSpell.spellId, pendingPrepareSpell.isPrepared);
      setPendingPrepareSpell(null);
    }
    setIsOverLimitWarningOpen(false);
  };

  const handleAddPersonalSpell = async (data: CreateCharacterSpellData) => {
    const result = await createCharacterSpell(characterId, data);
    if (result.success) {
      setIsAddPersonalModalOpen(false);
      loadCharacterSpells();
    } else {
      console.error(result.error || '新增法術失敗');
    }
  };

  const handleEditSpell = (characterSpell: CharacterSpell) => {
    // 編輯角色專屬法術（不影響全域）
    setEditingCharacterSpell(characterSpell);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingCharacterSpell(null);
  };

  // 按環位分組法術
  const spellsByLevel = useMemo(() => {
    const grouped: Record<number, CharacterSpell[]> = {};
    
    characterSpells.forEach(cs => {
      const display = getDisplayValues(cs);
      const level = display.displayLevel;
      if (!grouped[level]) {
        grouped[level] = [];
      }
      grouped[level].push(cs);
    });

    // 按環位排序
    return Object.keys(grouped)
      .map(Number)
      .sort((a, b) => a - b)
      .map(level => ({
        level,
        spells: grouped[level].sort((a, b) => 
          getDisplayValues(a).displayName.localeCompare(getDisplayValues(b).displayName)
        )
      }));
  }, [characterSpells]);

  const canPrepareMore = preparedCount < maxPrepared;
  const canPrepareMoreCantrips = preparedCantripsCount < maxCantrips;
  const learnedSpellIds = characterSpells.map(cs => cs.spell?.id).filter(Boolean) as string[];
  // 計算已學習法術數量（不含戲法）
  const learnedSpellsCount = characterSpells.filter(cs => getDisplayValues(cs).displayLevel > 0).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-500 text-lg">載入中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="max-w-4xl mx-auto p-4 pb-24">
      {/* 頂部統計 */}
      <div className="bg-slate-800 rounded-lg p-4 mb-4 border border-slate-700 relative">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-bold text-amber-500">我的法術書</h2>
          <div className="text-[14px] text-slate-400">
            已學習 <span className="text-amber-400 font-bold">{learnedSpellsCount}</span> 個法術
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[14px] text-slate-400">戲法已準備:</span>
            <span className={`text-[16px] font-bold ${preparedCantripsCount > maxCantrips ? 'text-rose-400' : 'text-emerald-400'}`}>
              {preparedCantripsCount}
            </span>
            <span className="text-[14px] text-slate-500">/</span>
            <span className="text-[16px] font-bold text-slate-400">{maxCantrips}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[14px] text-slate-400">法術已準備:</span>
            <span className={`text-[16px] font-bold ${preparedCount > maxPrepared ? 'text-rose-400' : 'text-emerald-400'}`}>
              {preparedCount}
            </span>
            <span className="text-[14px] text-slate-500">/</span>
            <span className="text-[16px] font-bold text-slate-400">{maxPrepared}</span>
          </div>
        </div>

        {/* 學習新法術小按鈕 */}
        <button
          onClick={() => setIsLearnModalOpen(true)}
          className="absolute right-3 bottom-3 px-4 py-2 rounded-lg bg-amber-600 text-white font-bold hover:bg-amber-700 transition-colors shadow-md"
        >
          + 學習新法術
        </button>
      </div>

      {/* 法術列表 */}
      {spellsByLevel.length === 0 ? (
        <div className="text-center py-12 bg-slate-800 border border-slate-700 rounded-lg">
          <div className="text-slate-500 text-4xl mb-3">📜</div>
          <div className="text-slate-400">還沒有學習任何法術</div>
          <button
            onClick={() => setIsLearnModalOpen(true)}
            className="mt-4 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-bold"
          >
            學習第一個法術
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {spellsByLevel.map(({ level, spells }) => (
            <div key={level}>
              <h3 className="text-lg font-bold text-amber-500 mb-2 border-b border-slate-700 pb-2">
                {getSpellLevelText(level)} ({spells.length})
              </h3>
              <div className="space-y-3">
                {spells.map(cs => (
                  <SpellCard
                    key={cs.id}
                    characterSpell={cs}
                    onTogglePrepared={handleTogglePreparedWithWarning}
                    onClick={() => {
                      setSelectedCharacterSpell(cs);
                      setIsDetailModalOpen(true);
                    }}
                    canPrepareMore={level === 0 ? canPrepareMoreCantrips : canPrepareMore}
                    isCantrip={level === 0}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      </div>

      {/* Modals */}
      <SpellDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedCharacterSpell(null);
        }}
        characterSpell={selectedCharacterSpell}
        onEdit={handleEditSpell}
        onForget={(spellId, characterSpellId) => handleForgetSpell(spellId, characterSpellId)}
      />

      <LearnSpellModal
        isOpen={isLearnModalOpen}
        onClose={() => setIsLearnModalOpen(false)}
        onLearnSpell={handleLearnSpell}
        onCreateNew={() => {
          setIsLearnModalOpen(false);
          setIsAddPersonalModalOpen(true);
        }}
        learnedSpellIds={learnedSpellIds}
      />

      <AddPersonalSpellModal
        isOpen={isAddPersonalModalOpen}
        onClose={() => setIsAddPersonalModalOpen(false)}
        onSubmit={handleAddPersonalSpell}
      />

      <CharacterSpellEditModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        characterSpell={editingCharacterSpell}
        onSuccess={loadCharacterSpells}
      />

      {/* 超出準備數量警告 Modal */}
      <Modal
        isOpen={isOverLimitWarningOpen}
        onClose={closeOverLimitWarning}
        title="準備法術數量超過上限"
        size="xs"
      >
        <div className={MODAL_CONTAINER_CLASS}>
          <p className={`${MODAL_DESCRIPTION_CLASS} text-center mb-6`}>
            已達到可準備法術數量上限，確定要準備此法術嗎？
          </p>
          <div className={MODAL_FOOTER_BUTTONS_CLASS}>
            <ModalButton variant="secondary" className={MODAL_BUTTON_CANCEL_CLASS} onClick={closeOverLimitWarning}>
              取消
            </ModalButton>
            <ModalButton variant="primary" className={MODAL_BUTTON_APPLY_INDIGO_CLASS} onClick={handleConfirmOverLimit}>
              確定
            </ModalButton>
          </div>
        </div>
      </Modal>
    </div>
  );
};
