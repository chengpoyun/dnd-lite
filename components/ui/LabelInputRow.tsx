/**
 * Modal 內「標籤 + 橫列 input」共用元件
 * 使用 min-w-0 flex-1 讓 input 填滿剩餘寬度，右緣與其他內容對齊，避免 flex 預設 min-width 造成的錯位。
 */
import React from 'react';
import {
  MODAL_LABEL_INPUT_ROW_CLASS,
  MODAL_LABEL_INPUT_ROW_INPUT_CLASS,
} from '../../styles/modalStyles';

interface LabelInputRowProps {
  /** 左側標籤文字或節點 */
  label: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  /** 可選：標籤下方說明 */
  description?: string;
  /** 額外套在 input 的 class（如 text-center font-mono） */
  inputClassName?: string;
  placeholder?: string;
  type?: 'text' | 'number';
  /** 傳給 input 的其他屬性 */
  inputProps?: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'className' | 'placeholder' | 'type'>;
}

export const LabelInputRow: React.FC<LabelInputRowProps> = ({
  label,
  value,
  onChange,
  description,
  inputClassName = '',
  placeholder,
  type = 'text',
  inputProps = {},
}) => {
  return (
    <div className="space-y-1">
      <div className={MODAL_LABEL_INPUT_ROW_CLASS}>
        <span className="text-base text-slate-300 shrink-0">{label}</span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${MODAL_LABEL_INPUT_ROW_INPUT_CLASS} ${inputClassName}`.trim()}
          {...inputProps}
        />
      </div>
      {description != null && description !== '' && (
        <p className="text-xs text-slate-500 ml-1">{description}</p>
      )}
    </div>
  );
};
