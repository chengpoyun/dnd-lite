/**
 * CombatItemEditModal - 恢復週期「長休骰」：長休時擲骰（可自訂 1d3、1d5、2d7 等）恢復，而不是補滿
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CombatItemEditModal, { type ItemEditValues } from '../../components/CombatItemEditModal';

const base: ItemEditValues = { name: '法術反制(護甲)', icon: '✨', current: 3, max: 6, recovery: 'long' };

const renderModal = (initialValues: ItemEditValues = base, onSave = vi.fn()) => {
  render(<CombatItemEditModal isOpen onClose={vi.fn()} mode="edit" initialValues={initialValues} onSave={onSave} />);
  return onSave;
};

const diceInput = () => screen.getByLabelText('長休恢復骰子') as HTMLInputElement;
const selectDiceMode = () => fireEvent.click(screen.getByRole('button', { name: '長休骰' }));
const typeDice = (value: string) => fireEvent.change(diceInput(), { target: { value } });

describe('CombatItemEditModal - 長休骰', () => {
  beforeEach(() => vi.clearAllMocks());

  it('恢復週期多一個「長休骰」選項', () => {
    renderModal();
    expect(screen.getByRole('button', { name: '長休骰' })).toBeInTheDocument();
  });

  it('沒選「長休骰」時不顯示骰子輸入框', () => {
    renderModal();
    expect(screen.queryByLabelText('長休恢復骰子')).not.toBeInTheDocument();
  });

  it('選了「長休骰」後顯示輸入框（預設 1d6）與說明文字，沒有預設骰子按鈕', () => {
    renderModal();
    selectDiceMode();
    expect(diceInput().value).toBe('1d6');
    expect(screen.getByText(/每次長休恢復 1d6 次/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '1d8' })).not.toBeInTheDocument();
  });

  it('輸入自訂骰子後說明文字跟著變', () => {
    renderModal();
    selectDiceMode();
    typeDice('1d5');
    expect(screen.getByText(/每次長休恢復 1d5 次/)).toBeInTheDocument();
  });

  it.each(['1d3', '1d5', '2d7'])('儲存 %s：recovery 為 long，並帶出 recoveryDice', async (dice) => {
    const onSave = renderModal();
    selectDiceMode();
    typeDice(dice);
    fireEvent.click(screen.getByText('儲存'));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).toMatchObject({ recovery: 'long', recoveryDice: dice });
  });

  it('輸入大寫或前後有空白時，儲存為正規化的小寫格式', async () => {
    const onSave = renderModal();
    selectDiceMode();
    typeDice(' 2D7 ');
    fireEvent.click(screen.getByText('儲存'));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].recoveryDice).toBe('2d7');
  });

  it('格式不合法時顯示提示、輸入框標紅，且儲存不會送出', () => {
    const onSave = renderModal();
    selectDiceMode();
    typeDice('d5');
    expect(screen.getByText('請輸入骰子記法，例如 1d3、1d6、2d4')).toBeInTheDocument();
    expect(diceInput()).toHaveClass('border-rose-500');
    expect(screen.queryByText(/每次長休恢復/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('儲存'));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('輸入清空時視為不合法，不能儲存', () => {
    const onSave = renderModal();
    selectDiceMode();
    typeDice('');
    fireEvent.click(screen.getByText('儲存'));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('超過上限（101d6）視為不合法', () => {
    renderModal();
    selectDiceMode();
    typeDice('101d6');
    expect(screen.getByText('請輸入骰子記法，例如 1d3、1d6、2d4')).toBeInTheDocument();
  });

  it('改回合法輸入後提示消失、可以儲存', async () => {
    const onSave = renderModal();
    selectDiceMode();
    typeDice('abc');
    typeDice('1d4');
    expect(screen.queryByText('請輸入骰子記法，例如 1d3、1d6、2d4')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('儲存'));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
  });

  it('既有項目已設定長休骰時，開啟後預先選中「長休骰」並帶入原本的骰子', () => {
    renderModal({ ...base, recoveryDice: '2d7' });
    expect(diceInput().value).toBe('2d7');
    expect(screen.getByText(/每次長休恢復 2d7 次/)).toBeInTheDocument();
  });

  it('選別的週期（長休、短休）時輸入框消失，儲存時 recoveryDice 清掉', async () => {
    const onSave = renderModal({ ...base, recoveryDice: '1d8' });
    fireEvent.click(screen.getByRole('button', { name: '長休' }));
    expect(screen.queryByLabelText('長休恢復骰子')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('儲存'));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    const values = onSave.mock.calls[0][0] as ItemEditValues;
    expect(values.recovery).toBe('long');
    expect(values.recoveryDice).toBeUndefined();
  });

  it('輸入不合法後改選短休，不會被卡住，可以正常儲存', async () => {
    const onSave = renderModal({ ...base, recoveryDice: '1d8' });
    typeDice('xx');
    fireEvent.click(screen.getByRole('button', { name: '短休' }));
    fireEvent.click(screen.getByText('儲存'));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).toMatchObject({ recovery: 'short' });
  });
});
