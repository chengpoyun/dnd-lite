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
  const localContent = useRef('');
  const localTitle = useRef('');

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

  const handleDelete = async () => {
    if (!selectedNoteId) return;
    if (!window.confirm('確定要刪除這篇筆記？')) return;
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

  if (!characterId) {
    return (
      <PageContainer>
        <p className={STYLES.text.muted}>請先選擇角色</p>
      </PageContainer>
    );
  }

  if (selectedNoteId && selectedNote) {
    return (
      <PageContainer>
        <div className="flex items-center justify-between gap-3 mb-4">
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
        <div className={STYLES.layout.grid}>
          <label className="block">
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
          <label className="block">
            <span className={STYLES.text.subtitle}>內容</span>
            <textarea
              className={combineStyles(STYLES.input.base, 'w-full mt-1 min-h-[200px] resize-y')}
              defaultValue={selectedNote.content}
              onChange={(e) => handleContentChange(e.target.value)}
              onBlur={handleContentBlur}
            />
          </label>
          <div className="flex justify-end">
            <Button variant="danger" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? '刪除中…' : '刪除筆記'}
            </Button>
          </div>
        </div>
      </PageContainer>
    );
  }

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
        <div className="flex flex-col gap-3">
          {notes.map((note) => (
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
    </PageContainer>
  );
}
