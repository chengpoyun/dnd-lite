/**
 * AcquireQuantityModal - 「獲得物品」點下獲得後，詢問獲得數量
 * 只有 MH素材（isMaterial）才顯示套用組織倍數開關；其他類別只問數量
 */

import React, { useEffect, useState } from 'react';
import { Modal } from './ui/Modal';
import { ModalSaveButton } from './ui/ModalSaveButton';
import { QuantityWithMultiplierField } from './ui/QuantityWithMultiplierField';
import { resolveFinalQuantity } from '../utils/quantityMultiplier';
import { MODAL_CONTAINER_CLASS } from '../styles/modalStyles';

interface AcquireQuantityModalProps {
  isOpen: boolean;
  itemName: string;
  isMaterial: boolean;
  gatherMultiplier?: number;
  onCancel: () => void;
  onConfirm: (quantity: number) => Promise<void>;
}

export const AcquireQuantityModal: React.FC<AcquireQuantityModalProps> = ({
  isOpen,
  itemName,
  isMaterial,
  gatherMultiplier = 1,
  onCancel,
  onConfirm,
}) => {
  const [quantity, setQuantity] = useState('1');
  const [applyMultiplier, setApplyMultiplier] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setQuantity('1');
      setApplyMultiplier(true);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const effectiveMultiplier = isMaterial ? gatherMultiplier : 1;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      const finalQuantity = resolveFinalQuantity(quantity, effectiveMultiplier, applyMultiplier);
      await onConfirm(finalQuantity);
    } catch (error) {
      console.error('獲得數量確認失敗:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onCancel} size="sm" disableBackdropClose={isSubmitting}>
      <div className={MODAL_CONTAINER_CLASS}>
        <h2 className="text-lg font-bold text-amber-500 mb-3">獲得數量・{itemName}</h2>
        <QuantityWithMultiplierField
          id="acquire-quantity"
          quantity={quantity}
          onQuantityChange={setQuantity}
          gatherMultiplier={effectiveMultiplier}
          applyMultiplier={applyMultiplier}
          onApplyMultiplierChange={setApplyMultiplier}
        />
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 px-6 py-3 rounded-lg bg-slate-700 text-slate-300 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            取消
          </button>
          <ModalSaveButton
            loading={isSubmitting}
            onClick={handleConfirm}
            className="flex-1 px-6 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold"
          >
            確定
          </ModalSaveButton>
        </div>
      </div>
    </Modal>
  );
};
