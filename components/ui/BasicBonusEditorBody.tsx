/**
 * BasicBonusEditorBody - 「基礎值輸入 + 說明 + 加值來源 + 最終總計/數值預覽 + 重置/取消/套用」
 * 共用內容區塊，從 NumberEditModal 與 CombatStatEditModal 抽出（兩者原本逐字重複這段 JSX，
 * 只有 state 擁有者不同：前者由父層受控，後者自己管理 state）。
 * 純呈現元件：所有數值都由呼叫端算好傳入，這裡不做任何計算，避免兩邊細微不同的計算邏輯被誤合併。
 */
import { ModalButton, ModalInput } from './Modal';
import { FinalTotalRow } from './FinalTotalRow';
import { BonusSourcesList, type BonusSourceItem } from './BonusSourcesList';
import {
  MODAL_BODY_TEXT_CLASS,
  MODAL_DESCRIPTION_CLASS,
  MODAL_BUTTON_CANCEL_CLASS,
  MODAL_BUTTON_RESET_CLASS,
  MODAL_FOOTER_BUTTONS_CLASS,
  MODAL_PREVIEW_LABEL_CLASS,
  MODAL_PREVIEW_ROW_CLASS,
} from '../../styles/modalStyles';

export type { BonusSourceItem };

export interface BasicBonusEditorBodyProps {
  /** 輸入框前的標籤，傳 null 隱藏；預設「基礎值」 */
  inputLabel?: string | null;
  inputLabelClassName?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  inputClassName?: string;
  description?: string;
  bonusSources?: BonusSourceItem[];
  /** 有傳（不論值為何）就顯示「最終總計」列，用來判斷要不要顯示，不是拿來算總計 */
  finalValue?: number;
  bonusValue?: number;
  /** 「最終總計」列實際顯示的數字，由呼叫端算好（basic 的即時預覽 + bonusValue，或退回 finalValue） */
  displayTotal: number;
  finalValueSuffix?: string;
  /** 顯示「舊值→新值」預覽列，取代/獨立於最終總計 */
  showValuePreview?: boolean;
  previewLabel?: string;
  /** 預覽列左側「舊值」 */
  baseValue?: number;
  /** 預覽列右側「新值」 */
  previewValue?: number;
  formatPreviewValue?: (n: number) => string | number;
  valueSuffix?: string;
  previewValueClassName?: string;
  onReset: () => void;
  onClose: () => void;
  onApply: () => void;
  applyButtonClassName?: string;
}

export function BasicBonusEditorBody({
  inputLabel = '基礎值',
  inputLabelClassName = `${MODAL_BODY_TEXT_CLASS} shrink-0`,
  value,
  onChange,
  placeholder,
  inputClassName = 'text-2xl font-mono flex-1',
  description,
  bonusSources,
  finalValue,
  bonusValue,
  displayTotal,
  finalValueSuffix,
  showValuePreview = false,
  previewLabel = '計算結果',
  baseValue = 0,
  previewValue = 0,
  formatPreviewValue = (n: number) => n,
  valueSuffix = '',
  previewValueClassName = 'text-white text-2xl',
  onReset,
  onClose,
  onApply,
  applyButtonClassName = 'bg-amber-600 hover:bg-amber-500',
}: BasicBonusEditorBodyProps) {
  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        {inputLabel !== null && (
          <span className={inputLabelClassName}>{inputLabel}</span>
        )}
        <ModalInput
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={inputClassName}
        />
      </div>
      {description && (
        <p className={`${MODAL_DESCRIPTION_CLASS} text-center mb-3`}>{description}</p>
      )}
      {bonusSources && bonusSources.length > 0 && (
        <BonusSourcesList title="加值來源" sources={bonusSources} className="mb-3" />
      )}
      {(finalValue !== undefined || bonusValue !== undefined) && (
        <FinalTotalRow label="最終總計" value={displayTotal} suffix={finalValueSuffix} className="mb-3" />
      )}
      {showValuePreview && (
        <div className="text-center mb-3">
          <span className={MODAL_PREVIEW_LABEL_CLASS}>{previewLabel}</span>
          <div className={MODAL_PREVIEW_ROW_CLASS}>
            <span className="text-slate-400">{formatPreviewValue(baseValue)}{valueSuffix}</span>
            <span className="text-slate-600">→</span>
            <span className={previewValueClassName}>{formatPreviewValue(previewValue)}{valueSuffix}</span>
          </div>
        </div>
      )}
      <div className={MODAL_FOOTER_BUTTONS_CLASS}>
        <ModalButton variant="secondary" className={MODAL_BUTTON_RESET_CLASS} onClick={onReset}>
          重置
        </ModalButton>
        <ModalButton variant="secondary" className={MODAL_BUTTON_CANCEL_CLASS} onClick={onClose}>
          取消
        </ModalButton>
        <ModalButton variant="primary" onClick={onApply} className={applyButtonClassName}>
          套用
        </ModalButton>
      </div>
    </>
  );
}
