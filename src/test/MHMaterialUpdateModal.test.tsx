import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MHMaterialUpdateModal } from '../../components/MHMaterialUpdateModal';
import type { MHMaterialUpdatePreview } from '../../services/mhMaterialCatalog';

describe('MHMaterialUpdateModal', () => {
  it('未開啟或無 preview 時不渲染內容', () => {
    render(
      <MHMaterialUpdateModal isOpen={false} onClose={vi.fn()} onConfirm={vi.fn()} materialName="爆鱗龍的鱗" preview={null} />
    );
    expect(screen.queryByText(/更新/)).not.toBeInTheDocument();
  });

  it('顯示素材名稱，以及每個有差異欄位的 舊值→新值', () => {
    const preview: MHMaterialUpdatePreview = {
      nameEn: { old: null, new: 'Seregios Scraper+' },
      rarity: { old: null, new: '17' },
      weapon: { old: undefined, new: { note: '額外造成1d8揮砍傷害。' } },
    };
    render(
      <MHMaterialUpdateModal isOpen onClose={vi.fn()} onConfirm={vi.fn()} materialName="千刃龍的斬翼爪+" preview={preview} />
    );
    expect(screen.getByText(/千刃龍的斬翼爪\+/)).toBeInTheDocument();
    expect(screen.getByText('英文名稱')).toBeInTheDocument();
    expect(screen.getByText('Seregios Scraper+')).toBeInTheDocument();
    expect(screen.getByText('稀有度 (CR)')).toBeInTheDocument();
    expect(screen.getAllByText('未填寫').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('17')).toBeInTheDocument();
    expect(screen.getByText('武器鑲嵌效果')).toBeInTheDocument();
    expect(screen.getByText('無')).toBeInTheDocument();
    expect(screen.getByText('額外造成1d8揮砍傷害。')).toBeInTheDocument();
    expect(screen.queryByText('護甲鑲嵌效果')).not.toBeInTheDocument();
  });

  it('沒有差異的欄位不會顯示對應的列', () => {
    const preview: MHMaterialUpdatePreview = { armor: { old: undefined, new: { note: '工具行家' } } };
    render(
      <MHMaterialUpdateModal isOpen onClose={vi.fn()} onConfirm={vi.fn()} materialName="溟波龍的特上皮" preview={preview} />
    );
    expect(screen.queryByText('英文名稱')).not.toBeInTheDocument();
    expect(screen.queryByText('稀有度 (CR)')).not.toBeInTheDocument();
    expect(screen.queryByText('武器鑲嵌效果')).not.toBeInTheDocument();
    expect(screen.getByText('護甲鑲嵌效果')).toBeInTheDocument();
  });

  it('點擊確認更新會呼叫 onConfirm', () => {
    const onConfirm = vi.fn();
    const preview: MHMaterialUpdatePreview = { rarity: { old: null, new: '17' } };
    render(
      <MHMaterialUpdateModal isOpen onClose={vi.fn()} onConfirm={onConfirm} materialName="爆鱗龍的鱗" preview={preview} />
    );
    fireEvent.click(screen.getByText('確認更新'));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('點擊取消會呼叫 onClose，不呼叫 onConfirm', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    const preview: MHMaterialUpdatePreview = { rarity: { old: null, new: '17' } };
    render(
      <MHMaterialUpdateModal isOpen onClose={onClose} onConfirm={onConfirm} materialName="爆鱗龍的鱗" preview={preview} />
    );
    fireEvent.click(screen.getByText('取消'));
    expect(onClose).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
