/**
 * LongRestConfirmModal - 長休確認
 */
import ConfirmActionModal from './ui/ConfirmActionModal';
import { MODAL_BUTTON_APPLY_INDIGO_CLASS } from '../styles/modalStyles';

interface LongRestConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function LongRestConfirmModal({
  isOpen,
  onClose,
  onConfirm,
}: LongRestConfirmModalProps) {
  return (
    <ConfirmActionModal
      isOpen={isOpen}
      title="確定要長休？"
      message="這將完全恢復 HP、重置所有法術位與職業資源。"
      cancelLabel="返回"
      confirmLabel="確認長休"
      confirmClassName={MODAL_BUTTON_APPLY_INDIGO_CLASS}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}
