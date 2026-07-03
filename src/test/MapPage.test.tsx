// 地圖頁面（世界地圖圖片瀏覽，支援拖曳/縮放）的基本渲染測試
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MapPage } from '../../components/MapPage';

beforeAll(() => {
  // react-zoom-pan-pinch 的 centerOnInit 會建立 ResizeObserver，jsdom 預設沒有實作
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
});

describe('MapPage - 地圖頁面', () => {
  it('渲染地圖圖片與重置視圖按鈕', () => {
    render(<MapPage />);

    const img = screen.getByAltText('科瓦雷地圖') as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img.src).toContain('maps/kovar-map.jpg');

    expect(screen.getByText('重置視圖')).toBeInTheDocument();
  });
});
