/**
 * CombatStatEditModal - 戰鬥屬性編輯（攻擊命中、攻擊傷害、法術命中、法術豁免等）
 * 可選 segment bar（如力量/敏捷）+ 基礎值輸入 + 加值列表 + 公式備註
 */
import React, { useState, useEffect } from 'react';
import { Modal, ModalButton, ModalInput } from './ui/Modal';
import { SegmentBar, type SegmentBarOption } from './ui/SegmentBar';
import { handleValueInput } from '../utils/helpers';
import { FinalTotalRow } from './ui/FinalTotalRow';
import { MODAL_CONTAINER_CLASS, MODAL_BODY_TEXT_CLASS, MODAL_DESCRIPTION_CLASS, MODAL_BUTTON_CANCEL_CLASS, MODAL_BUTTON_RESET_CLASS } from '../styles/modalStyles';

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
  /** 最終總計（basic + 加值）；有傳則顯示此值，否則由 basicValue + bonusValue 計算 */
  finalValue?: number;
  /** 重置按鈕還原的基礎值（如攻擊命中/傷害/法術命中=0、法術DC=8） */
  resetBasicValue?: number;
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
  finalValue,
  resetBasicValue,
}: CombatStatEditModalProps<T>) {
  const [value, setValue] = useState(basicValue.toString());
  const [segment, setSegment] = useState<T | undefined>(segmentValue);
  const displayTotal = finalValue ?? (basicValue + (bonusValue ?? 0));

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

  const handleReset = () => {
    setValue((resetBasicValue !== undefined ? resetBasicValue : basicValue).toString());
    setSegment(segmentValue);
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
          <div className="mb-3">
            <p className="text-xs text-slate-500 ml-1 mb-1">加值來源</p>
            <div className="space-y-0.5">
              {bonusSources.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-sm text-slate-300"
                >
                  <span className="truncate">{s.label}</span>
                  <span className={s.value >= 0 ? 'text-emerald-400 font-mono' : 'text-rose-400 font-mono'}>
                    {s.value >= 0 ? '+' : ''}{s.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        {(finalValue !== undefined || bonusValue !== undefined) && (
          <FinalTotalRow label="最終總計" value={displayTotal} className="mb-3" />
        )}
        <div className="flex gap-2">
          <ModalButton variant="secondary" className={MODAL_BUTTON_RESET_CLASS} onClick={handleReset}>
            重置
          </ModalButton>
          <ModalButton variant="secondary" className={MODAL_BUTTON_CANCEL_CLASS} onClick={onClose}>
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
