/**
 * OrganizationModal - 編輯單一組織的聲望
 *
 * 只輸入聲望；階級與素材倍數由 utils/organizations.ts 即時算出，不另外儲存，
 * 避免兩份資料不同步。退出組織的確認沿用既有的 ConfirmDeleteModal。
 */
import { useEffect, useState } from 'react';
import { Modal, ModalButton, ModalInput } from './ui/Modal';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import {
  getOrgMultiplier,
  getOrgRank,
  type OrganizationDef,
} from '../utils/organizations';
import {
  MODAL_CONTAINER_CLASS,
  MODAL_BUTTON_CANCEL_CLASS,
  MODAL_FOOTER_BUTTONS_CLASS,
  MODAL_BUTTON_APPLY_INDIGO_CLASS,
} from '../styles/modalStyles';

interface OrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  def: OrganizationDef;
  reputation: number;
  onSave: (reputation: number) => void | Promise<void>;
  /** 退出組織（已確認過）。未提供時不顯示退出按鈕 */
  onLeave?: () => void | Promise<void>;
}

export default function OrganizationModal({
  isOpen,
  onClose,
  def,
  reputation,
  onSave,
  onLeave,
}: OrganizationModalProps) {
  const [draft, setDraft] = useState(String(reputation));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDraft(String(reputation));
      setConfirmLeave(false);
    }
  }, [isOpen, reputation]);

  // 預覽用：輸入無效時沿用目前聲望，讓階級/倍數不會跳成奇怪的值
  const parsed = Number.parseInt(draft.trim(), 10);
  const preview = Number.isFinite(parsed) && parsed >= 0 ? parsed : reputation;
  const rank = getOrgRank(preview, def);
  const multiplier = getOrgMultiplier(rank, def);

  const handleSave = async () => {
    const next = Number.parseInt(draft.trim(), 10);
    if (!Number.isFinite(next) || next < 0) {
      setDraft(String(reputation));
      return;
    }
    setIsSubmitting(true);
    try {
      await onSave(next);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="xs" disableBackdropClose={isSubmitting}>
        <div className={MODAL_CONTAINER_CLASS}>
          <h2 className="text-xl font-bold mb-5">{def.name}</h2>

          <div className="space-y-1">
            <span className="text-[16px] text-slate-500 font-black block uppercase tracking-widest">聲望</span>
            <ModalInput
              value={draft}
              onChange={setDraft}
              type="number"
              className="text-2xl font-mono text-center"
            />
          </div>

          {/* 階級刻度：只顯示數字與目前位置，刻意不做成按鈕樣式避免誤以為可點 */}
          <div className="flex border-t-2 border-slate-700 mt-4" aria-label={`目前階級 ${rank}`}>
            {def.thresholds.map((_, i) => {
              const step = i + 1;
              const reached = rank >= step;
              const isCurrent = rank === step;
              return (
                <div
                  key={step}
                  className={`flex-1 text-center pt-2 border-t-2 -mt-0.5 ${
                    reached ? 'border-amber-500' : 'border-transparent'
                  } ${isCurrent ? 'text-amber-500 text-lg font-black' : 'text-slate-500 text-sm font-bold'}`}
                >
                  {step}
                </div>
              );
            })}
          </div>

          <div className="flex flex-col gap-2 mt-4">
            <div className="flex items-center justify-between bg-slate-800/50 p-2 rounded border border-slate-700/50">
              <span className="text-[16px] text-slate-400">素材倍數</span>
              <span className="text-lg font-mono font-black text-amber-500">×{multiplier}</span>
            </div>
            <div className="flex items-center justify-between bg-slate-800/50 p-2 rounded border border-slate-700/50">
              <span className="text-[16px] text-slate-400">階級門檻</span>
              <span className="text-[16px] font-mono text-slate-300">{def.thresholds.join(' / ')}</span>
            </div>
          </div>

          <div className={`${MODAL_FOOTER_BUTTONS_CLASS} pt-4`}>
            {onLeave && (
              <ModalButton
                variant="secondary"
                onClick={() => setConfirmLeave(true)}
                disabled={isSubmitting}
                className={MODAL_BUTTON_CANCEL_CLASS}
              >
                退出組織
              </ModalButton>
            )}
            <ModalButton
              variant="primary"
              onClick={handleSave}
              disabled={isSubmitting}
              className={MODAL_BUTTON_APPLY_INDIGO_CLASS}
            >
              儲存
            </ModalButton>
          </div>
        </div>
      </Modal>

      {/* 退出確認沿用既有元件，樣式與角色/道具刪除一致 */}
      <ConfirmDeleteModal
        isOpen={confirmLeave}
        title="確認退出組織"
        message={`確定要退出${def.name}嗎？退出後聲望會歸零，且不會保留。`}
        confirmText="退出組織"
        onCancel={() => setConfirmLeave(false)}
        onConfirm={async () => {
          setConfirmLeave(false);
          await onLeave?.();
          onClose();
        }}
      />
    </>
  );
}
