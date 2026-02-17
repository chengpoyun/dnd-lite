/**
 * 豁免／技能優劣勢外框：綠色粗外框＝優勢，紅色粗外框＝劣勢，不影響內文尺寸與間距。
 */
import React from 'react';

export type AdvantageDisadvantageVariant = 'advantage' | 'normal' | 'disadvantage';

interface AdvantageDisadvantageBorderProps {
  variant: AdvantageDisadvantageVariant;
  children: React.ReactNode;
  className?: string;
}

export const AdvantageDisadvantageBorder: React.FC<AdvantageDisadvantageBorderProps> = ({
  variant,
  children,
  className = '',
}) => {
  if (variant === 'normal') {
    return <>{children}</>;
  }
  const ringClass =
    variant === 'advantage'
      ? 'ring-2 ring-emerald-500'
      : 'ring-2 ring-rose-500';
  return (
    <div className={`w-full min-w-0 rounded-lg ${ringClass} ${className}`.trim()}>
      {children}
    </div>
  );
};
