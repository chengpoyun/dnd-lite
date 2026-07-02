/**
 * CurrencyModal - 金幣 (GP) 編輯
 */
import React from 'react';
import NumberEditModal from './NumberEditModal';
import { formatDecimal } from '../utils/helpers';
import { MODAL_LABEL_AMBER_CLASS, MODAL_BUTTON_APPLY_AMBER_CLASS } from '../styles/modalStyles';

interface CurrencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  value: string;
  onChange: (value: string) => void;
  currentGp: number;
  onApply: (numericValue: number) => void;
}

export default function CurrencyModal({
  isOpen, onClose, value, onChange, currentGp, onApply,
}: CurrencyModalProps) {
  return (
    <NumberEditModal
      isOpen={isOpen}
      onClose={onClose}
      title="修改資金"
      size="xs"
      value={value}
      onChange={onChange}
      placeholder={formatDecimal(currentGp)}
      minValue={-Infinity}
      allowZero
      onApply={onApply}
      decimal
      inputLabel="持有金幣 (GP)"
      inputLabelClassName={`${MODAL_LABEL_AMBER_CLASS} shrink-0`}
      inputClassName="w-full mt-1 text-3xl font-mono text-center text-amber-500"
      showValuePreview
      previewLabel="計算結果"
      formatPreviewValue={formatDecimal}
      previewValueClassName="text-amber-500 text-2xl"
      applyButtonClassName={MODAL_BUTTON_APPLY_AMBER_CLASS}
    />
  );
}
