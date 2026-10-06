/**
 * CombatItemEditModal - 恢復週期「長休骰」：長休時擲骰（1d4～1d12）恢復，而不是補滿
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CombatItemEditModal, { type ItemEditValues } from '../../components/CombatItemEditModal';

const base: ItemEditValues = { name: '法術反制(護甲)', icon: '✨', current: 3, max: 6, recovery: 'long' };

const renderModal = (initialValues: ItemEditValues = base, onSave = vi.fn()) => {
  render(<CombatItemEditModal isOpen onClose={vi.fn()} mode="edit" initialValues={initialValues} onSave={onSave} />);
  return onSave;
};

describe('CombatItemEditModal - 長休骰', () => {
  beforeEach(() => vi.clearAllMocks());

  it('恢復週期多一個「長休骰」選項', () => {
    renderModal();
    expect(screen.getByRole('button', { name: '長休骰' })).toBeInTheDocument();
  });

  it('沒選「長休骰」時不顯示骰子選項', () => {
    renderModal();
    expect(screen.queryByRole('button', { name: '1d6' })).not.toBeInTheDocument();
  });

  it('選了「長休骰」後顯示 1d4～1d12 五個選項與說明文字，預設 1d6', () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: '長休骰' }));
    for (const d of ['1d4', '1d6', '1d8', '1d10', '1d12']) {
      expect(screen.getByRole('button', { name: d })).toBeInTheDocument();
    }
    expect(screen.getByText(/每次長休恢復 1d6 次/)).toBeInTheDocument();
  });

  it('選擇骰子後說明文字跟著變', () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: '長休骰' }));
    fireEvent.click(screen.getByRole('button', { name: '1d8' }));
    expect(screen.getByText(/每次長休恢復 1d8 次/)).toBeInTheDocument();
  });

  it('儲存長休骰項目：recovery 為 long，並帶出 recoveryDice', async () => {
    const onSave = renderModal();
    fireEvent.click(screen.getByRole('button', { name: '長休骰' }));
    fireEvent.click(screen.getByRole('button', { name: '1d10' }));
    fireEvent.click(screen.getByText('儲存'));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).toMatchObject({ recovery: 'long', recoveryDice: '1d10' });
  });

  it('既有項目已設定長休骰時，開啟後預先選中「長休骰」與對應骰子', () => {
    renderModal({ ...base, recoveryDice: '1d8' });
    expect(screen.getByText(/每次長休恢復 1d8 次/)).toBeInTheDocument();
  });

  it('從長休骰切回一般「長休」儲存時，recoveryDice 清掉', async () => {
    const onSave = renderModal({ ...base, recoveryDice: '1d8' });
    fireEvent.click(screen.getByRole('button', { name: '長休' }));
    fireEvent.click(screen.getByText('儲存'));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    const values = onSave.mock.calls[0][0] as ItemEditValues;
    expect(values.recovery).toBe('long');
    expect(values.recoveryDice).toBeUndefined();
  });

  it('改選短休儲存時，recoveryDice 清掉', async () => {
    const onSave = renderModal({ ...base, recoveryDice: '1d8' });
    fireEvent.click(screen.getByRole('button', { name: '短休' }));
    fireEvent.click(screen.getByText('儲存'));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    const values = onSave.mock.calls[0][0] as ItemEditValues;
    expect(values.recovery).toBe('short');
    expect(values.recoveryDice).toBeUndefined();
  });
});
