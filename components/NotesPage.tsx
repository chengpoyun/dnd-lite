/**
 * NotesPage - 角色筆記
 * 列表（新到舊、兩行預覽）＋ 單篇詳情（返回、編輯、自動儲存、刪除）；頂部 Tab 列保持顯示。
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '../hooks/useToast';
import * as NoteService from '../services/noteService';
import type { CharacterNote } from '../services/noteService';
import { debounce } from '../utils/common';
import { PageContainer, Title, Card, ListCard, BackButton, Button, Loading } from './ui';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { STYLES, combineStyles } from '../styles/common';

interface NotesPageProps {
  characterId: string;
}

/** 取內容前兩行作為預覽（可截斷單行長度） */
function getTwoLinePreview(content: string, maxLineLength = 80): string {
  const lines = content.trim().split(/\r?\n/).slice(0, 2);
  return lines
    .map((line) => (line.length > maxLineLength ? line.slice(0, maxLineLength) + '…' : line))
    .join('\n');
}

export default function NotesPage({ characterId }: NotesPageProps) {
  const { showSuccess, showError } = useToast();
  const [notes, setNotes] = useState<CharacterNote[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const localContent = useRef('');
  const localTitle = useRef('');
  const detailWrapperRef = useRef<HTMLDivElement>(null);
  const [detailHeight, setDetailHeight] = useState<number | null>(null);

  const loadNotes = useCallback(async () => {
    if (!characterId) return;
    setIsLoading(true);
    const result = await NoteService.getNotes(characterId);
    if (result.success && result.notes) {
      setNotes(result.notes);
    } else {
      showError(result.error || '載入筆記失敗');
      setNotes([]);
    }
    setIsLoading(false);
  }, [characterId, showError]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const selectedNote = selectedNoteId ? notes.find((n) => n.id === selectedNoteId) : null;

  const saveCurrentNote = useCallback(
    async (noteId: string, title: string, content: string) => {
      const r = await NoteService.updateNote(noteId, { title, content });
      if (r.success) {
        setNotes((prev) =>
          prev.map((n) =>
            n.id === noteId
              ? { ...n, title, content, updated_at: new Date().toISOString() }
              : n
          )
        );
      } else {
        showError(r.error || '儲存失敗');
      }
      setIsSaving(false);
    },
    [showError]
  );

  const debouncedSave = useRef(
    debounce((noteId: string, title: string, content: string) => {
      saveCurrentNote(noteId, title, content);
    }, 500)
  ).current;

  const handleAddNote = async () => {
    if (!characterId) return;
    const result = await NoteService.createNote(characterId);
    if (result.success && result.note) {
      setNotes((prev) => [result.note!, ...prev]);
      setSelectedNoteId(result.note.id);
      localTitle.current = result.note.title;
      localContent.current = result.note.content;
    } else {
      showError(result.error || '新增筆記失敗');
    }
  };

  const handleBack = () => {
    setSelectedNoteId(null);
  };

  const handleContentBlur = () => {
    if (!selectedNoteId || !selectedNote) return;
    setIsSaving(true);
    saveCurrentNote(selectedNoteId, localTitle.current, localContent.current);
  };

  const handleContentChange = (value: string) => {
    localContent.current = value;
    if (!selectedNoteId) return;
    setIsSaving(true);
    debouncedSave(selectedNoteId, localTitle.current, value);
  };

  const handleTitleChange = (value: string) => {
    localTitle.current = value;
    if (!selectedNoteId) return;
    setIsSaving(true);
    debouncedSave(selectedNoteId, value, localContent.current);
  };

  const handleDeleteClick = () => {
    if (!selectedNoteId) return;
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedNoteId) return;
    setIsDeleteConfirmOpen(false);
    setIsDeleting(true);
    const result = await NoteService.deleteNote(selectedNoteId);
    setIsDeleting(false);
    if (result.success) {
      setNotes((prev) => prev.filter((n) => n.id !== selectedNoteId));
      setSelectedNoteId(null);
      showSuccess('已刪除筆記');
    } else {
      showError(result.error || '刪除失敗');
    }
  };

  useEffect(() => {
    if (selectedNote) {
      localTitle.current = selectedNote.title;
      localContent.current = selectedNote.content;
    }
  }, [selectedNote?.id]);

  // 詳情頁固定高度：改用實測（而非猜測 nav 高度換算的 dvh 常數），
  // 確保整頁精準貼合可視高度，內容輸入框以外不會有多餘可捲動空間
  useEffect(() => {
    if (!selectedNoteId) return;
    const updateHeight = () => {
      const el = detailWrapperRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      // PageContainer 結構：padded outer div > maxWidth div > 這個 wrapper，
      // 要拿的是最外層 padded div 的 padding-bottom（往上兩層）
      const paddedAncestor = el.parentElement?.parentElement;
      const bottomPadding = paddedAncestor ? parseFloat(getComputedStyle(paddedAncestor).paddingBottom) || 0 : 0;
      setDetailHeight(Math.max(200, window.innerHeight - top - bottomPadding));
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, [selectedNoteId]);

  if (!characterId) {
    return (
      <PageContainer>
        <p className={STYLES.text.muted}>請先選擇角色</p>
      </PageContainer>
    );
  }

  if (selectedNoteId && selectedNote) {
    return (
      // 不用 PageContainer：它自己的外層有 min-h-screen（至少一整個視窗高），
      // 跟這裡「固定高度、不讓整頁捲動」的需求互斥，改用同樣的內距／寬度但不設 min-h-screen
      <div className={combineStyles('bg-slate-950', STYLES.spacing.pageX, STYLES.spacing.pageY)}>
        <div className={STYLES.layout.maxWidth}>
        {/* 固定高度（實測可視高度，非 minHeight）讓整頁不會被撐高捲動；
            只有內容輸入框內部會超出捲動，輸入框外側往下滑不會拖動整頁。
            detailHeight 量測完成前先用 dvh 估計值墊著，避免第一次渲染閃一下 */}
        <div
          ref={detailWrapperRef}
          className="flex flex-col overflow-hidden"
          style={{ height: detailHeight != null ? `${detailHeight}px` : 'calc(100dvh - 6rem)' }}
        >
          <div className="mb-4 shrink-0 flex items-center justify-between gap-3">
            <BackButton onClick={handleBack} />
            <span className={STYLES.text.bodySmall + ' flex items-center gap-2'}>
              {isSaving && (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-amber-500 border-t-transparent flex-shrink-0" aria-hidden />
                  <span>儲存中…</span>
                </>
              )}
            </span>
          </div>
          <div className="flex flex-col gap-3 sm:gap-4 flex-1 min-h-0">
            <label className="block shrink-0">
              <span className={STYLES.text.subtitle}>標題</span>
              <input
                type="text"
                className={combineStyles(STYLES.input.base, 'w-full mt-1')}
                defaultValue={selectedNote.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                onBlur={(e) => {
                  localTitle.current = e.target.value;
                  if (selectedNoteId) {
                    setIsSaving(true);
                    saveCurrentNote(selectedNoteId, e.target.value, localContent.current);
                  }
                }}
              />
            </label>
            <label className="flex flex-col flex-1 min-h-0">
              <span className={STYLES.text.subtitle}>內容</span>
              <textarea
                className={combineStyles(STYLES.input.base, 'w-full mt-1 flex-1 min-h-[200px] resize-none')}
                defaultValue={selectedNote.content}
                onChange={(e) => handleContentChange(e.target.value)}
                onBlur={handleContentBlur}
              />
            </label>
            <div className="flex justify-end shrink-0">
              <Button variant="danger" onClick={handleDeleteClick} disabled={isDeleting}>
                {isDeleting ? '刪除中…' : '刪除筆記'}
              </Button>
            </div>
          </div>
        </div>
        <ConfirmDeleteModal
          isOpen={isDeleteConfirmOpen}
          onClose={() => setIsDeleteConfirmOpen(false)}
          title="確認刪除筆記"
          message="確定要刪除這篇筆記？"
          confirmText="確認刪除"
          onConfirm={handleDeleteConfirm}
        />
        </div>
      </div>
    );
  }

  const filteredNotes = (() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(
      (n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
    );
  })();

  return (
    <PageContainer>
      <div className={combineStyles(STYLES.layout.flexBetween, STYLES.spacing.marginBottomSmall)}>
        <Title>筆記</Title>
        <Button variant="primary" onClick={handleAddNote}>
          新增筆記
        </Button>
      </div>
      {isLoading ? (
        <Loading />
      ) : notes.length === 0 ? (
        <Card>
          <p className={STYLES.text.muted}>尚無筆記，點「新增筆記」開始</p>
          <Button variant="primary" className="mt-4" onClick={handleAddNote}>
            新增筆記
          </Button>
        </Card>
      ) : (
        <>
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="搜尋筆記..."
            className={combineStyles(STYLES.input.base, 'w-full', STYLES.spacing.marginBottomSmall)}
          />
          {filteredNotes.length === 0 ? (
            <p className={STYLES.text.muted}>找不到符合的筆記</p>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredNotes.map((note) => (
                <ListCard
                  key={note.id}
                  onClick={() => {
                    setSelectedNoteId(note.id);
                    localTitle.current = note.title;
                    localContent.current = note.content;
                  }}
                >
                  <div className={STYLES.text.title}>{note.title}</div>
                  <pre className={combineStyles(STYLES.text.bodySmall, 'mt-1 whitespace-pre-wrap font-sans text-slate-400')}>
                    {getTwoLinePreview(note.content) || '（無內容）'}
                  </pre>
                </ListCard>
              ))}
            </div>
          )}
        </>
      )}
    </PageContainer>
  );
}
