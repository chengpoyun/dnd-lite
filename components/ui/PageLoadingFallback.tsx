import React from 'react';

export interface PageLoadingFallbackProps {
  /** 顯示在 loading 底下的文字，例如「載入戰鬥檢視...」 */
  message: string;
  /** 高度 class，預設為 h-64，方便在不同頁面覆用 */
  heightClass?: string;
  /** 外層額外 class（如全螢幕 fallback 的 bg-gradient） */
  className?: string;
}

export const PageLoadingFallback: React.FC<PageLoadingFallbackProps> = ({
  message,
  heightClass = 'h-64',
  className = '',
}) => {
  return (
    <div className={`flex items-center justify-center ${heightClass} ${className}`.trim()} role="status" aria-live="polite">
      <div className="text-center">
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"
          aria-hidden
        />
        <p className="text-slate-400">{message}</p>
      </div>
    </div>
  );
};

