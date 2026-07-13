/**
 * DecorationSocketModal - 插槽鑲嵌流程（選素材 → 設定效果 → 確認鑲嵌）與已鑲嵌插槽的檢視／移除
 * 素材鑲嵌後會被消耗（quantity -1 或刪除），移除鑲嵌後效果永久消失，兩者皆需二次確認。
 */

import React, { useEffect, useState } from 'react';
import { Modal, ModalButton } from './ui/Modal';
import { AutoResizeTextarea } from './ui/AutoResizeTextarea';
import {
  MODAL_CONTAINER_CLASS,
  MODAL_FOOTER_BUTTONS_CLASS,
  MODAL_BUTTON_APPLY_AMBER_CLASS,
  MODAL_BUTTON_CANCEL_CLASS,
  MODAL_BUTTON_DELETE_CONFIRM_CLASS,
  MODAL_LABEL_BLOCK_CLASS,
} from '../styles/modalStyles';
import { StatBonusEditor, summarizeStatBonusEditorValue, type StatBonusEditorValue } from './StatBonusEditor';
import { getDisplayValues, type CharacterItem } from '../services/itemService';

interface DecorationSocketModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** 正在操作插槽的裝備（武器／護甲） */
  targetItem: CharacterItem | null;
  slotIndex: number | null;
  /** 角色所有物品，用來篩選可鑲入的 MH 素材 */
  allItems: CharacterItem[];
  /** 鑲嵌：選定素材＋效果後呼叫，成功時回傳 true（由呼叫端負責寫入 DB、reload、關閉本 modal） */
  onSocket: (materialItemId: string, note: string, statBonuses: StatBonusEditorValue | undefined) => Promise<boolean>;
  /** 移除已鑲嵌素材，成功時回傳 true */
  onRemove: () => Promise<boolean>;
  /** 編輯已鑲嵌插槽的效果（不消耗素材、不需二次確認），成功時回傳 true */
  onUpdateEffect: (note: string, statBonuses: StatBonusEditorValue | undefined) => Promise<boolean>;
}

type Step = 'pick' | 'effect' | 'confirmSocket' | 'view' | 'confirmRemove' | 'editEffect';

export const DecorationSocketModal: React.FC<DecorationSocketModalProps> = ({
  isOpen,
  onClose,
  targetItem,
  slotIndex,
  allItems,
  onSocket,
  onRemove,
  onUpdateEffect,
}) => {
  const socket = targetItem && slotIndex != null ? targetItem.sockets?.[slotIndex] ?? null : null;

  const [step, setStep] = useState<Step>('pick');
  const [selectedMaterial, setSelectedMaterial] = useState<CharacterItem | null>(null);
  const [note, setNote] = useState('');
  const [hasBonus, setHasBonus] = useState(false);
  const [bonus, setBonus] = useState<StatBonusEditorValue>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedMaterial(null);
    setNote('');
    setHasBonus(false);
    setBonus({});
    setIsSubmitting(false);
    setStep(socket ? 'view' : 'pick');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, slotIndex, targetItem?.id]);

  if (!targetItem || slotIndex == null) return null;

  const targetKind = targetItem.equipment_kind_override ?? targetItem.item?.equipment_kind ?? null;
  const isWeapon = targetKind === 'melee_weapon' || targetKind === 'ranged_weapon';

  const candidates = allItems.filter((ci) => {
    const d = getDisplayValues(ci);
    if (d.displayCategory !== 'MH素材') return false;
    if (ci.quantity <= 0) return false;
    return isWeapon ? d.displayWeaponDecoration : d.displayArmorDecoration;
  });

  const pickMaterial = (m: CharacterItem) => {
    const d = getDisplayValues(m);
    const existingBonus = m.stat_bonuses as StatBonusEditorValue | undefined;
    const existingHasBonus = !!existingBonus && Object.keys(existingBonus).length > 0;
    setSelectedMaterial(m);
    setNote(d.displayDescription || '');
    setHasBonus(existingHasBonus);
    setBonus(existingHasBonus ? (existingBonus as StatBonusEditorValue) : {});
    setStep('effect');
  };

  const handleConfirmSocket = async () => {
    if (!selectedMaterial) return;
    setIsSubmitting(true);
    try {
      const ok = await onSocket(selectedMaterial.id, note.trim(), hasBonus ? bonus : undefined);
      if (ok) onClose();
      else setStep('effect');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditEffect = () => {
    if (!socket) return;
    const existingBonus = socket.stat_bonuses as StatBonusEditorValue | undefined;
    const existingHasBonus = !!existingBonus && Object.keys(existingBonus).length > 0;
    setNote(socket.note ?? '');
    setHasBonus(existingHasBonus);
    setBonus(existingHasBonus ? existingBonus : {});
    setStep('editEffect');
  };

  const handleSaveEffect = async () => {
    setIsSubmitting(true);
    try {
      const ok = await onUpdateEffect(note.trim(), hasBonus ? bonus : undefined);
      if (ok) onClose();
      else setStep('editEffect');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmRemove = async () => {
    setIsSubmitting(true);
    try {
      const ok = await onRemove();
      if (ok) onClose();
      else setStep('view');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" disableBackdropClose={isSubmitting}>
      <div className={MODAL_CONTAINER_CLASS}>
        {step === 'pick' && (
          <>
            <p className="text-sm text-slate-400 mb-3">
              選擇要鑲嵌的素材（僅列出可鑲入{isWeapon ? '武器' : '護甲'}插槽的 MH 素材）
            </p>
            {candidates.length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">尚無可鑲嵌的素材</p>
            ) : (
              <div className="space-y-1 max-h-[55vh] overflow-y-auto -mx-1 px-1">
                {candidates.map((m) => {
                  const d = getDisplayValues(m);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => pickMaterial(m)}
                      className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-slate-700/50 text-left transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-200 truncate">
                          {d.displayName} <span className="text-slate-500">×{m.quantity}</span>
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          {d.displayDescription || '（尚未填寫效果說明）'}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            <div className={`${MODAL_FOOTER_BUTTONS_CLASS} mt-3`}>
              <ModalButton variant="secondary" className={MODAL_BUTTON_CANCEL_CLASS} onClick={onClose}>
                取消
              </ModalButton>
            </div>
          </>
        )}

        {step === 'effect' && selectedMaterial && (
          <>
            <p className="text-sm text-slate-400 mb-3">
              設定「{getDisplayValues(selectedMaterial).displayName}」的效果（會存回此素材，之後同一疊素材會直接帶入）
            </p>
            <div className="space-y-1 mb-3">
              <label className={MODAL_LABEL_BLOCK_CLASS}>效果說明 *</label>
              <AutoResizeTextarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                minRows={2}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                placeholder="描述鑲嵌後的效果"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-300 mb-2">
              <input
                type="checkbox"
                checked={hasBonus}
                onChange={(e) => setHasBonus(e.target.checked)}
                className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500"
              />
              同時附加數值加成（選填）
            </label>
            {hasBonus && (
              <div className="mb-3 border border-slate-800 rounded-lg p-2 bg-slate-900/60">
                <StatBonusEditor value={bonus} onChange={setBonus} />
              </div>
            )}
            <div className={MODAL_FOOTER_BUTTONS_CLASS}>
              <ModalButton variant="secondary" className={MODAL_BUTTON_CANCEL_CLASS} onClick={() => setStep('pick')}>
                返回
              </ModalButton>
              <ModalButton
                variant="primary"
                className={MODAL_BUTTON_APPLY_AMBER_CLASS}
                disabled={!note.trim()}
                onClick={() => setStep('confirmSocket')}
              >
                下一步
              </ModalButton>
            </div>
          </>
        )}

        {step === 'confirmSocket' && selectedMaterial && (
          <>
            <p className="text-base font-bold text-slate-100 mb-2">確認鑲嵌</p>
            <p className="text-sm text-slate-400 mb-4 leading-relaxed">
              「{getDisplayValues(selectedMaterial).displayName}」鑲嵌後會從道具欄消失，確定要鑲進插槽嗎？
            </p>
            <div className={MODAL_FOOTER_BUTTONS_CLASS}>
              <ModalButton
                variant="secondary"
                className={MODAL_BUTTON_CANCEL_CLASS}
                onClick={() => setStep('effect')}
                disabled={isSubmitting}
              >
                取消
              </ModalButton>
              <ModalButton
                variant="primary"
                className={MODAL_BUTTON_APPLY_AMBER_CLASS}
                onClick={handleConfirmSocket}
                disabled={isSubmitting}
              >
                {isSubmitting ? '處理中...' : '確認鑲嵌'}
              </ModalButton>
            </div>
          </>
        )}

        {step === 'view' && socket && (
          <>
            <p className="text-base font-bold text-slate-100 mb-1">{socket.decoration_name}</p>
            {socket.note && (
              <p className="text-sm text-slate-300 whitespace-pre-wrap mb-3 leading-relaxed">{socket.note}</p>
            )}
            {(() => {
              const items = summarizeStatBonusEditorValue(socket.stat_bonuses as StatBonusEditorValue | undefined);
              return items.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {items.map((it, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-emerald-900/30 border border-emerald-700/60 text-emerald-300 rounded-full text-xs font-medium"
                    >
                      {it.label} {it.text}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 mb-4">此素材沒有數值加成，純敘述效果</p>
              );
            })()}
            <div className={MODAL_FOOTER_BUTTONS_CLASS}>
              <ModalButton
                variant="danger"
                className={MODAL_BUTTON_DELETE_CONFIRM_CLASS}
                onClick={() => setStep('confirmRemove')}
              >
                移除
              </ModalButton>
              <ModalButton variant="primary" className={`${MODAL_BUTTON_APPLY_AMBER_CLASS} flex-1`} onClick={startEditEffect}>
                編輯
              </ModalButton>
              <ModalButton variant="secondary" className={MODAL_BUTTON_CANCEL_CLASS} onClick={onClose}>
                關閉
              </ModalButton>
            </div>
          </>
        )}

        {step === 'editEffect' && socket && (
          <>
            <p className="text-sm text-slate-400 mb-3">
              編輯「{socket.decoration_name}」的效果
            </p>
            <div className="space-y-1 mb-3">
              <label className={MODAL_LABEL_BLOCK_CLASS}>效果說明 *</label>
              <AutoResizeTextarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                minRows={2}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                placeholder="描述鑲嵌後的效果"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-300 mb-2">
              <input
                type="checkbox"
                checked={hasBonus}
                onChange={(e) => setHasBonus(e.target.checked)}
                className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500"
              />
              同時附加數值加成（選填）
            </label>
            {hasBonus && (
              <div className="mb-3 border border-slate-800 rounded-lg p-2 bg-slate-900/60">
                <StatBonusEditor value={bonus} onChange={setBonus} />
              </div>
            )}
            <div className={MODAL_FOOTER_BUTTONS_CLASS}>
              <ModalButton
                variant="secondary"
                className={MODAL_BUTTON_CANCEL_CLASS}
                onClick={() => setStep('view')}
                disabled={isSubmitting}
              >
                取消
              </ModalButton>
              <ModalButton
                variant="primary"
                className={MODAL_BUTTON_APPLY_AMBER_CLASS}
                disabled={!note.trim() || isSubmitting}
                onClick={handleSaveEffect}
              >
                {isSubmitting ? '儲存中...' : '儲存'}
              </ModalButton>
            </div>
          </>
        )}

        {step === 'confirmRemove' && socket && (
          <>
            <p className="text-base font-bold text-slate-100 mb-2">確認移除</p>
            <p className="text-sm text-slate-400 mb-4 leading-relaxed">
              移除「{socket.decoration_name}」後效果會永久消失，無法復原，確定要移除嗎？
            </p>
            <div className={MODAL_FOOTER_BUTTONS_CLASS}>
              <ModalButton
                variant="secondary"
                className={MODAL_BUTTON_CANCEL_CLASS}
                onClick={() => setStep('view')}
                disabled={isSubmitting}
              >
                取消
              </ModalButton>
              <ModalButton
                variant="danger"
                className={MODAL_BUTTON_DELETE_CONFIRM_CLASS}
                onClick={handleConfirmRemove}
                disabled={isSubmitting}
              >
                {isSubmitting ? '處理中...' : '確認移除'}
              </ModalButton>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
