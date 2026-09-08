/**
 * 共用搜尋欄（筆記／道具／能力頁共用）
 * 外觀沿用 STYLES.input.base；有文字時右側顯示 x 清空按鈕。
 */

import { STYLES, combineStyles } from '../../styles/common';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}

export function SearchInput({ value, onChange, placeholder, className }: SearchInputProps) {
  return (
    <div className={combineStyles('relative', className ?? '')}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={combineStyles(STYLES.input.base, 'w-full', value ? 'pr-9' : '')}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="清空搜尋"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
        >
          ✕
        </button>
      )}
    </div>
  );
}
