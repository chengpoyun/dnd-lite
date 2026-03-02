import { describe, it, expect, vi } from 'vitest';
import { withSaveGuard } from '../../utils/saveGuard';

describe('withSaveGuard', () => {
  const mockCharacter = { id: 'char-1' };
  const mockValidate = vi.fn().mockResolvedValue(true);
  const mockSetSaving = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('無 currentCharacter 時不執行 fn 並回傳 false', async () => {
    const fn = vi.fn();
    const result = await withSaveGuard({
      currentCharacter: null,
      isSaving: false,
      validate: mockValidate,
      setSaving: mockSetSaving,
      fn,
    });
    expect(result).toBe(false);
    expect(fn).not.toHaveBeenCalled();
    expect(mockSetSaving).not.toHaveBeenCalled();
  });

  it('isSaving 為 true 時不執行 fn 並回傳 false', async () => {
    const fn = vi.fn();
    const result = await withSaveGuard({
      currentCharacter: mockCharacter,
      isSaving: true,
      validate: mockValidate,
      setSaving: mockSetSaving,
      fn,
    });
    expect(result).toBe(false);
    expect(fn).not.toHaveBeenCalled();
    expect(mockSetSaving).not.toHaveBeenCalled();
  });

  it('validate 回傳 false 時不執行 fn 並回傳 false', async () => {
    mockValidate.mockResolvedValueOnce(false);
    const fn = vi.fn();
    const result = await withSaveGuard({
      currentCharacter: mockCharacter,
      isSaving: false,
      validate: mockValidate,
      setSaving: mockSetSaving,
      fn,
    });
    expect(result).toBe(false);
    expect(fn).not.toHaveBeenCalled();
    expect(mockSetSaving).not.toHaveBeenCalled();
  });

  it('通過守衛時會 setSaving(true)、執行 fn、finally setSaving(false)', async () => {
    const fn = vi.fn().mockResolvedValue(true);
    const result = await withSaveGuard({
      currentCharacter: mockCharacter,
      isSaving: false,
      validate: mockValidate,
      setSaving: mockSetSaving,
      fn,
    });
    expect(result).toBe(true);
    expect(mockSetSaving).toHaveBeenCalledWith(true);
    expect(mockSetSaving).toHaveBeenCalledWith(false);
    expect(mockSetSaving).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenCalledOnce();
  });

  it('fn 拋錯時回傳 false 且仍會 setSaving(false)', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('save failed'));
    const result = await withSaveGuard({
      currentCharacter: mockCharacter,
      isSaving: false,
      validate: mockValidate,
      setSaving: mockSetSaving,
      fn,
    });
    expect(result).toBe(false);
    expect(mockSetSaving).toHaveBeenCalledWith(true);
    expect(mockSetSaving).toHaveBeenCalledWith(false);
  });
});
