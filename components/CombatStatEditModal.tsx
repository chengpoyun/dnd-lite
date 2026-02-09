/**
 * CombatStatEditModal - 戰鬥屬性編輯（攻擊命中、攻擊傷害、法術命中、法術豁免等）
 * 可選 segment bar（如力量/敏捷）+ 基礎值輸入 + 加值列表 + 公式備註
 */
import React, { useState, useEffect } from 'react';
import { Modal, ModalButton, ModalInput } from './ui/Modal';
import { SegmentBar, type SegmentBarOption } from './ui/SegmentBar';
import { handleValueInput } from '../utils/helpers';
import { MODAL_CONTAINER_CLASS, MODAL_BODY_TEXT_CLASS, MODAL_DESCRIPTION_CLASS } from '../styles/modalStyles';

export interface BonusSourceItem {
  label: string;
  value: number;
}

interface CombatStatEditModalProps<T extends string = string> {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  basicValue: number;
  bonusValue?: number;
  bonusSources?: BonusSourceItem[];
  description?: string;
  /** 可選 segment 選項（如力量/敏捷）；有值時顯示 SegmentBar */
  segmentOptions?: SegmentBarOption<T>[];
  segmentValue?: T;
  /** 當使用者在 modal 內切換 segment 時通知父層，以便即時更新加值顯示 */
  onSegmentChange?: (value: T) => void;
  onSave: (basic: number, segmentValue?: T) => void;
  minValue?: number;
  allowZero?: boolean;
  applyButtonClassName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
}

export default function CombatStatEditModal<T extends string = string>({
  title,
  isOpen,
  onClose,
  basicValue,
  bonusValue,
  bonusSources,
  description,
  segmentOptions,
  segmentValue,
  onSegmentChange,
  onSave,
  minValue = 0,
  allowZero = true,
  applyButtonClassName = 'bg-amber-600 hover:bg-amber-500',
  size = 'xs',
}: CombatStatEditModalProps<T>) {
  const [value, setValue] = useState(basicValue.toString());
  const [segment, setSegment] = useState<T | undefined>(segmentValue);

  useEffect(() => {
    if (isOpen) {
      setValue(basicValue.toString());
      setSegment(segmentValue);
    }
  }, [isOpen, basicValue, segmentValue]);

  const handleApply = () => {
    const result = handleValueInput(value, basicValue, {
      minValue,
      allowZero,
    });
    if (result.isValid) {
      onSave(result.numericValue, segment);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size={size}>
      <div className={MODAL_CONTAINER_CLASS}>
        {segmentOptions && segmentOptions.length > 0 && segment !== undefined && (
          <div className="space-y-2 mb-4">
            <SegmentBar<T>
              options={segmentOptions}
              value={segment}
              onChange={(v) => {
                setSegment(v);
                onSegmentChange?.(v);
              }}
            />
          </div>
        )}
        <div className="flex items-center gap-2 mb-4">
          <span className={`${MODAL_BODY_TEXT_CLASS} shrink-0`}>基礎值</span>
          <ModalInput
            value={value}
            onChange={setValue}
            placeholder={basicValue.toString()}
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
