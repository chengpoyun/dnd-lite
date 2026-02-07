/**
 * 共用篩選列（外層 + 內層按鈕樣式）
 * 供 ItemsPage（類別）、AbilitiesPage（來源）等使用
 */

import React from 'react';

export interface FilterBarOption {
  label: string;
  value: string;
}

interface FilterBarProps {
  options: FilterBarOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  options,
  selectedValue,
  onSelect,
}) => (
  <div
    className="flex gap-2 mb-6 overflow-x-auto pb-2"
    onTouchStart={(e) => e.stopPropagation()}
    onTouchMove={(e) => e.stopPropagation()}
    onTouchEnd={(e) => e.stopPropagation()}
  >
    {options.map((opt) => (
      <button
        key={opt.value}
        type="button"
        onClick={() => onSelect(opt.value)}
        className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
          selectedValue === opt.value
            ? 'bg-amber-600 text-white shadow-md'
            : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
        }`}
      >
        {opt.label}
      </button>
    ))}
  </div>
);
