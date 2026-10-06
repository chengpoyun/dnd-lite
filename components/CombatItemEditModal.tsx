/**
 * CombatItemEditModal - 新增/編輯職業資源或動作項目（圖示、名稱、剩餘/最大、恢復週期）
 */
import { useState, useEffect } from 'react';
import { Modal, ModalButton, ModalInput } from './ui/Modal';
import { ModalSaveButton } from './ui/ModalSaveButton';
import { LoadingOverlay } from './ui/LoadingOverlay';
import { SegmentBar } from './ui/SegmentBar';
import { setNormalValue } from '../utils/helpers';
import { DEFAULT_RECOVERY_DICE, normalizeRecoveryDice } from '../utils/recoveryDice';
import { MODAL_CONTAINER_CLASS, MODAL_BUTTON_CANCEL_CLASS, MODAL_FOOTER_BUTTONS_CLASS, MODAL_BUTTON_APPLY_INDIGO_CLASS } from '../styles/modalStyles';

export type ItemEditRecovery = 'round' | 'short' | 'long';

/** 編輯畫面上的恢復週期選項：比儲存值多一個「長休骰」（儲存時拆成 recovery: 'long' + recoveryDice） */
type RecoveryChoice = ItemEditRecovery | 'long_dice';

export interface ItemEditValues {
  name: string;
  icon: string;
  current: number;
  max: number;
  recovery: ItemEditRecovery;
  /** 長休時擲骰恢復的骰子（如 '1d6'）；只有 recovery 為 long 時有意義，沒有代表長休補滿 */
  recoveryDice?: string;
  description?: string;
}

interface CombatItemEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'add' | 'edit';
  initialValues: ItemEditValues;
  onSave: (values: ItemEditValues) => void | Promise<void>;
  /** 是否顯示描述欄位（自定義項目新增時為 true，編輯自定義項目時為 true） */
  showDescription?: boolean;
}

export default function CombatItemEditModal({
  isOpen,
  onClose,
  mode,
  initialValues,
  onSave,
  showDescription = false,
}: CombatItemEditModalProps) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('✨');
  const [current, setCurrent] = useState('1');
  const [max, setMax] = useState('1');
  const [recovery, setRecovery] = useState<RecoveryChoice>('round');
  const [recoveryDice, setRecoveryDice] = useState<string>(DEFAULT_RECOVERY_DICE);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(initialValues.name);
      setIcon(initialValues.icon);
      setCurrent(initialValues.current.toString());
      setMax(initialValues.max.toString());
      setRecovery(initialValues.recovery === 'long' && initialValues.recoveryDice ? 'long_dice' : initialValues.recovery);
      setRecoveryDice(initialValues.recoveryDice ?? DEFAULT_RECOVERY_DICE);
      setDescription(initialValues.description ?? '');
    }
  }, [isOpen, initialValues]);

  const normalizedDice = normalizeRecoveryDice(recoveryDice);
  const diceInvalid = recovery === 'long_dice' && !normalizedDice;

  const handleSave = async () => {
    if (!name.trim()) return;
    if (recovery === 'long_dice' && !normalizedDice) return;
    const currentResult = setNormalValue(current, 0, true);
    const maxResult = setNormalValue(max, 1, false);
    if (!currentResult.isValid || !maxResult.isValid) {
      onClose();
      return;
    }
    setIsSubmitting(true);
    try {
      const values: ItemEditValues = {
        name: name.trim(),
        icon,
        current: currentResult.numericValue,
        max: maxResult.numericValue,
        recovery: recovery === 'long_dice' ? 'long' : recovery,
        recoveryDice: recovery === 'long_dice' ? (normalizedDice ?? undefined) : undefined,
        description: showDescription ? description.trim() : (initialValues.description ?? ''),
      };
      await Promise.resolve(onSave(values));
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xs" disableBackdropClose={isSubmitting}>
      <div className={`${MODAL_CONTAINER_CLASS} relative`}>
        <LoadingOverlay visible={isSubmitting} />
        <h2 className="text-xl font-bold mb-5">{mode === 'edit' ? '編輯項目' : '新增項目'}</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-[64px_1fr_1fr] gap-3">
            <ModalInput
              value={icon}
              onChange={setIcon}
              placeholder="圖示"
              className="text-center text-xl"
            />
            <ModalInput
              value={name}
              onChange={setName}
              placeholder="名稱"
              className="col-span-2"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-[16px] text-slate-500 font-black block mb-1 uppercase tracking-widest text-center">剩餘次數</span>
              <ModalInput
                value={current}
                onChange={setCurrent}
                className="text-xl font-mono text-center"
              />
            </div>
            <div>
              <span className="text-[16px] text-slate-500 font-black block mb-1 uppercase tracking-widest text-center">最大</span>
              <ModalInput
                value={max}
                onChange={setMax}
                className="text-xl font-mono text-center"
              />
            </div>
          </div>
          <div className="space-y-2">
            <span className="text-[16px] text-slate-500 font-black block uppercase ml-1 tracking-widest">恢復週期</span>
            <SegmentBar<RecoveryChoice>
              value={recovery}
              onChange={setRecovery}
              options={[
                { value: 'round', label: '每回合' },
                { value: 'short', label: '短休', activeClassName: 'bg-amber-600 text-white shadow-sm' },
                { value: 'long', label: '長休', activeClassName: 'bg-indigo-600 text-white shadow-sm' },
                { value: 'long_dice', label: '長休骰', activeClassName: 'bg-indigo-600 text-white shadow-sm' },
              ]}
            />
            {recovery === 'long_dice' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[16px] text-slate-400 whitespace-nowrap">每次長休擲</span>
                  <input
                    type="text"
                    value={recoveryDice}
                    onChange={(e) => setRecoveryDice(e.target.value)}
                    placeholder="例：1d6"
                    aria-label="長休恢復骰子"
                    aria-invalid={diceInvalid}
                    autoComplete="off"
                    autoCapitalize="none"
                    className={`flex-1 min-w-0 bg-slate-800 border rounded-xl p-3 text-white text-lg font-mono outline-none ${diceInvalid ? 'border-rose-500' : 'border-slate-700'}`}
                  />
                </div>
                {diceInvalid ? (
                  <p className="text-[14px] text-rose-400 ml-1 break-words">請輸入骰子記法，例如 1d3、1d6、2d4</p>
                ) : (
                  <p className="text-[14px] text-slate-400 ml-1 break-words">每次長休恢復 {normalizedDice} 次（不會超過最大值）</p>
                )}
              </div>
            )}
          </div>
          {showDescription && (
            <div>
              <label className="text-[16px] text-slate-500 font-black block uppercase ml-1 tracking-widest mb-1">
                描述
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="選填"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white outline-none min-h-[80px] resize-y"
                aria-label="描述"
              />
            </div>
          )}
          <div className={`${MODAL_FOOTER_BUTTONS_CLASS} pt-2`}>
            <ModalButton
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
              className={MODAL_BUTTON_CANCEL_CLASS}
            >
              取消
            </ModalButton>
            <ModalSaveButton
              type="button"
              onClick={handleSave}
              loading={isSubmitting}
              disabled={diceInvalid}
              className={MODAL_BUTTON_APPLY_INDIGO_CLASS}
            >
              儲存
            </ModalSaveButton>
          </div>
        </div>
      </div>
    </Modal>
  );
}
