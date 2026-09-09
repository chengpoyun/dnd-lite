import React, { useMemo, useState } from 'react';
import { Modal, ModalButton } from './ui/Modal';
import { ModalSaveButton } from './ui/ModalSaveButton';
import { LoadingOverlay } from './ui/LoadingOverlay';
import { SkillProficiencySegmentBar, type SkillProficiencyLevel } from './ui/SkillProficiencySegmentBar';
import { SkillBonusBreakdown } from './ui/SkillBonusBreakdown';
import { getProfBonus } from '../utils/helpers';
import {
  MODAL_BUTTON_RESET_CLASS,
  MODAL_BUTTON_CANCEL_CLASS,
  MODAL_BUTTON_APPLY_AMBER_CLASS,
  MODAL_FOOTER_BUTTONS_CLASS,
  MODAL_SUBTITLE_CLASS,
} from '../styles/modalStyles';

interface SkillAdjustModalProps {
  isOpen: boolean;
  skillName: string;
  /** 顯示在標題與說明中的屬性名稱，例如「敏捷」 */
  abilityLabel: string;
  /** 該屬性的最終調整值（已含 abilityBonuses + modifierBonuses） */
  abilityModifier: number;
  /** 角色等級，用於計算熟練加值 */
  characterLevel: number;
  /** 目前資料中的熟練度 0/1/2 */
  currentProfLevel: SkillProficiencyLevel;
  /** 資料中已儲存的基礎值覆寫；沒有則為 null */
  overrideBasic: number | null;
  /** 其他加值來源列表（顯示能力／物品名稱與加值；hideValue 時僅顯示 label，如優劣勢來源） */
  skillBonusSources: { label: string; value: number; hideValue?: boolean }[];
  /** 其他加值總和（來自 extraData.skillBonuses，用於最終總計） */
  miscBonus: number;
  onClose: () => void;
  onSave: (nextProfLevel: SkillProficiencyLevel, nextOverrideBasic: number | null) => void | Promise<void>;
}

export const SkillAdjustModal: React.FC<SkillAdjustModalProps> = ({
  isOpen,
  skillName,
  abilityLabel,
  abilityModifier,
  characterLevel,
  currentProfLevel,
  overrideBasic,
  skillBonusSources,
  miscBonus,
  onClose,
  onSave,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const profBonusForLevel = useMemo(() => getProfBonus(characterLevel), [characterLevel]);

  // 「基礎值」永遠只代表屬性調整值本身，不論目前熟練度為何、也不論是第一次開啟還是重新開啟；
  // 熟練/專精加值一律另外顯示成獨立的加值來源列，跟著目前選擇的熟練度即時反映（見下方 profSupplementValue）
  const naturalBasic = abilityModifier;
  const initialBasic = typeof overrideBasic === 'number' ? overrideBasic : naturalBasic;

  const [localProfLevel, setLocalProfLevel] = useState<SkillProficiencyLevel>(currentProfLevel);
  const [basicInput, setBasicInput] = useState<string>(initialBasic.toString());
  // 追蹤使用者是否手動編輯過「基礎值」（含已有覆寫值時，一開始就視為手動）；
  // 手動編輯後，切換熟練度不再顯示/疊加熟練加值，完全以使用者輸入的數字為準
  const [basicManuallyEdited, setBasicManuallyEdited] = useState<boolean>(
    typeof overrideBasic === 'number',
  );

  if (!isOpen) return null;

  const parsedBasic = parseInt(basicInput, 10);
  const safeBasic = Number.isFinite(parsedBasic) ? parsedBasic : naturalBasic;
  // 熟練/專精加值：跟著目前選擇的熟練度即時反映，不論是重新開啟彈窗時的初始值還是互動切換的結果；
  // 一旦手動編輯過基礎值（或本來就是覆寫值），使用者輸入的數字自己說了算，不再顯示/疊加這筆加值
  const profSupplementValue = basicManuallyEdited ? 0 : localProfLevel * profBonusForLevel;
  const finalTotal = safeBasic + profSupplementValue + miscBonus;

  const profSupplementLabel = localProfLevel === 2 ? '專精加值' : '熟練加值';
  const bonusSources = [
    ...skillBonusSources,
    ...(profSupplementValue !== 0 ? [{ label: profSupplementLabel, value: profSupplementValue }] : []),
  ];

  const description = `基礎值為 ${abilityLabel} 調整值；熟練/專精加值另外列在下方`;

  const handleReset = () => {
    setBasicInput(naturalBasic.toString());
    setBasicManuallyEdited(false);
  };

  const handleBasicChange = (value: string) => {
    setBasicInput(value);
    setBasicManuallyEdited(true);
  };

  const handleSave = async () => {
    const nextParsed = parseInt(basicInput, 10);
    const nextOverride =
      basicManuallyEdited && Number.isFinite(nextParsed) && nextParsed !== naturalBasic
        ? (nextParsed as number)
        : null;

    setIsSubmitting(true);
    try {
      await Promise.resolve(onSave(localProfLevel, nextOverride));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={skillName} size="xs" disableBackdropClose={isSubmitting}>
      <div className="relative">
        <LoadingOverlay visible={isSubmitting} />
        <p className={`${MODAL_SUBTITLE_CLASS} mb-5`}>屬性：{abilityLabel}</p>

      <SkillProficiencySegmentBar
        value={localProfLevel}
        onChange={setLocalProfLevel}
        className="mb-4"
      />

      <SkillBonusBreakdown
        basicInput={basicInput}
        onBasicChange={handleBasicChange}
        description={description}
        bonusSources={bonusSources}
        finalTotal={finalTotal}
      />

      <div className={`${MODAL_FOOTER_BUTTONS_CLASS} pt-4`}>
        <ModalButton variant="secondary" className={MODAL_BUTTON_RESET_CLASS} onClick={handleReset} disabled={isSubmitting}>
          重置
        </ModalButton>
        <ModalButton variant="secondary" className={MODAL_BUTTON_CANCEL_CLASS} onClick={onClose} disabled={isSubmitting}>
          取消
        </ModalButton>
        <ModalSaveButton type="button" onClick={handleSave} loading={isSubmitting} className={MODAL_BUTTON_APPLY_AMBER_CLASS}>
          儲存
        </ModalSaveButton>
      </div>
      </div>
    </Modal>
  );
};

