import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  xs: 'max-w-xs',
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg'
};

export const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'xs',
  className = '' 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-slate-900 border border-slate-700 w-full ${sizeClasses[size]} rounded-2xl p-3 shadow-2xl animate-in fade-in zoom-in duration-150 overflow-y-auto max-h-[90vh] ${className}`}>
        {title && (
          <h3 className="text-base font-fantasy text-amber-500 mb-4 border-b border-slate-800 pb-2">
            {title}
          </h3>
        )}
        {children}
      </div>
    </div>
  );
};

interface ModalButtonProps {
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  className?: string;
  disabled?: boolean;
  children: React.ReactNode;
}

const buttonVariants = {
  primary: 'bg-amber-600 hover:bg-amber-500 text-white',
  secondary: 'bg-slate-800 hover:bg-slate-700 text-slate-400',
  danger: 'bg-red-950/40 hover:bg-red-950/60 text-red-400 border border-red-900/30'
};

export const ModalButton: React.FC<ModalButtonProps> = ({
  onClick,
  variant = 'primary',
  className = '',
  disabled = false,
  children
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${buttonVariants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

interface ModalInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'number';
  className?: string;
  autoFocus?: boolean;
}

export const ModalInput: React.FC<ModalInputProps> = ({
  value,
  onChange,
  placeholder = '',
  type = 'text',
  className = '',
  autoFocus = false
}) => {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      className={`w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white outline-none ${className}`}
    />
  );
};