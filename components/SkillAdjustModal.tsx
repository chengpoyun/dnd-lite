import React, { useMemo, useState } from 'react';
import { Modal, ModalButton } from './ui/Modal';
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
  /** 其他加值來源列表（顯示能力／物品名稱與加值）；總和會與 miscBonus 一致，或 miscBonus 為其加總 */
  skillBonusSources: { label: string; value: number }[];
  /** 其他加值總和（來自 extraData.skillBonuses，用於最終總計） */
  miscBonus: number;
  onClose: () => void;
  onSave: (nextProfLevel: SkillProficiencyLevel, nextOverrideBasic: number | null) => void;
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
  const profBonusForLevel = useMemo(() => getProfBonus(characterLevel), [characterLevel]);

  const computeDefaultBasic = (profLevel: SkillProficiencyLevel) =>
    abilityModifier + profLevel * profBonusForLevel;

  const initialDefaultBasic = computeDefaultBasic(currentProfLevel);
  const initialBasic = typeof overrideBasic === 'number' ? overrideBasic : initialDefaultBasic;

  const [localProfLevel, setLocalProfLevel] = useState<SkillProficiencyLevel>(currentProfLevel);
  const [basicInput, setBasicInput] = useState<string>(initialBasic.toString());
  const [basicManuallyEdited, setBasicManuallyEdited] = useState<boolean>(
    typeof overrideBasic === 'number',
  );

  if (!isOpen) return null;

  const parsedBasic = parseInt(basicInput, 10);
  const defaultBasicForLocalProf = computeDefaultBasic(localProfLevel);
  const safeBasic = Number.isFinite(parsedBasic) ? parsedBasic : defaultBasicForLocalProf;
  const finalTotal = safeBasic + miscBonus;

  const sumNamed = skillBonusSources.reduce((s, b) => s + b.value, 0);
  const bonusSources =
    skillBonusSources.length > 0 || miscBonus !== 0
      ? [
          ...skillBonusSources,
          ...(miscBonus !== sumNamed && miscBonus - sumNamed !== 0
            ? [{ label: '其他加值', value: miscBonus - sumNamed }]
            : []),
        ]
      : [];

  const description = `基礎值為 ${abilityLabel} 調整值 + 熟練/專精加值 + 調整值加成`;

  const handleReset = () => {
    const nextDefault = computeDefaultBasic(localProfLevel);
    setBasicInput(nextDefault.toString());
    setBasicManuallyEdited(false);
  };

  const handleSave = () => {
    const nextParsed = parseInt(basicInput, 10);
    const hasValidOverride = Number.isFinite(nextParsed);
    const defaultForProf = computeDefaultBasic(localProfLevel);
    const nextOverride =
      hasValidOverride && nextParsed !== defaultForProf ? (nextParsed as number) : null;

    onSave(localProfLevel, nextOverride);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={skillName} size="xs">
      <p className={`${MODAL_SUBTITLE_CLASS} mb-5`}>屬性：{abilityLabel}</p>

      <SkillProficiencySegmentBar
        value={localProfLevel}
        onChange={(level) => {
          setLocalProfLevel(level);

          if (!basicManuallyEdited) {
            const nextDefault = computeDefaultBasic(level);
            setBasicInput(nextDefault.toString());
          }
        }}
        className="mb-4"
      />

      <SkillBonusBreakdown
        basicInput={basicInput}
        onBasicChange={(value) => {
          setBasicInput(value);
          setBasicManuallyEdited(true);
        }}
        description={description}
        bonusSources={bonusSources}
        finalTotal={finalTotal}
      />

      <div className={`${MODAL_FOOTER_BUTTONS_CLASS} pt-4`}>
        <ModalButton variant="secondary" className={MODAL_BUTTON_RESET_CLASS} onClick={handleReset}>
          重置
        </ModalButton>
        <ModalButton variant="secondary" className={MODAL_BUTTON_CANCEL_CLASS} onClick={onClose}>
          取消
        </ModalButton>
        <ModalButton variant="primary" onClick={handleSave} className={MODAL_BUTTON_APPLY_AMBER_CLASS}>
          儲存
        </ModalButton>
      </div>
    </Modal>
  );
};

