import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from './ui/Modal';
import { CatalogModalHeader } from './ui/CatalogModalHeader';
import { CatalogSearchInput } from './ui/CatalogSearchInput';
import { useCatalogSearch } from '../hooks/useCatalogSearch';
import type { SpellDef } from '../types/spell';
import { searchSpells } from '../services/spellCatalog';
import { getSpellLevelText, getSchoolColor } from '../utils/spellUtils';
import { MODAL_CONTAINER_CLASS } from '../styles/modalStyles';

const CLOSE_BUTTON_CLASS = 'px-4 py-2 rounded-lg bg-slate-700 text-slate-300 font-bold active:bg-slate-600 whitespace-nowrap';
const CREATE_BUTTON_CLASS = 'px-4 py-2 rounded-lg bg-amber-600 text-white font-bold active:bg-amber-700 whitespace-nowrap';

interface LearnSpellModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLearnSpell: (spell: SpellDef) => Promise<void>;
  onCreateNew: () => void;
  /** 已擁有的法術英文名（本地目錄以英文名去重，中文譯名偶有撞名） */
  learnedSpellNameEns: string[];
}

export const LearnSpellModal: React.FC<LearnSpellModalProps> = ({
  isOpen,
  onClose,
  onLearnSpell,
  onCreateNew,
  learnedSpellNameEns
}) => {
  const [selectedLevel, setSelectedLevel] = useState<number>(0);
  const [searchText, setSearchText] = useState('');
  const [justLearnedNameEns, setJustLearnedNameEns] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setSearchText('');
      setSelectedLevel(0);
      setJustLearnedNameEns([]);
    }
  }, [isOpen]);

  // 有輸入搜尋文字時忽略環階篩選、全域搜尋 534 筆；沒有文字時依環階瀏覽
  const searchResults = useCatalogSearch(
    () => searchSpells(searchText.trim(), searchText.trim() ? undefined : selectedLevel),
    [searchText, selectedLevel]
  );
  const filteredSpells = useMemo(
    () =>
      searchResults.filter(
        (spell) => !learnedSpellNameEns.includes(spell.nameEn) && !justLearnedNameEns.includes(spell.nameEn)
      ),
    [searchResults, learnedSpellNameEns, justLearnedNameEns]
  );

  const handleLearnSpell = async (spell: SpellDef) => {
    try {
      await onLearnSpell(spell);
      setJustLearnedNameEns((prev) => [...prev, spell.nameEn]);
    } catch (error) {
      console.error('學習法術失敗:', error);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="3xl" className="flex flex-col">
      <div className={`${MODAL_CONTAINER_CLASS} flex flex-col`}>
        <CatalogModalHeader
          title="學習法術"
          onClose={onClose}
          closeLabel="關閉"
          closeButtonClassName={CLOSE_BUTTON_CLASS}
          onCreateNew={() => {
            onClose();
            onCreateNew();
          }}
          createLabel="新增個人法術"
          createButtonClassName={CREATE_BUTTON_CLASS}
        />

        {/* 篩選區 */}
        <div className="space-y-3 mb-4">
          {/* 環位篩選（有輸入搜尋文字時忽略此篩選，全域搜尋） */}
          <div>
            <label className="block text-[14px] text-slate-400 mb-2">環位篩選</label>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(parseInt(e.target.value))}
              className="w-full bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500"
              disabled={!!searchText.trim()}
            >
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(level => (
                <option key={level} value={level}>
                  {level === 0 ? '戲法' : `${level}環法術`}
                </option>
              ))}
            </select>
          </div>

          <CatalogSearchInput
            label="搜尋法術（支援中英文）"
            value={searchText}
            onChange={setSearchText}
            placeholder="輸入中文或英文名稱..."
          />
        </div>

        {/* 法術列表 */}
        <div className="flex-1 overflow-y-auto space-y-2 mb-4 min-h-0">
          {filteredSpells.length === 0 ? (
            <div className="text-center text-slate-500 py-8">
              {searchText ? '找不到符合條件的法術' : '沒有可學習的法術'}
            </div>
          ) : (
            filteredSpells.map(spell => {
              const schoolColor = getSchoolColor(spell.school);
              return (
                <div
                  key={spell.nameEn}
                  className="bg-slate-800/50 rounded-lg p-3 border border-slate-700 hover:border-amber-500/50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-[16px] font-bold text-slate-200">{spell.name}</h3>
                        <span className={`px-2 py-0.5 rounded text-[12px] font-bold ${schoolColor.bgLight} ${schoolColor.text}`}>
                          {spell.school}
                        </span>
                        {spell.concentration && (
                          <span className="text-[12px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold">專注</span>
                        )}
                      </div>
                      <div className="text-[14px] text-slate-400">
                        {getSpellLevelText(spell.level)} • {spell.castingTime} • {spell.range}
                      </div>
                      <div className="text-[14px] text-slate-500 mt-1 line-clamp-2">
                        {spell.description}
                      </div>
                    </div>
                    <button
                      onClick={() => handleLearnSpell(spell)}
                      className="px-4 py-2 rounded-lg bg-amber-600 text-white font-bold text-[14px] active:bg-amber-700 flex-shrink-0"
                    >
                      學習
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
};
