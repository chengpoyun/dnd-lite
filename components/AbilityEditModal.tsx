import React, { useEffect, useMemo, useState } from 'react';
import { Modal, ModalButton, ModalInput } from './ui/Modal';
import { ModalSaveButton } from './ui/ModalSaveButton';
import { LoadingOverlay } from './ui/LoadingOverlay';
import { FinalTotalRow } from './ui/FinalTotalRow';
import { SegmentBar, type SegmentBarOption } from './ui/SegmentBar';
import {
  MODAL_CONTAINER_CLASS,
  MODAL_BODY_TEXT_CLASS,
  MODAL_DESCRIPTION_CLASS,
  MODAL_BUTTON_CANCEL_CLASS,
  MODAL_BUTTON_RESET_CLASS,
  MODAL_FOOTER_BUTTONS_CLASS,
} from '../styles/modalStyles';
import { getModifier, getProfBonus } from '../utils/helpers';
import type { AbilityKey } from '../utils/characterAttributes';

interface BonusSource {
  label: string;
  value: number;
}

interface AbilityEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  abilityKey: AbilityKey;
  abilityLabel: string;
  /** 能力值基礎（可編輯） */
  scoreBasic: number;
  /** 能力值加值來源列表（唯讀，顯示用） */
  scoreBonusSources: BonusSource[];
  /** 調整值加值來源列表（唯讀，顯示用） */
  modifierBonusSources: BonusSource[];
  /** 豁免加值來源列表（唯讀，顯示用） */
  saveBonusSources: BonusSource[];
  /** 是否擁有該屬性的豁免熟練 */
  isSaveProficient: boolean;
  /** 角色等級（計算熟練加值用） */
  level: number;
  /** 只回傳使用者可編輯的基礎值與熟練狀態，可回傳 Promise */
  onSave: (nextScoreBasic: number, nextIsSaveProficient: boolean) => void | Promise<void>;
}

export const AbilityEditModal: React.FC<AbilityEditModalProps> = ({
  isOpen,
  onClose,
  abilityKey,
  abilityLabel,
  scoreBasic,
  scoreBonusSources,
  modifierBonusSources,
  saveBonusSources,
  isSaveProficient,
  level,
  onSave,
}) => {
  const [localScore, setLocalScore] = useState<string>(scoreBasic.toString());
  const [localSaveProf, setLocalSaveProf] = useState<boolean>(isSaveProficient);

  useEffect(() => {
    if (isOpen) {
      setLocalScore(scoreBasic.toString());
      setLocalSaveProf(isSaveProficient);
    }
  }, [isOpen, scoreBasic, isSaveProficient]);

  const {
    safeScore,
    finalScore,
    abilityModBasic,
    finalModifier,
    saveBasic,
    finalSave,
    totalScoreBonus,
    totalModifierBonus,
    totalSaveBonus,
  } = useMemo(() => {
    const parsed = parseInt(localScore, 10);
    const safeScoreValue = Number.isFinite(parsed) ? parsed : scoreBasic;

    const scoreBonusTotal = scoreBonusSources.reduce(
      (sum, b) => sum + (Number.isFinite(b.value) ? b.value : 0),
      0,
    );
    const modifierBonusTotal = modifierBonusSources.reduce(
      (sum, b) => sum + (Number.isFinite(b.value) ? b.value : 0),
      0,
    );
    const saveBonusTotal = saveBonusSources.reduce(
      (sum, b) => sum + (Number.isFinite(b.value) ? b.value : 0),
      0,
    );

    const abilityFinalScore = safeScoreValue + scoreBonusTotal;
    const abilityMod = getModifier(abilityFinalScore);
    const modifierFinal = abilityMod + modifierBonusTotal;

    const prof = getProfBonus(level || 1);
    const saveBasicValue = modifierFinal + (localSaveProf ? prof : 0);
    const saveFinal = saveBasicValue + saveBonusTotal;

    return {
      safeScore: safeScoreValue,
      finalScore: abilityFinalScore,
      abilityModBasic: abilityMod,
      finalModifier: modifierFinal,
      saveBasic: saveBasicValue,
      finalSave: saveFinal,
      totalScoreBonus: scoreBonusTotal,
      totalModifierBonus: modifierBonusTotal,
      totalSaveBonus: saveBonusTotal,
    };
  }, [
    localScore,
    localSaveProf,
    scoreBasic,
    scoreBonusSources,
    modifierBonusSources,
    saveBonusSources,
    level,
  ]);

  const handleReset = () => {
    // 預設：能力值 10、豁免無熟練
    setLocalScore('10');
    setLocalSaveProf(false);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    const parsed = parseInt(localScore, 10);
    if (!Number.isFinite(parsed)) {
      return;
    }
    setIsSubmitting(true);
    try {
      await Promise.resolve(onSave(parsed, localSaveProf));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${abilityLabel} ${abilityKey.toUpperCase()}`}
      size="sm"
      disableBackdropClose={isSubmitting}
    >
      <div className={`${MODAL_CONTAINER_CLASS} relative`}>
        <LoadingOverlay visible={isSubmitting} />
        {/* 能力值區塊 */}
        <section className="mb-4 space-y-2">
          <h3 className={`${MODAL_BODY_TEXT_CLASS} font-bold text-slate-200`}>
            能力值
          </h3>
          <div className="flex items-center gap-2">
            <span className={`${MODAL_BODY_TEXT_CLASS} shrink-0`}>基礎值</span>
            <ModalInput
              value={localScore}
              onChange={setLocalScore}
              placeholder={scoreBasic.toString()}
              className="text-2xl font-mono flex-1"
            />
          </div>
          {scoreBonusSources.length > 0 && (
            <div className={`${MODAL_BODY_TEXT_CLASS} text-sm space-y-0.5`}>
              {scoreBonusSources.map((b) => (
                <div
                  key={b.label}
                  className="flex items-center justify-between"
                >
                  <span className="truncate">{b.label}</span>
                  <span
                    className={
                      b.value >= 0
                        ? 'text-emerald-400 font-mono'
                        : 'text-rose-400 font-mono'
                    }
                  >
                    {b.value >= 0 ? '+' : ''}
                    {b.value}
                  </span>
                </div>
              ))}
            </div>
          )}
          <FinalTotalRow label="最終屬性值" value={finalScore} />
        </section>

        {/* 屬性調整值區塊 */}
        <section className="mb-4 space-y-2">
          <h3 className={`${MODAL_BODY_TEXT_CLASS} font-bold text-slate-200`}>
            屬性調整值
          </h3>
          <div className="flex items-center justify-between">
            <span className={MODAL_BODY_TEXT_CLASS}>基礎調整值</span>
            <span className="text-lg font-mono font-bold text-amber-400">
              {abilityModBasic >= 0 ? '+' : ''}
              {abilityModBasic}
            </span>
          </div>
          {modifierBonusSources.length > 0 && (
            <div className={`${MODAL_BODY_TEXT_CLASS} text-sm space-y-0.5`}>
              {modifierBonusSources.map((b) => (
                <div
                  key={b.label}
                  className="flex items-center justify-between"
                >
                  <span className="truncate">{b.label}</span>
                  <span
                    className={
                      b.value >= 0
                        ? 'text-emerald-400 font-mono'
                        : 'text-rose-400 font-mono'
                    }
                  >
                    {b.value >= 0 ? '+' : ''}
                    {b.value}
                  </span>
                </div>
              ))}
            </div>
          )}
          <FinalTotalRow label="最終調整值" value={finalModifier} />
        </section>

        {/* 豁免區塊 */}
        <section className="mb-5 space-y-2">
          <h3 className={`${MODAL_BODY_TEXT_CLASS} font-bold text-slate-200`}>
            豁免
          </h3>
          <div className="mb-2">
            <SegmentBar<'none' | 'prof'>
              options={
                [
                  { value: 'none', label: '無' },
                  { value: 'prof', label: '熟練' },
                ] as SegmentBarOption<'none' | 'prof'>[]
              }
              value={localSaveProf ? 'prof' : 'none'}
              onChange={(v) => setLocalSaveProf(v === 'prof')}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className={MODAL_BODY_TEXT_CLASS}>基礎豁免</span>
            <span className="text-lg font-mono font-bold text-amber-400">
              {saveBasic >= 0 ? '+' : ''}
              {saveBasic}
            </span>
          </div>

          {saveBonusSources.length > 0 && (
            <div className={`${MODAL_BODY_TEXT_CLASS} text-sm space-y-0.5`}>
              {saveBonusSources.map((b) => (
                <div
                  key={b.label}
                  className="flex items-center justify-between"
                >
                  <span className="truncate">{b.label}</span>
                  <span
                    className={
                      b.value >= 0
                        ? 'text-emerald-400 font-mono'
                        : 'text-rose-400 font-mono'
                    }
                  >
                    {b.value >= 0 ? '+' : ''}
                    {b.value}
                  </span>
                </div>
              ))}
            </div>
          )}

          <FinalTotalRow label="最終豁免" value={finalSave} />
        </section>

        <div className={MODAL_FOOTER_BUTTONS_CLASS}>
          <ModalButton
            variant="secondary"
            className={MODAL_BUTTON_RESET_CLASS}
            onClick={handleReset}
            disabled={isSubmitting}
          >
            重置
          </ModalButton>
          <ModalButton
            variant="secondary"
            className={MODAL_BUTTON_CANCEL_CLASS}
            onClick={onClose}
            disabled={isSubmitting}
          >
            取消
          </ModalButton>
          <ModalSaveButton type="button" onClick={handleSave} loading={isSubmitting}>
            儲存
          </ModalSaveButton>
        </div>
      </div>
    </Modal>
  );
};

