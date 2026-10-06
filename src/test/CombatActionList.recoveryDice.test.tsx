/**
 * CombatActionList - 長休骰項目在卡片上顯示 🎲 骰子標記
 */
import { vi, describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ActionList from '../../components/CombatActionList';
import type { CombatItem } from '../../utils/combatItemMapping';

const item = (overrides: Partial<CombatItem> = {}): CombatItem => ({
  id: 'i1',
  name: '法術反制(護甲)',
  icon: '✨',
  current: 3,
  max: 6,
  recovery: 'long',
  ...overrides,
});

const renderList = (items: CombatItem[], isTwoCol: boolean) =>
  render(
    <ActionList
      title="職業資源"
      items={items}
      colorClass="text-indigo-400"
      onAdd={vi.fn()}
      isEditMode={false}
      onRemove={vi.fn()}
      onUse={vi.fn()}
      isTwoCol={isTwoCol}
    />
  );

describe('CombatActionList - 長休骰標記', () => {
  it.each([true, false])('長休骰項目顯示骰子標記（isTwoCol=%s）', (isTwoCol) => {
    renderList([item({ recoveryDice: '1d6' })], isTwoCol);
    expect(screen.getByText('🎲1d6')).toBeInTheDocument();
  });

  it.each([true, false])('一般項目不顯示骰子標記（isTwoCol=%s）', (isTwoCol) => {
    renderList([item()], isTwoCol);
    expect(screen.queryByText(/🎲/)).not.toBeInTheDocument();
  });

  it('標記有 title 說明恢復方式', () => {
    renderList([item({ recoveryDice: '1d8' })], true);
    expect(screen.getByText('🎲1d8')).toHaveAttribute('title', '每次長休擲 1d8 恢復');
  });
});
