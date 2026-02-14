/**
 * Modal 內主儲存按鈕：支援 loading 狀態（spinner + 儲存中…），與 ModalButton 樣式一致。
 */
import React from 'react';

const buttonVariants = {
  primary: 'bg-amber-600 hover:bg-amber-500 text-white',
  secondary: 'bg-slate-800 hover:bg-slate-700 text-slate-400',
  danger: 'bg-red-950/40 hover:bg-red-950/60 text-red-400 border border-red-900/30',
};

export interface ModalSaveButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  className?: string;
  children: React.ReactNode;
}

export const ModalSaveButton: React.FC<ModalSaveButtonProps> = ({
  loading = false,
  disabled = false,
  variant = 'primary',
  className = '',
  children,
  type = 'button',
  ...rest
}) => {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={`px-4 py-2 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${buttonVariants[variant]} ${className}`}
      aria-busy={loading}
      aria-label={loading ? '儲存中…' : undefined}
      {...rest}
    >
      {loading ? (
        <>
          <span
            className="animate-spin rounded-full h-5 w-5 border-2 border-amber-500 border-t-transparent flex-shrink-0"
            aria-hidden
          />
          <span>儲存中…</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};
