/**
 * SegmentBar - 可切換選項列，樣式與「恢復週期」一致，可共用於恢復週期、力量/敏捷等
 */
import React from 'react';

const SEGMENT_BAR_WRAPPER_CLASS = 'flex bg-slate-950 p-1 rounded-xl border border-slate-800';
const SEGMENT_BUTTON_BASE_CLASS = 'flex-1 py-2 rounded-lg text-[16px] font-black uppercase transition-all';
const SEGMENT_BUTTON_INACTIVE_CLASS = 'text-slate-600';
const SEGMENT_BUTTON_ACTIVE_DEFAULT_CLASS = 'bg-slate-800 text-white shadow-sm';

export interface SegmentBarOption<T> {
  value: T;
  label: string;
  activeClassName?: string;
}

interface SegmentBarProps<T> {
  options: SegmentBarOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentBar<T extends string>({ options, value, onChange }: SegmentBarProps<T>) {
  return (
    <div className={SEGMENT_BAR_WRAPPER_CLASS}>
      {options.map((opt) => {
        const isActive = opt.value === value;
        const activeClass = opt.activeClassName ?? SEGMENT_BUTTON_ACTIVE_DEFAULT_CLASS;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`${SEGMENT_BUTTON_BASE_CLASS} ${isActive ? activeClass : SEGMENT_BUTTON_INACTIVE_CLASS}`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
