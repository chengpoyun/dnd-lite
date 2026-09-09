/**
 * CombatStatEditModal - 戰鬥屬性編輯（攻擊命中、攻擊傷害、法術命中、法術豁免等）
 * 可選 segment bar（如力量/敏捷）+ 基礎值輸入 + 加值列表 + 公式備註
 */
import { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { SegmentBar, type SegmentBarOption } from './ui/SegmentBar';
import { handleValueInput } from '../utils/helpers';
import { BasicBonusEditorBody, type BonusSourceItem } from './ui/BasicBonusEditorBody';
import { MODAL_CONTAINER_CLASS } from '../styles/modalStyles';

export type { BonusSourceItem };

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
  /** 接在最終總計數字後面的字尾（例如骰子加成合併後的 "+2d4"） */
  finalValueSuffix?: string;
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
  finalValueSuffix,
  resetBasicValue,
}: CombatStatEditModalProps<T>) {
  const [value, setValue] = useState(basicValue.toString());
  const [segment, setSegment] = useState<T | undefined>(segmentValue);
  // bonusValue 有給時，代表呼叫端支援即時重算（隨切換 segment／輸入基礎值變動）；
  // finalValue 是切換前的靜態總計，只在沒有 bonusValue 時當備援
  const parsedBasic = parseInt(value, 10);
  const liveBasic = Number.isFinite(parsedBasic) ? parsedBasic : basicValue;
  const displayTotal = bonusValue !== undefined ? liveBasic + bonusValue : (finalValue ?? liveBasic);

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
        <BasicBonusEditorBody
          value={value}
          onChange={setValue}
          placeholder={basicValue.toString()}
          description={description}
          bonusSources={bonusSources}
          finalValue={finalValue}
          bonusValue={bonusValue}
          displayTotal={displayTotal}
          finalValueSuffix={finalValueSuffix}
          onReset={handleReset}
          onClose={onClose}
          onApply={handleApply}
          applyButtonClassName={applyButtonClassName}
        />
      </div>
    </Modal>
  );
}
