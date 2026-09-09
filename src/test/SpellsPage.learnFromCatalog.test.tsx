/**
 * SpellsPage - 從本地法術目錄學習法術
 * 「學習法術」不再查詢 DB（getAllSpells/learnSpell 已移除），
 * 而是搜尋本地目錄（spellCatalog.searchSpells），選定後以目錄資料直接建立角色法術。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SpellsPage } from '../../components/SpellsPage';
import * as spellService from '../../services/spellService';
import * as spellCatalog from '../../services/spellCatalog';
import type { ClassInfo } from '../../types';
import type { SpellDef } from '../../types/spell';

vi.mock('../../services/spellService', async (importOriginal) => {
  const actual = await importOriginal<typeof spellService>();
  return {
    ...actual,
    getCharacterSpells: vi.fn(),
    getPreparedSpellsCount: vi.fn(),
    getPreparedCantripsCount: vi.fn(),
    createCharacterSpell: vi.fn(),
  };
});

vi.mock('../../services/spellCatalog', async (importOriginal) => {
  const actual = await importOriginal<typeof spellCatalog>();
  return {
    ...actual,
    searchSpells: vi.fn(),
  };
});

const showErrorMock = vi.fn();
vi.mock('../../hooks/useToast', () => ({
  useToast: () => ({
    showSuccess: vi.fn(),
    showError: showErrorMock,
  }),
}));

const mockGetCharacterSpells = vi.mocked(spellService.getCharacterSpells);
const mockGetPreparedSpellsCount = vi.mocked(spellService.getPreparedSpellsCount);
const mockGetPreparedCantripsCount = vi.mocked(spellService.getPreparedCantripsCount);
const mockCreateCharacterSpell = vi.mocked(spellService.createCharacterSpell);
const mockSearchSpells = vi.mocked(spellCatalog.searchSpells);

const defaultProps = {
  characterId: 'char-1',
  characterClasses: [{ name: '法師', level: 3, hitDie: 'd6', isPrimary: true }] as ClassInfo[],
  intelligenceModifier: 2,
};

describe('SpellsPage - 從本地法術目錄學習', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    showErrorMock.mockClear();
    mockGetCharacterSpells.mockResolvedValue([]);
    mockGetPreparedSpellsCount.mockResolvedValue(0);
    mockGetPreparedCantripsCount.mockResolvedValue(0);
  });

  it('搜尋目錄、點選法術「學習」，會以目錄資料呼叫 createCharacterSpell（不查 DB 目錄）', async () => {
    const spell: SpellDef = {
      name: '光亮術',
      nameEn: 'Light',
      level: 0,
      castingTime: '動作',
      school: '塑能',
      concentration: false,
      ritual: false,
      duration: '1小時',
      range: '觸碰',
      source: "PHB'24",
      verbal: true,
      somatic: false,
      material: '螢火蟲',
      description: '你觸摸一個物體...',
    };
    mockSearchSpells.mockResolvedValue([spell]);
    mockCreateCharacterSpell.mockResolvedValue({
      success: true,
      item: { id: 'cs-1', character_id: 'char-1', is_prepared: false, created_at: '' } as any,
    });

    render(<SpellsPage {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('+ 學習新法術')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('+ 學習新法術'));

    await waitFor(() => {
      expect(screen.getByText('光亮術')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('學習'));

    await waitFor(() => {
      expect(mockCreateCharacterSpell).toHaveBeenCalledWith(
        'char-1',
        expect.objectContaining({
          name: '光亮術',
          name_en: 'Light',
          level: 0,
          school: '塑能',
        })
      );
    });
  });

  // 回歸測試：對應「按下學習後沒有任何反應」的臭蟲——createCharacterSpell 失敗時
  // （例如舊版把 material 誤判為必填），使用者應該看到錯誤提示，而不是畫面上什麼都沒發生。
  it('學習失敗時應顯示錯誤提示，而不是靜默無反應', async () => {
    const spell: SpellDef = {
      name: '亡者喪鐘',
      nameEn: 'Toll the Dead',
      level: 0,
      castingTime: '動作',
      school: '死靈',
      concentration: false,
      ritual: false,
      duration: '即效',
      range: '60尺',
      source: "PHB'24",
      verbal: true,
      somatic: true,
      material: '',
      description: '...',
    };
    mockSearchSpells.mockResolvedValue([spell]);
    mockCreateCharacterSpell.mockResolvedValue({ success: false, error: '所有欄位皆為必填' });

    render(<SpellsPage {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('+ 學習新法術')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('+ 學習新法術'));

    await waitFor(() => {
      expect(screen.getByText('亡者喪鐘')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('學習'));

    await waitFor(() => {
      expect(showErrorMock).toHaveBeenCalledWith('所有欄位皆為必填');
    });
  });
});
