/**
 * CombatItemEditModal - 新增/編輯職業資源或動作項目（圖示、名稱、剩餘/最大、恢復週期）
 */
import React, { useState, useEffect } from 'react';
import { Modal, ModalButton, ModalInput } from './ui/Modal';
import { SegmentBar } from './ui/SegmentBar';
import { setNormalValue } from '../utils/helpers';
import { MODAL_CONTAINER_CLASS } from '../styles/modalStyles';

export type ItemEditRecovery = 'round' | 'short' | 'long';

export type ItemEditCategory = 'action' | 'bonus' | 'reaction' | 'resource';

export interface ItemEditValues {
  name: string;
  icon: string;
  current: number;
  max: number;
  recovery: ItemEditRecovery;
}

interface CombatItemEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'add' | 'edit';
  category: ItemEditCategory;
  initialValues: ItemEditValues;
  onSave: (values: ItemEditValues) => void;
}

const CATEGORY_LABELS: Record<ItemEditCategory, string> = {
  action: '動作',
  bonus: '附贈動作',
  reaction: '反應',
  resource: '職業資源',
};

export default function CombatItemEditModal({
  isOpen,
  onClose,
  mode,
  category,
  initialValues,
  onSave,
}: CombatItemEditModalProps) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('✨');
  const [current, setCurrent] = useState('1');
  const [max, setMax] = useState('1');
  const [recovery, setRecovery] = useState<ItemEditRecovery>('round');

  useEffect(() => {
    if (isOpen) {
      setName(initialValues.name);
      setIcon(initialValues.icon);
      setCurrent(initialValues.current.toString());
      setMax(initialValues.max.toString());
      setRecovery(initialValues.recovery);
    }
  }, [isOpen, initialValues]);

  const handleSave = () => {
    if (!name.trim()) return;
    const currentResult = setNormalValue(current, 0, true);
    const maxResult = setNormalValue(max, 1, false);
    if (!currentResult.isValid || !maxResult.isValid) {
      onClose();
      return;
    }
    onSave({
      name: name.trim(),
      icon,
      current: currentResult.numericValue,
      max: maxResult.numericValue,
      recovery,
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xs">
      <div className={`${MODAL_CONTAINER_CLASS} relative`}>
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
              autoFocus
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
            <SegmentBar<ItemEditRecovery>
              value={recovery}
              onChange={setRecovery}
              options={[
                { value: 'round', label: '每回合' },
                { value: 'short', label: '短休', activeClassName: 'bg-amber-600 text-white shadow-sm' },
                { value: 'long', label: '長休', activeClassName: 'bg-indigo-600 text-white shadow-sm' },
              ]}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <ModalButton variant="secondary" onClick={onClose}>
              取消
            </ModalButton>
            <ModalButton variant="primary" onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-500">
              儲存
            </ModalButton>
          </div>
        </div>
      </div>
    </Modal>
  );
}
