import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { BonusSourcesList } from '../../components/ui/BonusSourcesList';

describe('BonusSourcesList', () => {
  it('一般數值來源顯示格式化後的 +N/-N', () => {
    render(<BonusSourcesList title="加值來源" sources={[{ label: '力量護符', value: 3 }]} />);
    expect(screen.getByText('力量護符')).toBeInTheDocument();
    expect(screen.getByText('+3')).toBeInTheDocument();
  });

  it('displayText 有值時顯示該文字，取代 +N 格式化的數字（供骰子加成如 "1d8" 使用）', () => {
    render(
      <BonusSourcesList
        title="加值來源"
        sources={[{ label: '雷狼結晶', value: 0, displayText: '1d8' }]}
      />
    );
    expect(screen.getByText('雷狼結晶')).toBeInTheDocument();
    expect(screen.getByText('1d8')).toBeInTheDocument();
    expect(screen.queryByText('+0')).not.toBeInTheDocument();
  });

  it('hideValue 優先於 displayText（維持既有優劣勢來源列的行為）', () => {
    render(
      <BonusSourcesList
        title="加值來源"
        sources={[{ label: '警覺特性', value: 0, hideValue: true, displayText: '1d8' }]}
      />
    );
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByText('1d8')).not.toBeInTheDocument();
  });
});
