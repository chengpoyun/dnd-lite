/**
 * AddPersonalAbilityModal - 新增個人能力（只存在於該角色，不寫入 abilities）
 * 必填：名稱、來源、恢復類型；選填：描述、最大使用次數
 */

import React, { useEffect, useState } from 'react';
import { Modal } from './ui/Modal';
import { ModalSaveButton } from './ui/ModalSaveButton';
import { LoadingOverlay } from './ui/LoadingOverlay';
import { AbilityFormFields } from './ui/AbilityFormFields';
import type { AbilitySource, AbilityRecoveryType, CreateCharacterAbilityData } from '../services/abilityService';
import { MODAL_CONTAINER_CLASS } from '../styles/modalStyles';

interface AddPersonalAbilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCharacterAbilityData) => Promise<void>;
  /** 預填名稱（例如從獲得能力搜尋欄帶入） */
  initialName?: string;
}

export const AddPersonalAbilityModal: React.FC<AddPersonalAbilityModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialName,
}) => {
  const [name, setName] = useState('');
  const [source, setSource] = useState<AbilitySource>('職業');
  const [recoveryType, setRecoveryType] = useState<AbilityRecoveryType>('常駐');
  const [description, setDescription] = useState('');
  const [maxUses, setMaxUses] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(initialName ?? '');
      setSource('職業');
      setRecoveryType('常駐');
      setDescription('');
      setMaxUses(1);
      setIsSubmitting(false);
    }
  }, [isOpen, initialName]);

  useEffect(() => {
    if (recoveryType === '常駐') {
      setMaxUses(0);
    }
  }, [recoveryType]);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        name_en: "",
        source,
        recovery_type: recoveryType,
        description: description.trim() || undefined,
        max_uses: maxUses,
      });
      onClose();
    } catch (error) {
      console.error('新增個人能力失敗:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" disableBackdropClose={isSubmitting}>
      <div className={`${MODAL_CONTAINER_CLASS} relative`}>
        <LoadingOverlay visible={isSubmitting} />
        <form onSubmit={handleSubmit} className="space-y-3">
          <AbilityFormFields
            name={name}
            onNameChange={setName}
            namePlaceholder="輸入能力名稱"
            nameRequired
            source={source}
            onSourceChange={setSource}
            recoveryType={recoveryType}
            onRecoveryTypeChange={setRecoveryType}
            description={description}
            onDescriptionChange={setDescription}
            descriptionLabel="描述（選填）"
            descriptionPlaceholder="輸入能力描述"
            maxUses={maxUses}
            onMaxUsesChange={setMaxUses}
            maxUsesLabel="最大使用次數（選填）"
          />
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 rounded-lg bg-slate-700 text-slate-300 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              取消
            </button>
            <ModalSaveButton
              type="submit"
              loading={isSubmitting}
              className="flex-1 px-6 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold"
            >
              新增
            </ModalSaveButton>
          </div>
        </form>
      </div>
    </Modal>
  );
};
