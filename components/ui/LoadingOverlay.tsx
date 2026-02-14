/**
 * Modal 內儲存中蓋版：阻擋操作，中央顯示 spinner + 文案。父層需為 position: relative。
 */
import React from 'react';
import { LOADING_OVERLAY_CLASS, LOADING_BOX_CLASS } from '../../styles/modalStyles';

export interface LoadingOverlayProps {
  visible: boolean;
  text?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ visible, text = '儲存中…' }) => {
  if (!visible) return null;

  return (
    <div className={LOADING_OVERLAY_CLASS} role="status" aria-live="polite" aria-label={text}>
      <div className={LOADING_BOX_CLASS}>
        <div className="flex items-center gap-3">
          <span
            className="animate-spin rounded-full h-5 w-5 border-2 border-amber-500 border-t-transparent flex-shrink-0"
            aria-hidden
          />
          <span className="font-medium text-slate-200">{text}</span>
        </div>
      </div>
    </div>
  );
};
