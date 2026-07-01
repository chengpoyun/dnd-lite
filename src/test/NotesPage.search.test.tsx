/**
 * NotesPage - 搜尋列
 * 位於「筆記」標題列與「新增筆記」按鈕下方；依標題+內容過濾筆記列表。
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NotesPage from '../../components/NotesPage';
import * as NoteService from '../../services/noteService';
import type { CharacterNote } from '../../services/noteService';

vi.mock('../../services/noteService');

const mockNoteService = vi.mocked(NoteService);

const makeNote = (overrides: Partial<CharacterNote>): CharacterNote => ({
  id: 'note-1',
  character_id: 'char-1',
  title: '標題',
  content: '內容',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('NotesPage - 搜尋列', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const notes: CharacterNote[] = [
    makeNote({ id: '1', title: '戰前準備', content: '記得帶火把和繩子' }),
    makeNote({ id: '2', title: 'NPC筆記', content: '鐵匠老王欠我們人情' }),
    makeNote({ id: '3', title: '戰利品清單', content: '治療藥水x3' }),
  ];

  it('沒有筆記時不顯示搜尋列', async () => {
    mockNoteService.getNotes.mockResolvedValue({ success: true, notes: [] });
    render(<NotesPage characterId="char-1" />);

    await waitFor(() => {
      expect(screen.getByText('尚無筆記，點「新增筆記」開始')).toBeInTheDocument();
    });
    expect(screen.queryByPlaceholderText('搜尋筆記...')).not.toBeInTheDocument();
  });

  it('有筆記時顯示搜尋列，預設顯示全部筆記', async () => {
    mockNoteService.getNotes.mockResolvedValue({ success: true, notes });
    render(<NotesPage characterId="char-1" />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('搜尋筆記...')).toBeInTheDocument();
    });
    expect(screen.getByText('戰前準備')).toBeInTheDocument();
    expect(screen.getByText('NPC筆記')).toBeInTheDocument();
    expect(screen.getByText('戰利品清單')).toBeInTheDocument();
  });

  it('輸入標題關鍵字時，只顯示標題符合的筆記', async () => {
    mockNoteService.getNotes.mockResolvedValue({ success: true, notes });
    render(<NotesPage characterId="char-1" />);

    const search = await screen.findByPlaceholderText('搜尋筆記...');
    fireEvent.change(search, { target: { value: '戰' } });

    expect(screen.getByText('戰前準備')).toBeInTheDocument();
    expect(screen.getByText('戰利品清單')).toBeInTheDocument();
    expect(screen.queryByText('NPC筆記')).not.toBeInTheDocument();
  });

  it('輸入內容關鍵字時，也能篩出符合的筆記', async () => {
    mockNoteService.getNotes.mockResolvedValue({ success: true, notes });
    render(<NotesPage characterId="char-1" />);

    const search = await screen.findByPlaceholderText('搜尋筆記...');
    fireEvent.change(search, { target: { value: '藥水' } });

    expect(screen.getByText('戰利品清單')).toBeInTheDocument();
    expect(screen.queryByText('戰前準備')).not.toBeInTheDocument();
    expect(screen.queryByText('NPC筆記')).not.toBeInTheDocument();
  });

  it('搜尋不分大小寫', async () => {
    mockNoteService.getNotes.mockResolvedValue({ success: true, notes });
    render(<NotesPage characterId="char-1" />);

    const search = await screen.findByPlaceholderText('搜尋筆記...');
    fireEvent.change(search, { target: { value: 'npc' } });

    expect(screen.getByText('NPC筆記')).toBeInTheDocument();
  });

  it('搜尋不到結果時顯示「找不到符合的筆記」', async () => {
    mockNoteService.getNotes.mockResolvedValue({ success: true, notes });
    render(<NotesPage characterId="char-1" />);

    const search = await screen.findByPlaceholderText('搜尋筆記...');
    fireEvent.change(search, { target: { value: '不存在的關鍵字xyz' } });

    expect(screen.getByText('找不到符合的筆記')).toBeInTheDocument();
    expect(screen.queryByText('戰前準備')).not.toBeInTheDocument();
  });

  it('清空搜尋文字後恢復顯示全部筆記', async () => {
    mockNoteService.getNotes.mockResolvedValue({ success: true, notes });
    render(<NotesPage characterId="char-1" />);

    const search = await screen.findByPlaceholderText('搜尋筆記...');
    fireEvent.change(search, { target: { value: '戰' } });
    expect(screen.queryByText('NPC筆記')).not.toBeInTheDocument();

    fireEvent.change(search, { target: { value: '' } });
    expect(screen.getByText('NPC筆記')).toBeInTheDocument();
  });
});
