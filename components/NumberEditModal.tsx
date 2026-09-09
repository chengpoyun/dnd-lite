/**
 * NumberEditModal - 單一數字編輯（basic 值），支援運算式輸入
 * 預留 bonusValue / bonusSources 供之後顯示加值來源
 */
import { Modal } from './ui/Modal';
import { handleValueInput, handleDecimalInput } from '../utils/helpers';
import { BasicBonusEditorBody, type BonusSourceItem } from './ui/BasicBonusEditorBody';
import { MODAL_CONTAINER_CLASS, MODAL_BODY_TEXT_CLASS } from '../styles/modalStyles';

export type { BonusSourceItem as BonusSource };

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
  bonusSources?: BonusSourceItem[];
  /** Optional note (e.g. AC formula: basic + 敏捷調整值 + 其他 bonus) */
  description?: string;
  /** 最終總計（basic + 加值）；有傳則顯示此值，否則由 placeholder + bonusValue 計算 */
  finalValue?: number;
  /** 接在最終總計數字後面的字尾（例如骰子加成合併後的 "+2d4"） */
  finalValueSuffix?: string;
  /** 重置按鈕還原的基礎值（如 AC=10、先攻=0、速度=30） */
  resetValue?: number;
  /** 是否允許小數與負數（供經驗值/金幣等場景使用，內部改走 handleDecimalInput） */
  decimal?: boolean;
  /** 輸入框前的標籤，傳 null 隱藏（如修整期/金幣等單值編輯不需要「基礎值」字樣） */
  inputLabel?: string | null;
  /** 顯示「舊值→新值」預覽列，取代/獨立於 basic+bonus 的最終總計 */
  showValuePreview?: boolean;
  /** 預覽列標籤，預設「計算結果」 */
  previewLabel?: string;
  /** 預覽數值格式化（如金幣的 formatDecimal），預設原樣顯示 */
  formatPreviewValue?: (n: number) => string | number;
  /** 預覽數值單位後綴（如修整期的 " 天"） */
  valueSuffix?: string;
  /** 預覽新值的顏色/字級 class，預設沿用既有白字大字風格 */
  previewValueClassName?: string;
  /** 輸入框樣式覆寫（如修整期的大字置中、金幣的琥珀色），預設沿用既有 AC/先攻等樣式 */
  inputClassName?: string;
  /** 輸入框標籤樣式覆寫（如金幣的琥珀色標籤），預設沿用既有灰階樣式 */
  inputLabelClassName?: string;
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
  finalValue,
  finalValueSuffix,
  resetValue,
  decimal = false,
  inputLabel = '基礎值',
  showValuePreview = false,
  previewLabel = '計算結果',
  formatPreviewValue = (n: number) => n,
  valueSuffix = '',
  previewValueClassName = 'text-white text-2xl',
  inputClassName = 'text-2xl font-mono flex-1',
  inputLabelClassName = `${MODAL_BODY_TEXT_CLASS} shrink-0`,
}: NumberEditModalProps) {
  const baseValue = parseFloat(placeholder) || 0;
  const inputResult = decimal
    ? handleDecimalInput(value, baseValue, { minValue, allowZero, allowNegative: true })
    : handleValueInput(value, baseValue, { minValue, allowZero });
  const previewValue = inputResult.isValid ? inputResult.numericValue : baseValue;
  // bonusValue 有給時，代表呼叫端支援即時重算（隨輸入基礎值變動）；
  // finalValue 是編輯前的靜態總計，只在沒有 bonusValue 時當備援
  const displayTotal = bonusValue !== undefined ? previewValue + bonusValue : (finalValue ?? baseValue);

  const handleApply = () => {
    if (inputResult.isValid) {
      onApply(inputResult.numericValue);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size={size}>
      <div className={MODAL_CONTAINER_CLASS}>
        <BasicBonusEditorBody
          inputLabel={inputLabel}
          inputLabelClassName={inputLabelClassName}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          inputClassName={inputClassName}
          description={description}
          bonusSources={bonusSources}
          finalValue={finalValue}
          bonusValue={bonusValue}
          displayTotal={displayTotal}
          finalValueSuffix={finalValueSuffix}
          showValuePreview={showValuePreview}
          previewLabel={previewLabel}
          baseValue={baseValue}
          previewValue={previewValue}
          formatPreviewValue={formatPreviewValue}
          valueSuffix={valueSuffix}
          previewValueClassName={previewValueClassName}
          onReset={() => onChange(resetValue !== undefined ? String(resetValue) : placeholder)}
          onClose={onClose}
          onApply={handleApply}
          applyButtonClassName={applyButtonClassName}
        />
      </div>
    </Modal>
  );
}
