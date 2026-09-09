/**
 * EndCombatConfirmModal - 結束戰鬥確認
 */
import ConfirmActionModal from './ui/ConfirmActionModal';

interface EndCombatConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function EndCombatConfirmModal({
  isOpen,
  onClose,
  onConfirm,
}: EndCombatConfirmModalProps) {
  return (
    <ConfirmActionModal
      isOpen={isOpen}
      title="結束戰鬥"
      message="確定要結束當前戰鬥嗎？這將重置戰鬥計時器並恢復所有每回合資源。"
      confirmLabel="結束戰鬥"
      confirmVariant="danger"
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}
