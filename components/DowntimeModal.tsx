/**
 * DowntimeModal - 修整期天數編輯
 */
import React from 'react';
import NumberEditModal from './NumberEditModal';
import { MODAL_BUTTON_APPLY_AMBER_CLASS } from '../styles/modalStyles';

interface DowntimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  value: string;
  onChange: (value: string) => void;
  currentDowntime: number;
  onApply: (numericValue: number) => void;
}

export default function DowntimeModal({
  isOpen, onClose, value, onChange, currentDowntime, onApply,
}: DowntimeModalProps) {
  return (
    <NumberEditModal
      isOpen={isOpen}
      onClose={onClose}
      title="修整期"
      size="xs"
      value={value}
      onChange={onChange}
      placeholder={currentDowntime.toString()}
      minValue={-Infinity}
      allowZero
      onApply={onApply}
      decimal
      inputLabel={null}
      inputClassName="w-full text-4xl font-mono text-center text-white"
      showValuePreview
      previewLabel="預覽結果"
      valueSuffix=" 天"
      applyButtonClassName={MODAL_BUTTON_APPLY_AMBER_CLASS}
    />
  );
}
