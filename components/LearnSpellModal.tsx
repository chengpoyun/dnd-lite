import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Spell, getAllSpells } from '../services/spellService';
import { getSpellLevelText, getSchoolColor } from '../utils/spellUtils';
import { MODAL_CONTAINER_CLASS } from '../styles/modalStyles';

interface LearnSpellModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLearnSpell: (spellId: string) => Promise<void>;
  onCreateNew: () => void;
  learnedSpellIds: string[];
}

export const LearnSpellModal: React.FC<LearnSpellModalProps> = ({
  isOpen,
  onClose,
  onLearnSpell,
  onCreateNew,
  learnedSpellIds
}) => {
  const [spells, setSpells] = useState<Spell[]>([]);
  const [filteredSpells, setFilteredSpells] = useState<Spell[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<number | 'all'>('all');
  const [searchText, setSearchText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSpells();
    }
  }, [isOpen]);

  useEffect(() => {
    filterSpells();
  }, [spells, selectedLevel, searchText, learnedSpellIds]);

  const loadSpells = async () => {
    setIsLoading(true);
    try {
      const data = await getAllSpells();
      setSpells(data);
    } catch (error) {
      console.error('載入法術列表失敗:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterSpells = () => {
    let filtered = spells;

    // 排除已學習的法術
    filtered = filtered.filter(spell => !learnedSpellIds.includes(spell.id));

    // 環位篩選
    if (selectedLevel !== 'all') {
      filtered = filtered.filter(spell => spell.level === selectedLevel);
    }

    // 文字搜尋（支援中英文）
    if (searchText) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(spell => 
        spell.name.toLowerCase().includes(search) ||
        (spell.name_en?.toLowerCase().includes(search)) ||
        spell.description.toLowerCase().includes(search)
      );
    }

    setFilteredSpells(filtered);
  };

  const handleLearnSpell = async (spellId: string) => {
    try {
      await onLearnSpell(spellId);
      // 從列表中移除已學習的法術
      setSpells(prev => prev.filter(s => s.id !== spellId));
    } catch (error) {
      console.error('學習法術失敗:', error);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="3xl" className="flex flex-col">
      <div className={`${MODAL_CONTAINER_CLASS} flex flex-col`}>
        <h2 className="text-xl font-bold mb-5">學習法術</h2>

        {/* 篩選區 */}
        <div className="space-y-3 mb-4">
          {/* 環位篩選 */}
          <div>
            <label className="block text-[14px] text-slate-400 mb-2">環位篩選</label>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              className="w-full bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="all">全部環位</option>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(level => (
                <option key={level} value={level}>
                  {level === 0 ? '戲法' : `${level}環法術`}
                </option>
              ))}
            </select>
          </div>

          {/* 搜尋框 */}
          <div>
            <label className="block text-[14px] text-slate-400 mb-2">搜尋法術（支援中英文）</label>
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="輸入中文或英文名稱..."
              className="w-full bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* 法術列表 */}
        <div className="flex-1 overflow-y-auto space-y-2 mb-4 min-h-0">
          {isLoading ? (
            <div className="text-center text-slate-500 py-8">載入中...</div>
          ) : filteredSpells.length === 0 ? (
            <div className="text-center text-slate-500 py-8">
              {searchText ? '找不到符合條件的法術' : '沒有可學習的法術'}
            </div>
          ) : (
            filteredSpells.map(spell => {
              const schoolColor = getSchoolColor(spell.school);
              return (
                <div
                  key={spell.id}
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
                        {getSpellLevelText(spell.level)} • {spell.casting_time} • {spell.range}
                      </div>
                      <div className="text-[14px] text-slate-500 mt-1 line-clamp-2">
                        {spell.description}
                      </div>
                    </div>
                    <button
                      onClick={() => handleLearnSpell(spell.id)}
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

        {/* 底部按鈕 */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-lg bg-slate-700 text-slate-300 font-bold active:bg-slate-600"
          >
            關閉
          </button>
          <button
            onClick={() => {
              onClose();
              onCreateNew();
            }}
            className="flex-1 py-3 rounded-lg bg-amber-600 text-white font-bold active:bg-amber-700"
          >
            新增個人法術
          </button>
      </div>
      </div>
    </Modal>
  );
};
