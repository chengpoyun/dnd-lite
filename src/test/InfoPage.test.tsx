/**
 * InfoPage - 資訊連結清單：載入、新增、編輯、刪除，連結以新分頁開啟
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import InfoPage from '../../components/InfoPage';
import * as InfoLinkService from '../../services/infoLinks';
import type { InfoLink } from '../../lib/supabase';

vi.mock('../../services/infoLinks');

const mockInfoLinkService = vi.mocked(InfoLinkService);

const makeLink = (overrides: Partial<InfoLink>): InfoLink => ({
  id: 'link-1',
  user_id: null,
  anonymous_id: 'anon_1',
  is_anonymous: true,
  title: '異常狀態說明',
  url: 'https://5etools.vercel.app/conditionsdiseases.html',
  ...overrides,
});

const userContext = { isAuthenticated: false, anonymousId: 'anon_1' };

describe('InfoPage - 資訊連結清單', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('載入後顯示連結標題、網址（去掉協定），並以 target=_blank 開新分頁', async () => {
    const link = makeLink({});
    mockInfoLinkService.getInfoLinks.mockResolvedValue({ success: true, links: [link] });

    render(<InfoPage userContext={userContext} />);

    await waitFor(() => {
      expect(screen.getByText('異常狀態說明')).toBeInTheDocument();
    });
    expect(screen.getByText('5etools.vercel.app/conditionsdiseases.html')).toBeInTheDocument();

    const anchor = screen.getByText('異常狀態說明').closest('a');
    expect(anchor).toHaveAttribute('href', link.url);
    expect(anchor).toHaveAttribute('target', '_blank');
    expect(anchor).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('點「+」新增連結，填標題網址後儲存會呼叫 createInfoLink', async () => {
    mockInfoLinkService.getInfoLinks.mockResolvedValue({ success: true, links: [] });
    mockInfoLinkService.createInfoLink.mockResolvedValue({
      success: true,
      link: makeLink({ id: 'link-2', title: '法術查詢', url: 'https://example.com/spells' }),
    });

    render(<InfoPage userContext={userContext} />);
    await waitFor(() => expect(mockInfoLinkService.getInfoLinks).toHaveBeenCalled());

    fireEvent.click(screen.getByLabelText('新增連結'));
    fireEvent.change(screen.getByPlaceholderText('異常狀態說明'), { target: { value: '法術查詢' } });
    fireEvent.change(screen.getByPlaceholderText('https://...'), {
      target: { value: 'https://example.com/spells' },
    });
    fireEvent.click(screen.getByText('儲存'));

    await waitFor(() => {
      expect(mockInfoLinkService.createInfoLink).toHaveBeenCalledWith(userContext, {
        title: '法術查詢',
        url: 'https://example.com/spells',
      });
    });
    await waitFor(() => expect(screen.getByText('法術查詢')).toBeInTheDocument());
  });

  it('點編輯圖示修改既有連結會呼叫 updateInfoLink（帶入原本的值）', async () => {
    const link = makeLink({});
    mockInfoLinkService.getInfoLinks.mockResolvedValue({ success: true, links: [link] });
    mockInfoLinkService.updateInfoLink.mockResolvedValue({ success: true });

    render(<InfoPage userContext={userContext} />);
    await waitFor(() => expect(screen.getByText('異常狀態說明')).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText('編輯連結'));
    const titleInput = screen.getByPlaceholderText('異常狀態說明') as HTMLInputElement;
    expect(titleInput.value).toBe('異常狀態說明');
    fireEvent.change(titleInput, { target: { value: '異常狀態說明（修改）' } });
    fireEvent.click(screen.getByText('儲存'));

    await waitFor(() => {
      expect(mockInfoLinkService.updateInfoLink).toHaveBeenCalledWith(link.id, {
        title: '異常狀態說明（修改）',
        url: link.url,
      });
    });
  });

  it('點刪除圖示並確認會呼叫 deleteInfoLink 並從清單移除', async () => {
    const link = makeLink({});
    mockInfoLinkService.getInfoLinks.mockResolvedValue({ success: true, links: [link] });
    mockInfoLinkService.deleteInfoLink.mockResolvedValue({ success: true });

    render(<InfoPage userContext={userContext} />);
    await waitFor(() => expect(screen.getByText('異常狀態說明')).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText('刪除連結'));
    fireEvent.click(screen.getByText('確認刪除'));

    await waitFor(() => {
      expect(mockInfoLinkService.deleteInfoLink).toHaveBeenCalledWith(link.id);
    });
    await waitFor(() => expect(screen.queryByText('異常狀態說明')).not.toBeInTheDocument());
  });
});
