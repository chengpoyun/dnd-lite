/**
 * EquipmentPage - 裝備頁面
 * 依部位列出槽位，每槽下拉僅顯示符合該 slot 的裝備；僅穿戴中的裝備會影響角色數值。
 * 共用：PageContainer、Title、Card、STYLES、combineStyles
 */

import React, { useState, useEffect } from 'react';
import { useToast } from '../hooks/useToast';
import * as ItemService from '../services/itemService';
import type { CharacterItem } from '../services/itemService';
import {
  EQUIPMENT_SLOTS_ORDERED,
  EQUIPMENT_SLOT_LABELS,
  getSlotsForKind,
  type EquipmentSlot,
} from '../utils/equipmentConstants';
import { PageContainer, Title, Card, Loading } from './ui';
import { STYLES, combineStyles } from '../styles/common';

interface EquipmentPageProps {
  characterId: string;
  onCharacterDataChanged?: () => void;
}

export default function EquipmentPage({ characterId, onCharacterDataChanged }: EquipmentPageProps) {
  const { showSuccess, showError } = useToast();
  const [items, setItems] = useState<CharacterItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingSlot, setUpdatingSlot] = useState<EquipmentSlot | null>(null);

  const loadItems = async () => {
    if (!characterId) return;
    setIsLoading(true);
    const result = await ItemService.getCharacterItems(characterId);
    if (result.success && result.items) {
      setItems(result.items);
    } else {
      showError(result.error || '載入道具失敗');
      setItems([]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadItems();
  }, [characterId]);

  const equipmentItems = items.filter((item) => {
    const display = ItemService.getDisplayValues(item);
    return display.displayCategory === '裝備';
  });

  const getItemsForSlot = (slot: EquipmentSlot): CharacterItem[] => {
    return equipmentItems.filter((item) => {
      const kind = ItemService.getDisplayEquipmentKind(item);
      return getSlotsForKind(kind ?? undefined).includes(slot);
    });
  };

  const getItemInSlot = (slot: EquipmentSlot): CharacterItem | undefined => {
    return equipmentItems.find((item) => item.equipment_slot === slot);
  };

  const handleSlotChange = async (slot: EquipmentSlot, characterItemId: string) => {
    const current = getItemInSlot(slot);
    if (characterItemId === '') {
      if (!current) return;
      setUpdatingSlot(slot);
      const result = await ItemService.updateCharacterItem(current.id, {
        equipment_slot: null,
        is_equipped: false,
      });
      setUpdatingSlot(null);
      if (result.success) {
        showSuccess('已卸下裝備');
        loadItems();
        onCharacterDataChanged?.();
      } else {
        showError(result.error || '更新失敗');
      }
      return;
    }

    const target = items.find((i) => i.id === characterItemId);
    if (!target) return;
    if (current?.id === target.id) return;

    setUpdatingSlot(slot);
    const updates: Promise<{ success: boolean; error?: string }>[] = [];
    if (current) {
      updates.push(
        ItemService.updateCharacterItem(current.id, { equipment_slot: null, is_equipped: false })
      );
    }
    updates.push(
      ItemService.updateCharacterItem(target.id, { equipment_slot: slot, is_equipped: true })
    );
    const results = await Promise.all(updates);
    setUpdatingSlot(null);
    const failed = results.find((r) => !r.success);
    if (failed) {
      showError(failed.error || '更新失敗');
    } else {
      showSuccess('已穿戴裝備');
      loadItems();
      onCharacterDataChanged?.();
    }
  };

  return (
    <PageContainer>
      <div className={combineStyles(STYLES.spacing.marginBottom, 'flex items-center justify-between')}>
        <Title size="large">裝備</Title>
      </div>

      {isLoading ? (
        <Loading text="載入中..." />
      ) : (
        <div className="space-y-6">
          {EQUIPMENT_SLOTS_ORDERED.map(({ section, slots }) => (
            <Card key={section} padding="normal">
              <h2 className={combineStyles(STYLES.text.title, 'mb-3')}>{section}</h2>
              <div className="space-y-3">
                {slots.map((slot) => {
                  const current = getItemInSlot(slot);
                  const options = getItemsForSlot(slot);
                  const isUpdating = updatingSlot === slot;
                  return (
                    <div
                      key={slot}
                      className={combineStyles(STYLES.layout.flexBetween, 'gap-3 flex-wrap')}
                    >
                      <span className={STYLES.text.body}>{EQUIPMENT_SLOT_LABELS[slot]}</span>
                      <select
                        className={combineStyles(
                          STYLES.input.base,
                          'min-w-[140px] max-w-[220px] cursor-pointer'
                        )}
                        value={current?.id ?? ''}
                        disabled={isUpdating}
                        onChange={(e) => handleSlotChange(slot, e.target.value)}
                      >
                        <option value="">未裝備</option>
                        {options.map((item) => (
                          <option key={item.id} value={item.id}>
                            {ItemService.getDisplayValues(item).displayName}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
          <p className={STYLES.text.subtitle}>僅穿戴中的裝備會影響角色數值。</p>
        </div>
      )}
    </PageContainer>
  );
}
