import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { searchLocalCatalog, type CatalogItem } from '../services/itemCatalog';
import { MODAL_CONTAINER_CLASS } from '../styles/modalStyles';

interface LearnItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLearnItem: (item: CatalogItem) => Promise<void>;
  onCreateNew: (initialName?: string) => void;
  /** 已擁有的物品名稱（本地目錄以名稱去重）：只用來把按鈕文字改成「已持有」，不影響是否顯示 */
  learnedNames: string[];
}

/** 目錄條目的顯示欄位（MH素材／通用道具兩種來源統一成同一組欄位渲染） */
function getItemView(item: CatalogItem) {
  return item.source === 'material'
    ? { key: `material:${item.entry.name}`, name: item.entry.name, category: 'MH素材', isMagic: false, description: item.entry.description ?? '' }
    : { key: `general:${item.entry.name}`, name: item.entry.name, category: item.entry.category, isMagic: !!item.entry.isMagic, description: item.entry.description ?? '' };
}

export const LearnItemModal: React.FC<LearnItemModalProps> = ({
  isOpen,
  onClose,
  onLearnItem,
  onCreateNew,
  learnedNames
}) => {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSearchText('');
      setItems([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const query = searchText.trim();
    if (!query) {
      setItems([]);
      return;
    }
    let cancelled = false;
    searchLocalCatalog(query).then((result) => {
      if (cancelled) return;
      setItems(result);
    });
    return () => {
      cancelled = true;
    };
  }, [searchText]);

  const filteredItems = items;

  const handleLearnItem = async (item: CatalogItem) => {
    try {
      await onLearnItem(item);
      setItems((prev) => prev.filter((i) => i.entry.name !== item.entry.name));
    } catch (error) {
      console.error('獲得物品失敗:', error);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="3xl" className="flex flex-col">
      <div className={`${MODAL_CONTAINER_CLASS} relative flex flex-col`}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
          <h2 className="text-xl font-bold">獲得物品</h2>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-700 text-slate-300 font-bold active:bg-slate-600 whitespace-nowrap"
            >
              取消
            </button>
            <button
              onClick={() => onCreateNew(searchText.trim() || undefined)}
              className="px-4 py-2 rounded-lg bg-amber-600 text-white font-bold active:bg-amber-700 whitespace-nowrap"
            >
              新增個人物品
            </button>
          </div>
        </div>

        {/* 篩選區 */}
        <div className="space-y-3 mb-4">
          {/* 文字搜尋 */}
          <div>
            <label className="block text-[14px] text-slate-400 mb-2">搜尋物品</label>
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="輸入名稱或描述..."
              className="w-full bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* 物品列表 */}
        <div className="flex-1 overflow-y-auto min-h-0 max-h-[50vh] mb-4 space-y-2">
          {filteredItems.length === 0 ? (
            <div className="text-center py-8 text-slate-400 space-y-1">
              <div>{searchText.trim() ? '沒有符合條件的物品' : '請輸入關鍵字以搜尋物品'}</div>
            </div>
          ) : (
            filteredItems.map((item) => {
              const view = getItemView(item);
              const isOwned = learnedNames.includes(view.name);
              return (
                <div
                  key={view.key}
                  className="bg-slate-700/50 rounded-lg p-4 border border-slate-600"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-[16px] font-bold text-amber-400">{view.name}</h3>
                        <span className="px-2 py-0.5 rounded text-[12px] bg-slate-600 text-slate-300">
                          {view.category}
                        </span>
                        {view.isMagic && (
                          <span className="px-2 py-0.5 rounded text-[12px] bg-amber-900/40 text-amber-300 border border-amber-700/60">
                            魔法
                          </span>
                        )}
                      </div>
                      <p className="text-[14px] text-slate-300 line-clamp-2">{view.description}</p>
                    </div>
                    <button
                      onClick={() => handleLearnItem(item)}
                      className="shrink-0 px-4 py-2 rounded-lg bg-green-600 text-white text-[14px] font-bold active:bg-green-700 whitespace-nowrap"
                    >
                      {isOwned ? '已持有' : '獲得'}
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
