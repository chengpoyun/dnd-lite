/**
 * 共用篩選列（外層 + 內層按鈕樣式）
 * 供 ItemsPage（類別）、AbilitiesPage（來源）等使用
 */

import React from 'react';
import { STYLES, combineStyles } from '../../styles/common';

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
    className={STYLES.filterRow.scroll}
    onTouchStart={(e) => e.stopPropagation()}
    onTouchMove={(e) => e.stopPropagation()}
    onTouchEnd={(e) => e.stopPropagation()}
  >
    {options.map((opt) => (
      <button
        key={opt.value}
        type="button"
        onClick={() => onSelect(opt.value)}
        className={combineStyles(
          STYLES.filterChip.base,
          selectedValue === opt.value ? STYLES.filterChip.selected : STYLES.filterChip.unselected
        )}
      >
        {opt.label}
      </button>
    ))}
  </div>
);
