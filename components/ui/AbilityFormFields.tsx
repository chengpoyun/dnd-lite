/**
 * AbilityFormFields - 「名稱（可選英文名）＋來源＋恢復類型＋描述＋可插入額外內容＋最大使用次數」
 * 從 AddPersonalAbilityModal（新增個人能力，無英文名/無數值加成）與 AbilityFormModal
 * （編輯能力，含英文名與 StatBonusEditor）抽出共用欄位；兩邊各自的送出/取消按鈕樣式、
 * StatBonusEditor 區塊不在此共用（透過 children 插入），純呈現、不含任何計算邏輯。
 */
import { AutoResizeTextarea } from './AutoResizeTextarea';
import { ABILITY_SOURCE_ORDER, RECOVERY_TYPES, type AbilitySource, type AbilityRecoveryType } from '../../services/abilityService';

const FIELD_INPUT_CLASS =
  'w-full bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500';
const FIELD_LABEL_CLASS = 'block text-[14px] text-slate-400 mb-2';

interface AbilityFormFieldsProps {
  name: string;
  onNameChange: (value: string) => void;
  namePlaceholder: string;
  /** AddPersonalAbilityModal 有原生 required 驗證，AbilityFormModal 沒有（改用送出時手動檢查） */
  nameRequired?: boolean;
  /** 不傳則不顯示英文名稱欄位 */
  nameEn?: string;
  onNameEnChange?: (value: string) => void;
  nameEnPlaceholder?: string;
  source: AbilitySource;
  onSourceChange: (value: AbilitySource) => void;
  recoveryType: AbilityRecoveryType;
  onRecoveryTypeChange: (value: AbilityRecoveryType) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  descriptionLabel: string;
  descriptionHint?: string;
  descriptionPlaceholder: string;
  descriptionMinRows?: number;
  /** 插入於描述與最大使用次數之間（如 AbilityFormModal 的「影響角色數值」勾選與 StatBonusEditor） */
  children?: React.ReactNode;
  maxUses: number;
  onMaxUsesChange: (value: number) => void;
  maxUsesLabel: string;
}

export function AbilityFormFields({
  name,
  onNameChange,
  namePlaceholder,
  nameRequired = false,
  nameEn,
  onNameEnChange,
  nameEnPlaceholder,
  source,
  onSourceChange,
  recoveryType,
  onRecoveryTypeChange,
  description,
  onDescriptionChange,
  descriptionLabel,
  descriptionHint,
  descriptionPlaceholder,
  descriptionMinRows = 4,
  children,
  maxUses,
  onMaxUsesChange,
  maxUsesLabel,
}: AbilityFormFieldsProps) {
  const showNameEn = nameEn !== undefined && onNameEnChange !== undefined;
  const showMaxUses = recoveryType !== '常駐';

  return (
    <>
      <div className={showNameEn ? 'grid grid-cols-2 gap-3' : undefined}>
        <div>
          <label className={FIELD_LABEL_CLASS}>名稱 *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            className={FIELD_INPUT_CLASS}
            placeholder={namePlaceholder}
            required={nameRequired}
            maxLength={100}
          />
        </div>
        {showNameEn && (
          <div>
            <label className={FIELD_LABEL_CLASS}>英文名稱</label>
            <input
              type="text"
              value={nameEn}
              onChange={(e) => onNameEnChange!(e.target.value)}
              className={FIELD_INPUT_CLASS}
              placeholder={nameEnPlaceholder}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={FIELD_LABEL_CLASS}>來源 *</label>
          <select
            value={source}
            onChange={(e) => onSourceChange(e.target.value as AbilitySource)}
            className={FIELD_INPUT_CLASS}
          >
            {ABILITY_SOURCE_ORDER.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={FIELD_LABEL_CLASS}>恢復類型 *</label>
          <select
            value={recoveryType}
            onChange={(e) => onRecoveryTypeChange(e.target.value as AbilityRecoveryType)}
            className={FIELD_INPUT_CLASS}
          >
            {RECOVERY_TYPES.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={FIELD_LABEL_CLASS}>
          {descriptionLabel}
          {descriptionHint && <span className="text-slate-500 ml-2 text-[12px]">{descriptionHint}</span>}
        </label>
        <AutoResizeTextarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          className={FIELD_INPUT_CLASS}
          placeholder={descriptionPlaceholder}
          minRows={descriptionMinRows}
        />
      </div>

      {children}

      {showMaxUses && (
        <div>
          <label className={FIELD_LABEL_CLASS}>
            {maxUsesLabel}
            <span className="text-slate-500 ml-2 text-[12px]">（設為 0 表示無限次）</span>
          </label>
          <input
            type="number"
            min={0}
            value={maxUses}
            onChange={(e) => onMaxUsesChange(parseInt(e.target.value, 10) || 0)}
            className={FIELD_INPUT_CLASS}
          />
        </div>
      )}
    </>
  );
}
