import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { CatalogModalHeader } from './ui/CatalogModalHeader';
import { CatalogSearchInput } from './ui/CatalogSearchInput';
import { useCatalogSearch } from '../hooks/useCatalogSearch';
import type { AbilityDef } from '../types/ability';
import { searchAbilities } from '../services/abilityCatalog';
import { getAbilitySourceBadgeClass, getAbilityRecoveryBadgeClass } from '../utils/abilityColors';
import { MODAL_CONTAINER_CLASS } from '../styles/modalStyles';

interface LearnAbilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLearnAbility: (ability: AbilityDef, maxUses: number) => Promise<void>;
  onCreateNew: (initialName?: string) => void;
  /** 已擁有的能力名稱（本地目錄以名稱去重） */
  learnedAbilityNames: string[];
}

export const LearnAbilityModal: React.FC<LearnAbilityModalProps> = ({
  isOpen,
  onClose,
  onLearnAbility,
  onCreateNew,
  learnedAbilityNames
}) => {
  const [searchText, setSearchText] = useState('');

  // 選擇能力並詢問次數
  const [selectedAbility, setSelectedAbility] = useState<AbilityDef | null>(null);
  const [maxUses, setMaxUses] = useState<number>(1);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSearchText('');
      setIsConfirming(false);
      setSelectedAbility(null);
    }
  }, [isOpen]);

  // 已學習的能力不整個濾掉（避免使用者以為能力消失搜尋不到）；
  // 改為在列表中顯示並標記「已學習」、不可點選。
  const filteredAbilities = useCatalogSearch(
    () => {
      const query = searchText.trim();
      return query ? searchAbilities(query) : null;
    },
    [searchText]
  );

  const handleSelectAbility = (ability: AbilityDef) => {
    // 已學習的能力不可再次學習
    if (learnedAbilityNames.includes(ability.name)) return;
    setSelectedAbility(ability);
    setIsConfirming(true);
    // 根據恢復類型設定預設次數
    if (ability.recoveryType === '常駐') {
      setMaxUses(0);
    } else {
      setMaxUses(1);
    }
  };

  const handleConfirmLearn = async () => {
    if (!selectedAbility) return;

    try {
      await onLearnAbility(selectedAbility, maxUses);
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

  // 確認學習畫面
  if (isConfirming && selectedAbility) {
    const isPassive = selectedAbility.recoveryType === '常駐';

    return (
      <Modal isOpen={isOpen} onClose={onClose} size="2xl">
        <div className={MODAL_CONTAINER_CLASS}>
          <h2 className="text-xl font-bold mb-5">學習特殊能力</h2>

          <div className="space-y-4">
            {/* 能力資訊 */}
            <div>
              <p className="text-slate-300 mb-1">
                <span className="font-semibold text-lg">{selectedAbility.name}</span>
                {selectedAbility.nameEn && (
                  <span className="text-slate-400 ml-2 text-sm">({selectedAbility.nameEn})</span>
                )}
              </p>
              <div className="flex gap-2 mb-2">
                <span className={`px-2 py-0.5 rounded text-[12px] font-bold ${getAbilitySourceBadgeClass(selectedAbility.source)}`}>
                  {selectedAbility.source}
                </span>
                <span className={`px-2 py-0.5 rounded text-[12px] font-bold ${getAbilityRecoveryBadgeClass(selectedAbility.recoveryType)}`}>
                  {selectedAbility.recoveryType}
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
        <CatalogModalHeader
          title="學習特殊能力"
          onClose={onClose}
          onCreateNew={() => {
            onClose();
            onCreateNew(searchText.trim() || undefined);
          }}
          createLabel="新增個人能力"
        />

        {/* 篩選區 */}
        <div className="space-y-3 mb-4">
          <CatalogSearchInput
            label="搜尋能力"
            value={searchText}
            onChange={setSearchText}
            placeholder="輸入能力名稱（中文或英文）..."
          />
        </div>

        {/* 能力列表 */}
        <div className="flex-1 overflow-y-auto space-y-2 mb-4 min-h-0">
          {filteredAbilities.length === 0 ? (
            <div className="text-center text-slate-500 py-8">
              {searchText ? '找不到符合條件的能力' : '請輸入關鍵字以搜尋能力'}
            </div>
          ) : (
            filteredAbilities.map(ability => {
              const isLearned = learnedAbilityNames.includes(ability.name);
              return (
              <div
                key={ability.name}
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
                      {ability.nameEn && (
                        <span className="text-[14px] text-slate-400">({ability.nameEn})</span>
                      )}
                      {isLearned && (
                        <span className="px-2 py-0.5 rounded text-[12px] font-bold bg-slate-600/40 text-slate-300 whitespace-nowrap">已學習</span>
                      )}
                    </div>
                    <div className="flex gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-[12px] font-bold ${getAbilitySourceBadgeClass(ability.source)}`}>
                        {ability.source}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[12px] font-bold ${getAbilityRecoveryBadgeClass(ability.recoveryType)}`}>
                        {ability.recoveryType}
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
