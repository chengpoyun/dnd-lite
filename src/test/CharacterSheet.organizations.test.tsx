import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { CharacterSheet } from '../../components/CharacterSheet';
import type { CharacterStats } from '../../types';

/**
 * 組織區塊：顯示、加入、改聲望、退出。
 *
 * 特別守住「存檔 payload 一定要帶 organizations」—— 這個欄位若沒被送進
 * onSaveExtraData，重新整理後資料就會不見（updateExtraData 是白名單制）。
 */
const baseStats = (organizations?: Array<{ id: string; reputation: number }>): CharacterStats =>
  ({
    name: '測試角色',
    class: '戰士',
    level: 5,
    exp: 0,
    hp: { current: 10, max: 10, temp: 0 },
    hitDice: { current: 5, total: 5, die: 'd10' },
    ac: 16,
    initiative: 2,
    speed: 30,
    abilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    proficiencies: {},
    savingProficiencies: [],
    downtime: 0,
    renown: { used: 0, total: 0 },
    attacks: [],
    currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    customRecords: [],
    ...(organizations ? { organizations } : {}),
  }) as unknown as CharacterStats;

const onSaveExtraData = vi.fn();
const setStats = vi.fn();

const renderSheet = (stats: CharacterStats) =>
  render(
    <CharacterSheet
      stats={stats}
      setStats={setStats}
      onSaveCurrencyAndExp={vi.fn().mockResolvedValue(true)}
      onSaveExtraData={onSaveExtraData}
      onSaveCharacterBasicInfo={vi.fn().mockResolvedValue(true)}
      onSaveAbilityScores={vi.fn().mockResolvedValue(true)}
      onSaveSavingThrowProficiencies={vi.fn().mockResolvedValue(true)}
    />
  );

describe('角色頁 - 組織區塊', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    onSaveExtraData.mockResolvedValue(true);
  });

  it('沒加入組織時顯示提示，且不顯示採集倍數', () => {
    renderSheet(baseStats());

    expect(screen.getByText('尚未加入任何組織')).toBeInTheDocument();
    expect(screen.queryByText(/採集倍數/)).not.toBeInTheDocument();
  });

  it('顯示已加入組織的階級與倍數（獵人公會聲望 32 → 階級 3、×4）', () => {
    renderSheet(baseStats([{ id: 'hunters-guild', reputation: 32 }]));

    expect(screen.getByText('獵人公會')).toBeInTheDocument();
    expect(screen.getByText('聲望 32')).toBeInTheDocument();
    expect(screen.getByText('階級 3')).toBeInTheDocument();
    expect(screen.getByText(/距階級 4 還差 18/)).toBeInTheDocument();
    // ×4 會同時出現在組織列的標籤與底部總計，限定在組織列裡找
    const row = screen.getByText('獵人公會').closest('div.cursor-pointer') as HTMLElement;
    expect(within(row).getByText('×4')).toBeInTheDocument();
  });

  it('多個組織時顯示最高倍數', () => {
    renderSheet(
      baseStats([
        { id: 'hunters-guild', reputation: 32 },
        { id: 'talon-society', reputation: 6 },
      ])
    );

    expect(screen.getByText(/採集倍數/)).toBeInTheDocument();
    expect(screen.getByText('×4', { selector: 'span.text-amber-500' })).toBeInTheDocument();
  });

  it('達最高階級時不再顯示「還差」', () => {
    renderSheet(baseStats([{ id: 'talon-society', reputation: 99 }]));

    expect(screen.getByText('已達最高階級')).toBeInTheDocument();
  });

  it('加入組織時只列出尚未加入的，並以聲望 0 寫入 payload', async () => {
    renderSheet(baseStats([{ id: 'hunters-guild', reputation: 5 }]));

    fireEvent.click(screen.getByRole('button', { name: '加入組織' }));
    const dialog = await screen.findByText('加入組織', { selector: 'h2' });
    const modal = dialog.closest('div.fixed') as HTMLElement;

    // 已加入的獵人公會不該出現在可選清單裡
    expect(within(modal).queryByText('獵人公會')).not.toBeInTheDocument();

    fireEvent.click(within(modal).getByText('塔龍協會'));

    await waitFor(() => {
      expect(onSaveExtraData).toHaveBeenCalledWith(
        expect.objectContaining({
          organizations: [
            { id: 'hunters-guild', reputation: 5 },
            { id: 'talon-society', reputation: 0 },
          ],
        })
      );
    });
  });

  it('全部加入後不再顯示加入按鈕', () => {
    renderSheet(
      baseStats([
        { id: 'hunters-guild', reputation: 1 },
        { id: 'royal-paleontology', reputation: 1 },
        { id: 'talon-society', reputation: 1 },
        { id: 'wikadmi-academy', reputation: 1 },
        { id: 'spiral-council', reputation: 1 },
      ])
    );

    expect(screen.queryByRole('button', { name: '加入組織' })).not.toBeInTheDocument();
  });
});

describe('角色頁 - 聲望編輯彈窗', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    onSaveExtraData.mockResolvedValue(true);
  });

  const openModal = async () => {
    renderSheet(baseStats([{ id: 'hunters-guild', reputation: 32 }]));
    fireEvent.click(screen.getByText('獵人公會'));
    await screen.findByText('素材倍數');
  };

  it('顯示素材倍數與階級門檻', async () => {
    await openModal();

    expect(screen.getByText('素材倍數')).toBeInTheDocument();
    expect(screen.getByText('階級門檻')).toBeInTheDocument();
    expect(screen.getByText('1 / 10 / 25 / 50')).toBeInTheDocument();
  });

  it('改聲望後儲存，payload 要帶新的 organizations', async () => {
    await openModal();

    const input = screen.getByDisplayValue('32');
    fireEvent.change(input, { target: { value: '50' } });
    fireEvent.click(screen.getByText('儲存'));

    await waitFor(() => {
      expect(onSaveExtraData).toHaveBeenCalledWith(
        expect.objectContaining({
          organizations: [{ id: 'hunters-guild', reputation: 50 }],
        })
      );
    });
  });

  it('退出組織要先跳確認，未確認前不可寫入', async () => {
    await openModal();

    fireEvent.click(screen.getByText('退出組織'));
    expect(await screen.findByText('確認退出組織')).toBeInTheDocument();
    expect(onSaveExtraData).not.toHaveBeenCalled();
  });

  it('確認退出後，organizations 要移除該組織', async () => {
    await openModal();

    fireEvent.click(screen.getByText('退出組織'));
    await screen.findByText('確認退出組織');
    // 確認框內的「退出組織」是 confirmText
    const confirmBtns = screen.getAllByText('退出組織');
    fireEvent.click(confirmBtns[confirmBtns.length - 1]);

    await waitFor(() => {
      expect(onSaveExtraData).toHaveBeenCalledWith(
        expect.objectContaining({ organizations: [] })
      );
    });
  });
});
