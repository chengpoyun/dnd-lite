/**
 * InfoPage - 「資訊」分頁：帳號層級的參考連結清單（同一登入/匿名身分下所有角色共用）
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../hooks/useToast';
import * as InfoLinkService from '../services/infoLinks';
import type { InfoLinkUserContext } from '../services/infoLinks';
import type { InfoLink } from '../lib/supabase';
import { PageContainer, Title, Loading, ListCard, ListCardTitleRow } from './ui';
import InfoLinkFormModal from './InfoLinkFormModal';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface InfoPageProps {
  userContext: InfoLinkUserContext;
}

/** 網址顯示用：去掉協定字首，避免佔用太多空間 */
function formatUrlForDisplay(url: string): string {
  return url.replace(/^https?:\/\//, '');
}

export default function InfoPage({ userContext }: InfoPageProps) {
  const { showSuccess, showError } = useToast();
  const [links, setLinks] = useState<InfoLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingLink, setEditingLink] = useState<InfoLink | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<InfoLink | null>(null);

  const loadLinks = useCallback(async () => {
    setIsLoading(true);
    const result = await InfoLinkService.getInfoLinks(userContext);
    if (result.success) {
      setLinks(result.links ?? []);
    } else {
      showError(result.error || '載入資訊連結失敗');
    }
    setIsLoading(false);
  }, [userContext, showError]);

  useEffect(() => {
    loadLinks();
  }, [loadLinks]);

  const openAddForm = () => {
    setEditingLink(null);
    setIsFormOpen(true);
  };

  const openEditForm = (link: InfoLink) => {
    setEditingLink(link);
    setIsFormOpen(true);
  };

  const handleSave = async (data: { title: string; url: string }) => {
    if (editingLink) {
      const result = await InfoLinkService.updateInfoLink(editingLink.id, data);
      if (result.success) {
        setLinks((prev) => prev.map((l) => (l.id === editingLink.id ? { ...l, ...data } : l)));
        showSuccess('已更新連結');
      } else {
        showError(result.error || '更新連結失敗');
      }
    } else {
      const result = await InfoLinkService.createInfoLink(userContext, data);
      if (result.success && result.link) {
        setLinks((prev) => [...prev, result.link!]);
        showSuccess('已新增連結');
      } else {
        showError(result.error || '新增連結失敗');
      }
    }
    setIsFormOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const result = await InfoLinkService.deleteInfoLink(deleteTarget.id);
    if (result.success) {
      setLinks((prev) => prev.filter((l) => l.id !== deleteTarget.id));
      showSuccess('已刪除連結');
    } else {
      showError(result.error || '刪除連結失敗');
    }
    setDeleteTarget(null);
  };

  if (isLoading) {
    return (
      <PageContainer>
        <Loading text="載入資訊連結中..." />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-4">
        <Title>資訊連結</Title>
        <button
          onClick={openAddForm}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xl font-bold transition-colors"
          aria-label="新增連結"
        >
          +
        </button>
      </div>

      <div className="space-y-2">
        {links.map((link) => (
          <ListCard key={link.id}>
            <div className="flex items-center gap-3">
              <span className="text-xl shrink-0">🔗</span>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-w-0 block"
              >
                <ListCardTitleRow title={link.title} tags={null} />
                <p className="text-xs text-slate-500 truncate">{formatUrlForDisplay(link.url)}</p>
              </a>
              <button
                onClick={() => openEditForm(link)}
                className="shrink-0 p-1.5 text-slate-500 hover:text-amber-400 transition-colors"
                aria-label="編輯連結"
              >
                ✏️
              </button>
              <button
                onClick={() => setDeleteTarget(link)}
                className="shrink-0 p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                aria-label="刪除連結"
              >
                🗑️
              </button>
            </div>
          </ListCard>
        ))}
      </div>

      <p className="text-center text-xs text-slate-500 mt-3">點卡片開啟連結（新分頁）．點 ✏️ 編輯</p>

      <InfoLinkFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        initialTitle={editingLink?.title}
        initialUrl={editingLink?.url}
        onSave={handleSave}
      />

      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        itemName={deleteTarget?.title}
        itemType="連結"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </PageContainer>
  );
}
