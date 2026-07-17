/**
 * DecorationSlots - 裝備插槽（魔物獵人風格鑲嵌系統）
 * 實心藍寶石＝已鑲嵌，空心寶石＝空插槽；有 onSlotClick 時可點擊開啟鑲嵌/檢視 modal，
 * 省略 onSlotClick 時為純顯示用（如物品列表卡片的插槽縮圖）
 * layout="row"（預設）：一列並排的圖示，如列表卡片縮圖
 * layout="list"：一列一個插槽，圖示後面接鑲嵌素材名稱（空插槽顯示「（空）」），如道具詳情頁
 */

import React from 'react';
import type { DecorationSocket } from '../../services/itemService';

const GEM_BLUE_SRC = `${import.meta.env.BASE_URL}icons/gem_blue.png`;
const GEM_EMPTY_SRC = `${import.meta.env.BASE_URL}icons/gem-small.png`;

interface DecorationSlotsProps {
  totalSlots: number;
  sockets: (DecorationSocket | null)[] | null | undefined;
  onSlotClick?: (index: number) => void;
  size?: 'normal' | 'small';
  layout?: 'row' | 'list';
}

export const DecorationSlots: React.FC<DecorationSlotsProps> = ({
  totalSlots,
  sockets,
  onSlotClick,
  size = 'normal',
  layout = 'row',
}) => {
  if (totalSlots <= 0) return null;

  if (layout === 'list') {
    return (
      <div className="space-y-1">
        {Array.from({ length: totalSlots }).map((_, i) => {
          const socket = sockets?.[i] ?? null;
          const content = (
            <>
              <img
                src={socket ? GEM_BLUE_SRC : GEM_EMPTY_SRC}
                alt=""
                className={`w-6 h-6 object-contain flex-shrink-0 ${socket ? '' : 'opacity-60'}`}
              />
              <span className={`text-sm truncate ${socket ? 'text-slate-200' : 'text-slate-500'}`}>
                {socket ? socket.decoration_name : '（空）'}
              </span>
            </>
          );

          if (!onSlotClick) {
            return (
              <div key={i} className="flex items-center gap-2">
                {content}
              </div>
            );
          }

          return (
            <button
              key={i}
              type="button"
              onClick={() => onSlotClick(i)}
              className="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors text-left"
            >
              {content}
            </button>
          );
        })}
      </div>
    );
  }

  const sizeClass = size === 'small' ? 'w-4 h-4' : 'w-10 h-10';
  const gapClass = size === 'small' ? 'gap-1' : 'gap-2';

  return (
    <div className={`flex items-center flex-wrap ${gapClass}`}>
      {Array.from({ length: totalSlots }).map((_, i) => {
        const socket = sockets?.[i] ?? null;
        const img = (
          <img
            src={socket ? GEM_BLUE_SRC : GEM_EMPTY_SRC}
            alt=""
            className={`${sizeClass} object-contain ${socket ? '' : 'opacity-60'}`}
          />
        );

        if (!onSlotClick) {
          return (
            <span key={i} className={`${sizeClass} flex-shrink-0`}>
              {img}
            </span>
          );
        }

        return (
          <button
            key={i}
            type="button"
            onClick={() => onSlotClick(i)}
            aria-label={socket ? `已鑲嵌：${socket.decoration_name}` : '空插槽'}
            title={socket ? socket.decoration_name : '空插槽'}
            className={`${sizeClass} flex-shrink-0 active:scale-90 transition-transform`}
          >
            {img}
          </button>
        );
      })}
    </div>
  );
};
