import React, { useState, useEffect, useRef } from 'react';
import { Modal } from './ui/Modal';
import { GlobalItem, searchGlobalItems } from '../services/itemService';
import { MODAL_CONTAINER_CLASS } from '../styles/modalStyles';

const SEARCH_DEBOUNCE_MS = 280;

interface LearnItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLearnItem: (itemId: string) => Promise<void>;
  onCreateNew: (initialName?: string) => void;
  learnedItemIds: string[];
}

export const LearnItemModal: React.FC<LearnItemModalProps> = ({
  isOpen,
  onClose,
  onLearnItem,
  onCreateNew,
  learnedItemIds
}) => {
  const [items, setItems] = useState<GlobalItem[]>([]);
  const [searchText, setSearchText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSearchText('');
      setItems([]);
      setIsLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const query = searchText.trim();
    if (!query) {
      setItems([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      debounceRef.current = null;
      setIsLoading(true);
      try {
        const result = await searchGlobalItems(query);
        if (result.success && result.items) {
          setItems(result.items.filter(item => !learnedItemIds.includes(item.id)));
        } else {
          console.error('搜尋物品失敗:', result.error);
          setItems([]);
        }
      } catch (error) {
        console.error('搜尋物品失敗:', error);
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchText, learnedItemIds]);

  const filteredItems = items;

  const handleLearnItem = async (itemId: string) => {
    try {
      await onLearnItem(itemId);
      // 從列表中移除已獲得的物品
      setItems(prev => prev.filter(i => i.id !== itemId));
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
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-8 text-slate-400">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-500 border-t-transparent" />
              <div>載入中...</div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8 text-slate-400 space-y-1">
              <div>{searchText.trim() ? '沒有符合條件的物品' : '請輸入關鍵字以搜尋物品'}</div>
              {searchText.trim() && (
                <div className="text-[13px] text-slate-500">已擁有的物品不會顯示在此列表中</div>
              )}
            </div>
          ) : (
            filteredItems.map(item => (
              <div
                key={item.id}
                className="bg-slate-700/50 rounded-lg p-4 border border-slate-600"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-[16px] font-bold text-amber-400">{item.name}</h3>
                      <span className="px-2 py-0.5 rounded text-[12px] bg-slate-600 text-slate-300">
                        {item.category}
                      </span>
                      {item.is_magic && (
                        <span className="px-2 py-0.5 rounded text-[12px] bg-amber-900/40 text-amber-300 border border-amber-700/60">
                          魔法
                        </span>
                      )}
                    </div>
                    <p className="text-[14px] text-slate-300 line-clamp-2">{item.description ?? ''}</p>
                  </div>
                  <button
                    onClick={() => handleLearnItem(item.id)}
                    className="shrink-0 px-4 py-2 rounded-lg bg-green-600 text-white text-[14px] font-bold active:bg-green-700 whitespace-nowrap"
                  >
                    獲得
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </Modal>
  );
};
