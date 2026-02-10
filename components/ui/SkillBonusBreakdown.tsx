import React from 'react';
import { FinalTotalRow } from './FinalTotalRow';

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
    <div className="mt-2 space-y-3">
      {/* 基礎值列 */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-base text-slate-300 shrink-0">基礎值</span>
          <input
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-center font-mono focus:outline-none focus:border-amber-500"
            value={basicInput}
            onChange={(e) => onBasicChange(e.target.value)}
          />
        </div>
        <p className="text-xs text-slate-500 ml-1">{description}</p>
      </div>

      {/* bonus 列表（多來源） */}
      {bonusSources.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-slate-500 ml-1">其他加值來源：</p>
          <div className="space-y-0.5">
            {bonusSources.map((b) => (
              <div
                key={b.label}
                className="flex items-center justify-between text-sm text-slate-300"
              >
                <span className="truncate">{b.label}</span>
                <span className={b.value >= 0 ? 'text-emerald-400 font-mono' : 'text-rose-400 font-mono'}>
                  {b.value >= 0 ? '+' : ''}
                  {b.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 最終總計 */}
      <FinalTotalRow label="最終總計" value={finalTotal} />
    </div>
  );
};

