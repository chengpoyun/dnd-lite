/**
 * RestOptionsModal - 選擇休息方式（短休 / 長休 / 取消）
 */
import { Modal, ModalButton } from './ui/Modal';
import { MODAL_CONTAINER_CLASS, MODAL_BUTTON_CANCEL_CLASS } from '../styles/modalStyles';

interface RestOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChooseShortRest: () => void;
  onChooseLongRest: () => void;
}

export default function RestOptionsModal({
  isOpen,
  onClose,
  onChooseShortRest,
  onChooseLongRest,
}: RestOptionsModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="選擇休息方式" size="sm">
      <div className={`${MODAL_CONTAINER_CLASS} space-y-4`}>
        <button
          type="button"
          onClick={onChooseShortRest}
          className="w-full bg-slate-800 border border-slate-700 p-5 rounded-2xl flex items-center gap-4 group active:bg-slate-700"
        >
          <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center text-2xl">🔥</div>
          <div className="text-left">
            <div className="text-[16px] font-bold text-amber-500">短休 (Short Rest)</div>
            <div className="text-[16px] text-slate-500 font-bold uppercase">恢復部分資源與擲骰療傷</div>
          </div>
        </button>
        <button
          type="button"
          onClick={onChooseLongRest}
          className="w-full bg-indigo-950/30 border border-indigo-500/30 p-5 rounded-2xl flex items-center gap-4 group active:bg-indigo-900/40"
        >
          <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center text-2xl">💤</div>
          <div className="text-left">
            <div className="text-[16px] font-bold text-indigo-400">長休 (Long Rest)</div>
            <div className="text-[16px] text-slate-500 font-bold uppercase">完全恢復 HP 與所有資源</div>
          </div>
        </button>
        <ModalButton variant="secondary" className={`${MODAL_BUTTON_CANCEL_CLASS} w-full`} onClick={onClose}>
          取消
        </ModalButton>
      </div>
    </Modal>
  );
}
