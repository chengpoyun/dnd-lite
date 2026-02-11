/**
 * Modal 內「加值來源」列表共用元件（名稱 + 數值，正數綠、負數紅）
 */
import React from 'react';
import {
  BONUS_SOURCES_TITLE_CLASS,
  BONUS_SOURCES_LIST_CLASS,
  BONUS_SOURCES_ROW_CLASS,
  BONUS_SOURCES_LABEL_CLASS,
  BONUS_SOURCES_VALUE_POSITIVE_CLASS,
  BONUS_SOURCES_VALUE_NEGATIVE_CLASS,
} from '../../styles/modalStyles';

export interface BonusSourceItem {
  label: string;
  value: number;
}

interface BonusSourcesListProps {
  /** 區塊標題，如「加值來源」或「其他加值來源：」 */
  title: string;
  sources: BonusSourceItem[];
  /** 外層 div 的 className（如 mb-3） */
  className?: string;
}

export const BonusSourcesList: React.FC<BonusSourcesListProps> = ({
  title,
  sources,
  className = '',
}) => {
  if (sources.length === 0) return null;

  return (
    <div className={className}>
      <p className={BONUS_SOURCES_TITLE_CLASS}>{title}</p>
      <div className={BONUS_SOURCES_LIST_CLASS}>
        {sources.map((s, i) => (
          <div key={i} className={BONUS_SOURCES_ROW_CLASS}>
            <span className={BONUS_SOURCES_LABEL_CLASS}>{s.label}</span>
            <span
              className={
                s.value >= 0
                  ? BONUS_SOURCES_VALUE_POSITIVE_CLASS
                  : BONUS_SOURCES_VALUE_NEGATIVE_CLASS
              }
            >
              {s.value >= 0 ? '+' : ''}
              {s.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
