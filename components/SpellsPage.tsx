import React, { useState, useEffect, useMemo } from 'react';
import { SpellCard } from './SpellCard';
import { SpellDetailModal } from './SpellDetailModal';
import { LearnSpellModal } from './LearnSpellModal';
import { SpellFormModal } from './SpellFormModal';
import { 
  CharacterSpell, 
  Spell,
  CreateSpellData,
  getCharacterSpells, 
  learnSpell, 
  forgetSpell, 
  togglePrepared,
  createSpell,
  updateSpell,
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
  intelligence: number;
}

export const SpellsPage: React.FC<SpellsPageProps> = ({
  characterId,
  characterClasses,
  intelligence
}) => {
  const [characterSpells, setCharacterSpells] = useState<CharacterSpell[]>([]);
  const [isLearnModalOpen, setIsLearnModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedCharacterSpell, setSelectedCharacterSpell] = useState<CharacterSpell | null>(null);
  const [editingSpell, setEditingSpell] = useState<Spell | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [preparedCount, setPreparedCount] = useState(0);
  const [preparedCantripsCount, setPreparedCantripsCount] = useState(0);

  // 計算施法職業等級和可準備數量
  const spellcasterLevel = useMemo(() => 
    getSpellcasterLevel(characterClasses), 
    [characterClasses]
  );

  const maxPrepared = useMemo(() => 
    calculateMaxPrepared(intelligence, spellcasterLevel),
    [intelligence, spellcasterLevel]
  );

  const maxCantrips = useMemo(() => 
    calculateMaxCantrips(spellcasterLevel),
    [spellcasterLevel]
  );

  useEffect(() => {
    loadCharacterSpells();
  }, [characterId]);

  useEffect(() => {
    updatePreparedCount();
  }, [characterSpells]);

  const loadCharacterSpells = async () => {
    setIsLoading(true);
    try {
      const spells = await getCharacterSpells(characterId);
      setCharacterSpells(spells);
    } catch (error) {
      console.error('載入角色法術失敗:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePreparedCount = async () => {
    try {
      const count = await getPreparedSpellsCount(characterId);
      setPreparedCount(count);
      const cantripsCount = await getPreparedCantripsCount(characterId);
      setPreparedCantripsCount(cantripsCount);
    } catch (error) {
      console.error('更新已準備法術數量失敗:', error);
    }
  };

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

  const handleForgetSpell = async (spellId: string) => {
    try {
      await forgetSpell(characterId, spellId);
      setCharacterSpells(prev => prev.filter(cs => cs.spell?.id !== spellId));
    } catch (error) {
      console.error('遺忘法術失敗:', error);
    }
  };

  const handleTogglePrepared = async (spellId: string, isPrepared: boolean) => {
    try {
      await togglePrepared(characterId, spellId, isPrepared);
      setCharacterSpells(prev => 
        prev.map(cs => 
          cs.spell?.id === spellId 
            ? { ...cs, is_prepared: isPrepared }
            : cs
        )
      );
    } catch (error) {
      console.error('切換準備狀態失敗:', error);
    }
  };

  const handleCreateSpell = async (data: CreateSpellData) => {
    try {
      await createSpell(data);
      setIsFormModalOpen(false);
    } catch (error) {
      console.error('新增法術失敗:', error);
      throw error;
    }
  };

  const handleUpdateSpell = async (data: CreateSpellData) => {
    if (!editingSpell) return;
    
    try {
      await updateSpell(editingSpell.id, data);
      // 重新載入法術列表以更新資料
      await loadCharacterSpells();
      setIsFormModalOpen(false);
      setEditingSpell(null);
    } catch (error) {
      console.error('更新法術失敗:', error);
      throw error;
    }
  };

  const handleEditSpell = (characterSpell: CharacterSpell) => {
    // 編輯全域 Spell（需要確認）
    if (characterSpell.spell) {
      setEditingSpell(characterSpell.spell);
      setIsFormModalOpen(true);
    }
  };

  const handleCloseFormModal = () => {
    setIsFormModalOpen(false);
    setEditingSpell(null);
  };

  // 按環位分組法術
  const spellsByLevel = useMemo(() => {
    const grouped: Record<number, CharacterSpell[]> = {};
    
    characterSpells.forEach(cs => {
      if (!cs.spell) return;
      const level = cs.spell.level;
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
          (a.spell?.name || '').localeCompare(b.spell?.name || '')
        )
      }));
  }, [characterSpells]);

  const canPrepareMore = preparedCount < maxPrepared;
  const canPrepareMoreCantrips = preparedCantripsCount < maxCantrips;
  const learnedSpellIds = characterSpells.map(cs => cs.spell?.id).filter(Boolean) as string[];
  // 計算已學習法術數量（不含戲法）
  const learnedSpellsCount = characterSpells.filter(cs => cs.spell && cs.spell.level > 0).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-500 text-lg">載入中...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 pb-24">
      {/* 頂部統計 */}
      <div className="bg-slate-800/30 rounded-xl p-4 mb-4 border border-slate-700 relative">
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
            {preparedCount > maxPrepared && (
              <span className="text-[12px] px-2 py-1 rounded bg-rose-500/20 text-rose-400 ml-2">
                超過可準備數量！
              </span>
            )}
          </div>
        </div>

        {/* 學習新法術小按鈕 */}
        <button
          onClick={() => setIsLearnModalOpen(true)}
          className="absolute right-3 bottom-3 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-[13px] font-bold active:bg-amber-700"
        >
          + 學習新法術
        </button>
      </div>

      {/* 法術列表 */}
      {spellsByLevel.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-slate-500 text-lg mb-4">尚未學習任何法術</div>
            <div className="text-slate-600 text-sm">點擊上方「學習新法術」按鈕開始</div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {spellsByLevel.map(({ level, spells }) => (
            <div key={level}>
              <h3 className="text-lg font-bold text-slate-300 mb-3 border-b border-slate-700 pb-2">
                {getSpellLevelText(level)} ({spells.length})
              </h3>
              <div className="space-y-2">
                {spells.map(cs => (
                  <SpellCard
                    key={cs.id}
                    characterSpell={cs}
                    onTogglePrepared={handleTogglePrepared}
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

      {/* Modals */}
      <SpellDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedCharacterSpell(null);
        }}
        characterSpell={selectedCharacterSpell}
        onEdit={handleEditSpell}
        onForget={handleForgetSpell}
      />

      <LearnSpellModal
        isOpen={isLearnModalOpen}
        onClose={() => setIsLearnModalOpen(false)}
        onLearnSpell={handleLearnSpell}
        onCreateNew={() => {
          setIsLearnModalOpen(false);
          setEditingSpell(null);
          setIsFormModalOpen(true);
        }}
        learnedSpellIds={learnedSpellIds}
      />

      <SpellFormModal
        isOpen={isFormModalOpen}
        onClose={handleCloseFormModal}
        onSubmit={editingSpell ? handleUpdateSpell : handleCreateSpell}
        editingSpell={editingSpell}
      />
    </div>
  );
};
