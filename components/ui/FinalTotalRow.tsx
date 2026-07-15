import React from 'react';

interface FinalTotalRowProps {
  label: string;
  value: number;
  className?: string;
  valueClassName?: string;
  /** 接在數字後面顯示的字尾（例如骰子加成合併後的 "+2d4"） */
  suffix?: string;
}

export const FinalTotalRow: React.FC<FinalTotalRowProps> = ({
  label,
  value,
  className = '',
  valueClassName = '',
  suffix = '',
}) => {
  const safeValue = Number.isFinite(value) ? value : 0;
  const sign = safeValue >= 0 ? '+' : '';

  return (
    <div
      className={`text-base text-slate-300 flex items-center justify-between ${className}`}
    >
      <span>{label}</span>
      <span
        className={`text-2xl font-mono font-black text-amber-400 ${valueClassName}`}
      >
        {sign}
        {safeValue}
        {suffix}
      </span>
    </div>
  );
};

