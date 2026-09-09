import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LearnSpellModal } from '../../components/LearnSpellModal';
import * as SpellCatalog from '../../services/spellCatalog';
import type { SpellDef } from '../../types/spell';

vi.mock('../../services/spellCatalog', async () => {
  const actual = await vi.importActual<typeof import('../../services/spellCatalog')>(
    '../../services/spellCatalog'
  );
  return {
    ...actual,
    searchSpells: vi.fn(),
  };
});

function makeSpell(overrides: Partial<SpellDef> = {}): SpellDef {
  return {
    name: '火焰箭',
    nameEn: 'Fire Bolt',
    level: 0,
    castingTime: '1 動作',
    school: '塑能',
    concentration: false,
    ritual: false,
    duration: '立即',
    range: '120 呎',
    source: '法師',
    verbal: true,
    somatic: true,
    material: '',
    description: 'desc',
    ...overrides,
  };
}

describe('LearnSpellModal', () => {
  const mockedSearchSpells = SpellCatalog.searchSpells as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('未輸入關鍵字時預設依環位篩選（0環戲法）顯示法術', async () => {
    const spells = [makeSpell()];
    mockedSearchSpells.mockResolvedValue(spells);

    render(
      <LearnSpellModal
        isOpen
        onClose={vi.fn()}
        onLearnSpell={vi.fn()}
        onCreateNew={vi.fn()}
        learnedSpellNameEns={[]}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('火焰箭')).toBeInTheDocument();
    });
    expect(mockedSearchSpells).toHaveBeenCalledWith('', 0);
  });

  it('輸入搜尋文字時忽略環位篩選，全域搜尋', async () => {
    const spells = [makeSpell({ level: 3 })];
    mockedSearchSpells.mockResolvedValue(spells);

    render(
      <LearnSpellModal
        isOpen
        onClose={vi.fn()}
        onLearnSpell={vi.fn()}
        onCreateNew={vi.fn()}
        learnedSpellNameEns={[]}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('輸入中文或英文名稱...'), {
      target: { value: '火焰' },
    });

    await waitFor(() => {
      expect(mockedSearchSpells).toHaveBeenCalledWith('火焰', undefined);
    });
  });

  it('已學過的法術（依英文名比對）會從搜尋結果中濾除', async () => {
    const spells = [makeSpell({ nameEn: 'Fire Bolt' }), makeSpell({ name: '光亮術', nameEn: 'Light' })];
    mockedSearchSpells.mockResolvedValue(spells);

    render(
      <LearnSpellModal
        isOpen
        onClose={vi.fn()}
        onLearnSpell={vi.fn()}
        onCreateNew={vi.fn()}
        learnedSpellNameEns={['Fire Bolt']}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('光亮術')).toBeInTheDocument();
    });
    expect(screen.queryByText('火焰箭')).not.toBeInTheDocument();
  });

  it('點擊「學習」呼叫 onLearnSpell 並把該法術從列表移除', async () => {
    const spell = makeSpell();
    mockedSearchSpells.mockResolvedValue([spell]);
    const onLearnSpell = vi.fn().mockResolvedValue(undefined);

    render(
      <LearnSpellModal
        isOpen
        onClose={vi.fn()}
        onLearnSpell={onLearnSpell}
        onCreateNew={vi.fn()}
        learnedSpellNameEns={[]}
      />
    );

    await waitFor(() => screen.getByText('學習'));
    fireEvent.click(screen.getByText('學習'));

    await waitFor(() => {
      expect(onLearnSpell).toHaveBeenCalledWith(spell);
    });
    await waitFor(() => {
      expect(screen.queryByText('火焰箭')).not.toBeInTheDocument();
    });
  });

  it('切換環位篩選會用新環階重新查詢', async () => {
    mockedSearchSpells.mockResolvedValue([]);

    render(
      <LearnSpellModal
        isOpen
        onClose={vi.fn()}
        onLearnSpell={vi.fn()}
        onCreateNew={vi.fn()}
        learnedSpellNameEns={[]}
      />
    );

    await waitFor(() => expect(mockedSearchSpells).toHaveBeenCalledWith('', 0));

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '3' } });

    await waitFor(() => {
      expect(mockedSearchSpells).toHaveBeenCalledWith('', 3);
    });
  });
});
