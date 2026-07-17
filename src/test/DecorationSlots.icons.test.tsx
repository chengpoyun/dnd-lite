/**
 * DecorationSlots - 插槽圖示素材：
 * 已鑲嵌＝gem_blue.png（藍寶石）、未鑲嵌＝gem-small.png（實心深色寶石，剪影效果）
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { DecorationSlots } from '../../components/ui/DecorationSlots';

describe('DecorationSlots - 插槽圖示素材', () => {
  it('row 版面：未鑲嵌用 gem-small.png，已鑲嵌用 gem_blue.png', () => {
    const { container } = render(
      <DecorationSlots
        totalSlots={2}
        sockets={[{ decoration_name: '火龍逆鱗', note: '' }, null]}
      />
    );
    const imgs = Array.from(container.querySelectorAll('img'));
    expect(imgs).toHaveLength(2);
    expect(imgs[0].src).toContain('gem_blue.png');
    expect(imgs[1].src).toContain('gem-small.png');
    expect(imgs[1].src).not.toContain('gem-hollow');
  });

  it('list 版面：空插槽同樣用 gem-small.png', () => {
    const { container } = render(
      <DecorationSlots totalSlots={1} sockets={[null]} layout="list" />
    );
    const img = container.querySelector('img');
    expect(img?.src).toContain('gem-small.png');
    expect(img?.src).not.toContain('gem-hollow');
  });
});
