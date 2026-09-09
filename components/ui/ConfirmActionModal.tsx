/**
 * ConfirmActionModal - 通用「標題＋說明文字＋取消/確認」二擇一確認彈窗
 * 從 EndCombatConfirmModal / LongRestConfirmModal / PortentUseConfirmModal 抽出：
 * 三者結構逐字相同，只有標題、說明文字與按鈕文字/樣式不同。
 */
import { Modal, ModalButton } from './Modal';
import { MODAL_CONTAINER_CLASS, MODAL_BUTTON_CANCEL_CLASS, MODAL_FOOTER_BUTTONS_CLASS, MODAL_DESCRIPTION_CLASS } from '../../styles/modalStyles';

interface ConfirmActionModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  /** 取消按鈕文字，預設「取消」 */
  cancelLabel?: string;
  confirmLabel: string;
  /** 確認按鈕的 variant，預設 'primary' */
  confirmVariant?: 'primary' | 'danger';
  /** 確認按鈕的額外 className（如自訂顏色），會接在 variant 樣式之後 */
  confirmClassName?: string;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ConfirmActionModal({
  isOpen,
  title,
  message,
  cancelLabel = '取消',
  confirmLabel,
  confirmVariant = 'primary',
  confirmClassName,
  onClose,
  onConfirm,
}: ConfirmActionModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="xs">
      <div className={MODAL_CONTAINER_CLASS}>
        <p className={`${MODAL_DESCRIPTION_CLASS} text-center mb-6`}>
          {message}
        </p>
        <div className={MODAL_FOOTER_BUTTONS_CLASS}>
          <ModalButton variant="secondary" className={MODAL_BUTTON_CANCEL_CLASS} onClick={onClose}>
            {cancelLabel}
          </ModalButton>
          <ModalButton variant={confirmVariant} onClick={onConfirm} className={confirmClassName}>
            {confirmLabel}
          </ModalButton>
        </div>
      </div>
    </Modal>
  );
}
