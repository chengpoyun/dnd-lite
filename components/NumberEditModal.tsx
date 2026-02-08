/**
 * NumberEditModal - 單一數字編輯（basic 值），支援運算式輸入
 * 預留 bonusValue / bonusSources 供之後顯示加值來源
 */
import React from 'react';
import { Modal, ModalButton, ModalInput } from './ui/Modal';
import { handleValueInput } from '../utils/helpers';
import { MODAL_CONTAINER_CLASS, MODAL_BODY_TEXT_CLASS, MODAL_DESCRIPTION_CLASS } from '../styles/modalStyles';

export interface BonusSource {
  label: string;
  value: number;
}

interface NumberEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  minValue?: number;
  allowZero?: boolean;
  applyButtonClassName?: string;
  onApply: (numericValue: number) => void;
  bonusValue?: number;
  bonusSources?: BonusSource[];
  /** Optional note (e.g. AC formula: basic + 敏捷調整值 + 其他 bonus) */
  description?: string;
}

export default function NumberEditModal({
  isOpen,
  onClose,
  title,
  size = 'xs',
  value,
  onChange,
  placeholder,
  minValue = 1,
  allowZero = false,
  applyButtonClassName = 'bg-amber-600 hover:bg-amber-500',
  onApply,
  bonusValue,
  bonusSources,
  description,
}: NumberEditModalProps) {
  const baseValue = parseFloat(placeholder) || 0;

  const handleApply = () => {
    const result = handleValueInput(value, baseValue, {
      minValue,
      allowZero,
    });
    if (result.isValid) {
      onApply(result.numericValue);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size={size}>
      <div className={MODAL_CONTAINER_CLASS}>
        <div className="flex items-center gap-2 mb-4">
          <span className={`${MODAL_BODY_TEXT_CLASS} shrink-0`}>基礎值</span>
          <ModalInput
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="text-2xl font-mono flex-1"
            autoFocus
          />
        </div>
        {description && (
          <p className={`${MODAL_DESCRIPTION_CLASS} text-center mb-3`}>{description}</p>
        )}
        {bonusSources && bonusSources.length > 0 && (
          <div className={`${MODAL_BODY_TEXT_CLASS} space-y-0.5 mb-2`}>
            {bonusSources.map((s, i) => (
              <div key={i}>
                {s.label} {s.value >= 0 ? '+' : ''}{s.value}
              </div>
            ))}
          </div>
        )}
        {(bonusValue !== undefined && bonusValue !== null) && (
          <div className={`${MODAL_BODY_TEXT_CLASS} mb-3`}>
            總加值：{bonusValue >= 0 ? '+' : ''}{bonusValue}
          </div>
        )}
        <div className="flex gap-2">
          <ModalButton variant="secondary" onClick={onClose}>
            取消
          </ModalButton>
          <ModalButton
            variant="primary"
            onClick={handleApply}
            className={applyButtonClassName}
          >
            套用
          </ModalButton>
        </div>
      </div>
    </Modal>
  );
}
