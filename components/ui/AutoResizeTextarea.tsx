import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

interface AutoResizeTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'rows'> {
  /** 最小行數，避免內容為空時欄位塌陷過小 */
  minRows?: number;
}

/** 依內容多寡自動伸縮高度的 textarea，不會出現內部捲動；外層 Modal 的捲動仍照常運作 */
export const AutoResizeTextarea = forwardRef<HTMLTextAreaElement, AutoResizeTextareaProps>(
  ({ minRows = 3, value, onChange, className = '', ...rest }, forwardedRef) => {
    const innerRef = useRef<HTMLTextAreaElement>(null);
    useImperativeHandle(forwardedRef, () => innerRef.current as HTMLTextAreaElement);

    const resize = () => {
      const el = innerRef.current;
      if (!el) return;
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    };

    useEffect(() => {
      resize();
    }, [value]);

    return (
      <textarea
        ref={innerRef}
        value={value}
        onChange={(e) => {
          onChange?.(e);
          resize();
        }}
        rows={minRows}
        className={`resize-none overflow-hidden ${className}`}
        {...rest}
      />
    );
  }
);

AutoResizeTextarea.displayName = 'AutoResizeTextarea';
