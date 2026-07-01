import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import type { Ability } from '../lib/supabase';
import * as AbilityService from '../services/abilityService';
import { MODAL_CONTAINER_CLASS } from '../styles/modalStyles';

interface LearnAbilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLearnAbility: (abilityId: string, maxUses: number) => Promise<void>;
  onCreateNew: (initialName?: string) => void;
  learnedAbilityIds: string[];
}

export const LearnAbilityModal: React.FC<LearnAbilityModalProps> = ({
  isOpen,
  onClose,
  onLearnAbility,
  onCreateNew,
  learnedAbilityIds
}) => {
  const [abilities, setAbilities] = useState<Ability[]>([]);
  const [filteredAbilities, setFilteredAbilities] = useState<Ability[]>([]);
  const [searchText, setSearchText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // 選擇能力並詢問次數
  const [selectedAbility, setSelectedAbility] = useState<Ability | null>(null);
  const [maxUses, setMaxUses] = useState<number>(1);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSearchText('');
      setAbilities([]);
      setIsLoading(false);
      setIsConfirming(false);
      setSelectedAbility(null);
      loadAbilities();
    }
  }, [isOpen]);

  useEffect(() => {
    // 已學習的能力不再整個濾掉（避免使用者以為能力消失搜尋不到）；
    // 改為在列表中顯示並標記「已學習」、不可點選。
    if (!searchText) {
      setFilteredAbilities([]);
      return;
    }
    const search = searchText.toLowerCase();
    const filtered = abilities.filter(ability =>
      ability.name.toLowerCase().includes(search) ||
      (ability.name_en && ability.name_en.toLowerCase().includes(search))
    );
    setFilteredAbilities(filtered);
  }, [abilities, searchText]);

  const loadAbilities = async () => {
    setIsLoading(true);
    try {
      const data = await AbilityService.getAllAbilities();
      setAbilities(data);
    } catch (error) {
      console.error('載入特殊能力列表失敗:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAbility = (ability: Ability) => {
    // 已學習的能力不可再次學習
    if (learnedAbilityIds.includes(ability.id)) return;
    setSelectedAbility(ability);
    setIsConfirming(true);
    // 根據恢復類型設定預設次數
    if (ability.recovery_type === '常駐') {
      setMaxUses(0);
    } else {
      setMaxUses(1);
    }
  };

  const handleConfirmLearn = async () => {
    if (!selectedAbility) return;
    
    try {
      await onLearnAbility(selectedAbility.id, maxUses);
      // 從列表中移除已學習的能力
      setAbilities(prev => prev.filter(a => a.id !== selectedAbility.id));
      setIsConfirming(false);
      setSelectedAbility(null);
      // 關閉 modal，回到特殊能力 tab
      onClose();
    } catch (error) {
      console.error('學習特殊能力失敗:', error);
    }
  };

  const handleBack = () => {
    setIsConfirming(false);
    setSelectedAbility(null);
  };

  const sourceColors: Record<string, string> = {
    '職業': 'bg-blue-500/20 text-blue-400',
    '種族': 'bg-green-500/20 text-green-400',
    '裝備': 'bg-indigo-500/20 text-indigo-400',
    '專長': 'bg-purple-500/20 text-purple-400',
    '背景': 'bg-amber-500/20 text-amber-400',
    '其他': 'bg-slate-500/20 text-slate-400'
  };

  const recoveryTypeColors: Record<string, string> = {
    '常駐': 'bg-emerald-500/20 text-emerald-400',
    '短休': 'bg-cyan-500/20 text-cyan-400',
    '長休': 'bg-rose-500/20 text-rose-400'
  };

  // 確認學習畫面
  if (isConfirming && selectedAbility) {
    const isPassive = selectedAbility.recovery_type === '常駐';
    
    return (
      <Modal isOpen={isOpen} onClose={onClose} size="2xl">
        <div className={MODAL_CONTAINER_CLASS}>
          <h2 className="text-xl font-bold mb-5">學習特殊能力</h2>
          
          <div className="space-y-4">
            {/* 能力資訊 */}
            <div>
              <p className="text-slate-300 mb-1">
                <span className="font-semibold text-lg">{selectedAbility.name}</span>
                {selectedAbility.name_en && (
                  <span className="text-slate-400 ml-2 text-sm">({selectedAbility.name_en})</span>
                )}
              </p>
              <div className="flex gap-2 mb-2">
                <span className={`px-2 py-0.5 rounded text-[12px] font-bold ${sourceColors[selectedAbility.source]}`}>
                  {selectedAbility.source}
                </span>
                <span className={`px-2 py-0.5 rounded text-[12px] font-bold ${recoveryTypeColors[selectedAbility.recovery_type]}`}>
                  {selectedAbility.recovery_type}
                </span>
              </div>
              <p className="text-sm text-slate-400">
                {selectedAbility.description}
              </p>
            </div>

            {/* 最大使用次數（非常駐才顯示） */}
            {!isPassive && (
              <div>
                <label className="block text-[14px] text-slate-400 mb-2">
                  最大使用次數 *
                  <span className="text-slate-500 ml-2 text-[12px]">（設為 0 表示無限次）</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={maxUses}
                  onChange={(e) => setMaxUses(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500"
                />
                <p className="text-xs text-slate-500 mt-2">
                  💡 每個角色的使用次數可能不同，請根據角色等級或能力來源設定
                </p>
              </div>
            )}

            {isPassive && (
              <div className="bg-slate-700/50 rounded-lg p-3">
                <p className="text-sm text-slate-300">
                  ✨ 此為常駐能力，無需設定使用次數
                </p>
              </div>
            )}

            {/* 操作按鈕 */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors font-medium"
              >
                返回
              </button>
              <button
                type="button"
                onClick={handleConfirmLearn}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                學習
              </button>
            </div>
          </div>
        </div>
      </Modal>
    );
  }

  // 能力列表畫面
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="3xl">
      <div className={`${MODAL_CONTAINER_CLASS} flex flex-col`} style={{ maxHeight: '80vh' }}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
          <h2 className="text-xl font-bold">學習特殊能力</h2>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-600 transition-colors font-medium whitespace-nowrap"
            >
              取消
            </button>
            <button
              onClick={() => {
                onClose();
                onCreateNew(searchText.trim() || undefined);
              }}
              className="px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors font-medium whitespace-nowrap"
            >
              新增個人能力
            </button>
          </div>
        </div>

        {/* 篩選區 */}
        <div className="space-y-3 mb-4">
          {/* 搜尋框 */}
          <div>
            <label className="block text-[14px] text-slate-400 mb-2">搜尋能力</label>
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="輸入能力名稱（中文或英文）..."
              className="w-full bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* 能力列表 */}
        <div className="flex-1 overflow-y-auto space-y-2 mb-4 min-h-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-8 text-slate-400">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-500 border-t-transparent" />
              <div>載入中...</div>
            </div>
          ) : filteredAbilities.length === 0 ? (
            <div className="text-center text-slate-500 py-8">
              {searchText ? '找不到符合條件的能力' : '請輸入關鍵字以搜尋能力'}
            </div>
          ) : (
            filteredAbilities.map(ability => {
              const isLearned = learnedAbilityIds.includes(ability.id);
              return (
              <div
                key={ability.id}
                onClick={() => handleSelectAbility(ability)}
                className={`bg-slate-800/50 rounded-lg p-3 border border-slate-700 transition-colors ${
                  isLearned
                    ? 'opacity-60 cursor-not-allowed'
                    : 'hover:border-amber-500/50 cursor-pointer'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-[16px] font-bold text-slate-200">{ability.name}</h3>
                      {ability.name_en && (
                        <span className="text-[14px] text-slate-400">({ability.name_en})</span>
                      )}
                      {isLearned && (
                        <span className="px-2 py-0.5 rounded text-[12px] font-bold bg-slate-600/40 text-slate-300 whitespace-nowrap">已學習</span>
                      )}
                    </div>
                    <div className="flex gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-[12px] font-bold ${sourceColors[ability.source]}`}>
                        {ability.source}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[12px] font-bold ${recoveryTypeColors[ability.recovery_type]}`}>
                        {ability.recovery_type}
                      </span>
                    </div>
                    <div className="text-[14px] text-slate-500 line-clamp-2">
                      {ability.description}
                    </div>
                  </div>
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
