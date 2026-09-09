/**
 * CatalogModalHeader - 「標題 + 關閉按鈕 + 可選的新增按鈕」，從 LearnAbilityModal／
 * LearnSpellModal／LearnItemModal 三個目錄搜尋彈窗抽出。三者按鈕文字與樣式略有不同
 * （hover: vs active: 等），故 className 可覆寫，預設沿用 LearnAbilityModal 原本的樣式。
 */
const DEFAULT_CLOSE_BUTTON_CLASS =
  'px-4 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-600 transition-colors font-medium whitespace-nowrap';
const DEFAULT_CREATE_BUTTON_CLASS =
  'px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors font-medium whitespace-nowrap';

interface CatalogModalHeaderProps {
  title: string;
  onClose: () => void;
  closeLabel?: string;
  closeButtonClassName?: string;
  onCreateNew?: () => void;
  createLabel?: string;
  createButtonClassName?: string;
}

export function CatalogModalHeader({
  title,
  onClose,
  closeLabel = '取消',
  closeButtonClassName = DEFAULT_CLOSE_BUTTON_CLASS,
  onCreateNew,
  createLabel,
  createButtonClassName = DEFAULT_CREATE_BUTTON_CLASS,
}: CatalogModalHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
      <h2 className="text-xl font-bold">{title}</h2>
      <div className="flex gap-2">
        <button onClick={onClose} className={closeButtonClassName}>
          {closeLabel}
        </button>
        {onCreateNew && createLabel && (
          <button onClick={onCreateNew} className={createButtonClassName}>
            {createLabel}
          </button>
        )}
      </div>
    </div>
  );
}
