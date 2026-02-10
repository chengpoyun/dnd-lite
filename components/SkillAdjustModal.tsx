import React, { useMemo, useState } from 'react';
import { Button } from './ui';
import { SkillProficiencySegmentBar, type SkillProficiencyLevel } from './ui/SkillProficiencySegmentBar';
import { SkillBonusBreakdown } from './ui/SkillBonusBreakdown';
import { getProfBonus } from '../utils/helpers';
import { MODAL_BUTTON_RESET_CLASS } from '../styles/modalStyles';

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
  /** 其他加值總和（例如來自 extraData.skillBonuses） */
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

  const bonusSources =
    miscBonus !== 0
      ? [
          {
            label: '其他加值',
            value: miscBonus,
          },
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
    <div className="fixed inset-0 z-[120] flex items-center justify-center px-6">
      <div
        className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-slate-900 border border-slate-700 w-full max-w-xs rounded-2xl p-3 shadow-2xl animate-in fade-in zoom-in duration-150">
        <div className="text-center mb-5">
          <h3 className="text-xl font-fantasy text-amber-500 mb-1">{skillName}</h3>
          <p className="text-[15px] text-slate-500 font-black uppercase tracking-widest">
            屬性：{abilityLabel}
          </p>
        </div>

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

        <div className="flex gap-2 pt-4">
          <Button
            variant="secondary"
            className={`flex-1 ${MODAL_BUTTON_RESET_CLASS}`}
            onClick={handleReset}
          >
            重置
          </Button>
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            取消
          </Button>
          <Button variant="primary" className="flex-1" onClick={handleSave}>
            儲存
          </Button>
        </div>
      </div>
    </div>
  );
};

