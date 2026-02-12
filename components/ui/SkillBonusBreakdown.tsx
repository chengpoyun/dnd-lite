import React from 'react';
import { FinalTotalRow } from './FinalTotalRow';
import { LabelInputRow } from './LabelInputRow';
import { BonusSourcesList } from './BonusSourcesList';

interface BonusSource {
  label: string;
  value: number;
}

interface SkillBonusBreakdownProps {
  /** 顯示在基礎值 input 的值（字串，父層負責 state） */
  basicInput: string;
  onBasicChange: (value: string) => void;
  /** 基礎值說明文字，例如「基礎值為力量調整值 + 熟練/專精加值 + 調整值加成」 */
  description: string;
  /** 額外加值來源列表（可多行） */
  bonusSources: BonusSource[];
  /** 最終總計（父層計算 basic + 所有 bonus） */
  finalTotal: number;
}

export const SkillBonusBreakdown: React.FC<SkillBonusBreakdownProps> = ({
  basicInput,
  onBasicChange,
  description,
  bonusSources,
  finalTotal,
}) => {
  return (
    <div className="mt-2 space-y-3 min-w-0">
      {/* 基礎值列 */}
      <LabelInputRow
        label="基礎值"
        value={basicInput}
        onChange={onBasicChange}
        description={description}
        inputClassName="text-center font-mono"
      />

      {/* bonus 列表（多來源） */}
      <BonusSourcesList title="其他加值來源：" sources={bonusSources} />

      {/* 最終總計 */}
      <FinalTotalRow label="最終總計" value={finalTotal} />
    </div>
  );
};

