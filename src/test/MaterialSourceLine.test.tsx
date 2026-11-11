/**
 * MaterialSourceLine - MH素材「來源：怪物名　CR n」那一行（列表、詳情、獲得物品共用）
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MaterialSourceLine } from '../../components/ui/MaterialSourceLine';

describe('MaterialSourceLine', () => {
  it('同時顯示來源與 CR', () => {
    render(<MaterialSourceLine source="紅蓮爆鱗龍" rarity="22" />);
    expect(screen.getByText('來源：紅蓮爆鱗龍')).toBeInTheDocument();
    expect(screen.getByText('CR 22')).toBeInTheDocument();
  });

  it('沒有來源時只顯示 CR', () => {
    render(<MaterialSourceLine source={null} rarity="3" />);
    expect(screen.getByText('CR 3')).toBeInTheDocument();
    expect(screen.queryByText(/來源/)).not.toBeInTheDocument();
  });

  it('沒有 CR 時只顯示來源', () => {
    render(<MaterialSourceLine source="採集" rarity={null} />);
    expect(screen.getByText('來源：採集')).toBeInTheDocument();
    expect(screen.queryByText(/CR/)).not.toBeInTheDocument();
  });

  it('來源與 CR 都沒有時不渲染任何東西', () => {
    const { container } = render(<MaterialSourceLine source={null} rarity={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
