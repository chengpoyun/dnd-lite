import React from 'react';

interface FinalTotalRowProps {
  label: string;
  value: number;
  className?: string;
  valueClassName?: string;
}

export const FinalTotalRow: React.FC<FinalTotalRowProps> = ({
  label,
  value,
  className = '',
  valueClassName = '',
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
      </span>
    </div>
  );
};

