/**
 * CombatHPModal - 編輯當前 HP、暫時生命、最大 HP（basic+bonus）
 * 左：當前 HP；右：暫時生命。最大 HP = 基礎值 + 其他加值；basic=0 時用公式，可重置。
 */
import React, { useState, useEffect } from 'react';
import { Modal, ModalButton, ModalInput } from './ui/Modal';
import { handleValueInput } from '../utils/helpers';
import { MODAL_CONTAINER_CLASS, MODAL_BODY_TEXT_CLASS, MODAL_DESCRIPTION_CLASS, MODAL_BUTTON_CANCEL_CLASS, MODAL_BUTTON_RESET_CLASS } from '../styles/modalStyles';
import { FinalTotalRow } from './ui/FinalTotalRow';
import { BonusSourcesList } from './ui/BonusSourcesList';

export interface HpBonusSourceItem {
  label: string;
  value: number;
}

interface CombatHPModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentHP: number;
  temporaryHP: number;
  maxHpBasic: number;
  /** 加值總和（能力/物品來源 + 其他）；用於計算 effectiveMax */
  maxHpBonus: number;
  /** 加值來源明細（有則顯示「加值來源」列表，與 AC/攻擊命中一致） */
  bonusSources?: HpBonusSourceItem[];
  defaultMaxHpBasic: number;
  onSave: (current: number, temp: number, maxBasic?: number) => void;
}

export default function CombatHPModal({
  isOpen,
  onClose,
  currentHP,
  temporaryHP,
  maxHpBasic,
  maxHpBonus,
  bonusSources,
  defaultMaxHpBasic,
  onSave,
}: CombatHPModalProps) {
  const [tempCurrent, setTempCurrent] = useState('');
  const [tempTemp, setTempTemp] = useState('');
  const [tempBasic, setTempBasic] = useState('');

  const effectiveMax = maxHpBasic + maxHpBonus;

  useEffect(() => {
    if (isOpen) {
      setTempCurrent('');
      setTempTemp('');
      setTempBasic('');
    }
  }, [isOpen]);

  const handleApply = () => {
    let finalCurrent = currentHP;
    if (tempCurrent.trim()) {
      const result = handleValueInput(tempCurrent, currentHP, {
        minValue: 0,
        maxValue: effectiveMax,
        allowZero: true,
      });
      finalCurrent = result.isValid ? result.numericValue : currentHP;
    }
    finalCurrent = Math.min(finalCurrent, effectiveMax);

    let finalTemp = temporaryHP;
    if (tempTemp.trim()) {
      const result = handleValueInput(tempTemp, temporaryHP, {
        minValue: 0,
        allowZero: true,
      });
      finalTemp = result.isValid ? result.numericValue : temporaryHP;
    }

    let maxBasicOut: number | undefined;
    if (tempBasic.trim()) {
      const result = handleValueInput(tempBasic, maxHpBasic, {
        minValue: 1,
        allowZero: false,
      });
      if (result.isValid) maxBasicOut = result.numericValue;
    }

    onSave(finalCurrent, finalTemp, maxBasicOut);
    onClose();
  };

  const handleReset = () => {
    setTempBasic(defaultMaxHpBasic.toString());
    onSave(currentHP, temporaryHP, 0);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="修改 HP" size="sm">
      <div className={MODAL_CONTAINER_CLASS}>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <span className={`${MODAL_BODY_TEXT_CLASS} block mb-1.5 font-black uppercase tracking-wider text-slate-500`}>當前 HP</span>
            <ModalInput
              value={tempCurrent}
              onChange={setTempCurrent}
              placeholder={currentHP.toString()}
              className="text-2xl font-mono text-center w-full"
              autoFocus
            />
          </div>
          <div>
            <span className={`${MODAL_BODY_TEXT_CLASS} block mb-1.5 font-black uppercase tracking-wider text-slate-500`}>暫時生命</span>
            <ModalInput
              value={tempTemp}
              onChange={setTempTemp}
              placeholder={temporaryHP.toString()}
              className="text-2xl font-mono text-center w-full"
            />
          </div>
        </div>

        <p className={`${MODAL_DESCRIPTION_CLASS} text-center mb-2`}>最大HP = 基礎值(平均) + 其他加值</p>
        <div className="flex items-center gap-2 mb-2">
          <span className={`${MODAL_BODY_TEXT_CLASS} shrink-0`}>基礎值</span>
          <ModalInput
            value={tempBasic}
            onChange={setTempBasic}
            placeholder={maxHpBasic.toString()}
            className="text-2xl font-mono flex-1"
          />
        </div>
        {bonusSources && bonusSources.length > 0 ? (
          <div className="mb-3">
            <BonusSourcesList title="加值來源" sources={bonusSources} />
            <FinalTotalRow label="總計" value={effectiveMax} className="mt-1.5" />
          </div>
        ) : (
          <div className={`${MODAL_BODY_TEXT_CLASS} space-y-0.5 mb-2`}>
            <div>其他加值 {maxHpBonus >= 0 ? '+' : ''}{maxHpBonus}</div>
            <FinalTotalRow label="總計" value={effectiveMax} />
          </div>
        )}

        <div className="flex flex-wrap gap-2 mt-4">
          <ModalButton
            variant="secondary"
            className={MODAL_BUTTON_RESET_CLASS}
            onClick={handleReset}
          >
            重置
          </ModalButton>
          <ModalButton
            variant="secondary"
            className={MODAL_BUTTON_CANCEL_CLASS}
            onClick={() => {
              setTempCurrent('');
              setTempTemp('');
              setTempBasic('');
              onClose();
            }}
          >
            取消
          </ModalButton>
          <ModalButton variant="primary" onClick={handleApply}>
            套用
          </ModalButton>
        </div>
      </div>
    </Modal>
  );
}
