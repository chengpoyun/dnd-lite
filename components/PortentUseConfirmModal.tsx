/**
 * PortentUseConfirmModal - 確認使用預言骰
 */
import ConfirmActionModal from './ui/ConfirmActionModal';

interface PortentUseConfirmModalProps {
  isOpen: boolean;
  dieValue: number | null;
  onClose: () => void;
  onConfirm: () => void;
}

export default function PortentUseConfirmModal({
  isOpen,
  dieValue,
  onClose,
  onConfirm,
}: PortentUseConfirmModalProps) {
  return (
    <ConfirmActionModal
      isOpen={isOpen}
      title="確定使用預言骰？"
      message={`使用數值 ${dieValue} 的預言骰，取代一次攻擊、豁免或檢定擲骰。使用後無法復原，直到下次長休重骰。`}
      confirmLabel="確定使用"
      confirmClassName="!bg-purple-600 hover:!bg-purple-500"
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}
