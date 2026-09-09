import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AbilityFormFields } from '../../components/ui/AbilityFormFields';
import { ABILITY_SOURCE_ORDER, RECOVERY_TYPES } from '../../services/abilityService';

describe('AbilityFormFields', () => {
  it('顯示名稱、來源、恢復類型、描述欄位，並依 value 呈現目前值', () => {
    render(
      <AbilityFormFields
        name="靈巧動作"
        onNameChange={vi.fn()}
        namePlaceholder="輸入能力名稱"
        source="職業"
        onSourceChange={vi.fn()}
        recoveryType="短休"
        onRecoveryTypeChange={vi.fn()}
        description="描述文字"
        onDescriptionChange={vi.fn()}
        descriptionLabel="描述（選填）"
        descriptionPlaceholder="輸入能力描述"
        maxUses={2}
        onMaxUsesChange={vi.fn()}
        maxUsesLabel="最大使用次數（選填）"
      />
    );
    expect(screen.getByPlaceholderText('輸入能力名稱')).toHaveValue('靈巧動作');
    expect(screen.getByDisplayValue('描述文字')).toBeInTheDocument();
    expect(screen.getByText('最大使用次數（選填）')).toBeInTheDocument();
    ABILITY_SOURCE_ORDER.forEach((s) => expect(screen.getByText(s, { selector: 'option' })).toBeInTheDocument());
    RECOVERY_TYPES.forEach((r) => expect(screen.getAllByText(r, { selector: 'option' }).length).toBeGreaterThan(0));
  });

  it('recoveryType 為常駐時不顯示最大使用次數欄位', () => {
    render(
      <AbilityFormFields
        name=""
        onNameChange={vi.fn()}
        namePlaceholder="輸入能力名稱"
        source="職業"
        onSourceChange={vi.fn()}
        recoveryType="常駐"
        onRecoveryTypeChange={vi.fn()}
        description=""
        onDescriptionChange={vi.fn()}
        descriptionLabel="描述（選填）"
        descriptionPlaceholder="輸入能力描述"
        maxUses={0}
        onMaxUsesChange={vi.fn()}
        maxUsesLabel="最大使用次數（選填）"
      />
    );
    expect(screen.queryByText('最大使用次數（選填）')).not.toBeInTheDocument();
  });

  it('沒有傳 nameEn props 時不顯示英文名稱欄位', () => {
    render(
      <AbilityFormFields
        name=""
        onNameChange={vi.fn()}
        namePlaceholder="輸入能力名稱"
        source="職業"
        onSourceChange={vi.fn()}
        recoveryType="常駐"
        onRecoveryTypeChange={vi.fn()}
        description=""
        onDescriptionChange={vi.fn()}
        descriptionLabel="描述（選填）"
        descriptionPlaceholder="輸入能力描述"
        maxUses={0}
        onMaxUsesChange={vi.fn()}
        maxUsesLabel="最大使用次數（選填）"
      />
    );
    expect(screen.queryByText('英文名稱')).not.toBeInTheDocument();
  });

  it('有傳 nameEn/onNameEnChange 時顯示英文名稱欄位，輸入時呼叫 onNameEnChange', () => {
    const onNameEnChange = vi.fn();
    render(
      <AbilityFormFields
        name=""
        onNameChange={vi.fn()}
        namePlaceholder="輸入能力名稱"
        nameEn="Cunning Action"
        onNameEnChange={onNameEnChange}
        nameEnPlaceholder="例：Cunning Action"
        source="職業"
        onSourceChange={vi.fn()}
        recoveryType="常駐"
        onRecoveryTypeChange={vi.fn()}
        description=""
        onDescriptionChange={vi.fn()}
        descriptionLabel="描述（選填）"
        descriptionPlaceholder="輸入能力描述"
        maxUses={0}
        onMaxUsesChange={vi.fn()}
        maxUsesLabel="最大使用次數（選填）"
      />
    );
    const input = screen.getByPlaceholderText('例：Cunning Action');
    expect(input).toHaveValue('Cunning Action');
    fireEvent.change(input, { target: { value: 'New Name' } });
    expect(onNameEnChange).toHaveBeenCalledWith('New Name');
  });

  it('可插入額外內容（children）於描述與最大使用次數之間', () => {
    render(
      <AbilityFormFields
        name=""
        onNameChange={vi.fn()}
        namePlaceholder="輸入能力名稱"
        source="職業"
        onSourceChange={vi.fn()}
        recoveryType="常駐"
        onRecoveryTypeChange={vi.fn()}
        description=""
        onDescriptionChange={vi.fn()}
        descriptionLabel="描述（選填）"
        descriptionPlaceholder="輸入能力描述"
        maxUses={0}
        onMaxUsesChange={vi.fn()}
        maxUsesLabel="最大使用次數（選填）"
      >
        <div>額外的影響數值區塊</div>
      </AbilityFormFields>
    );
    expect(screen.getByText('額外的影響數值區塊')).toBeInTheDocument();
  });

  it('修改名稱／來源／恢復類型／描述／最大使用次數會分別呼叫對應 callback', () => {
    const onNameChange = vi.fn();
    const onSourceChange = vi.fn();
    const onRecoveryTypeChange = vi.fn();
    const onDescriptionChange = vi.fn();
    const onMaxUsesChange = vi.fn();
    render(
      <AbilityFormFields
        name=""
        onNameChange={onNameChange}
        namePlaceholder="輸入能力名稱"
        source="職業"
        onSourceChange={onSourceChange}
        recoveryType="短休"
        onRecoveryTypeChange={onRecoveryTypeChange}
        description=""
        onDescriptionChange={onDescriptionChange}
        descriptionLabel="描述（選填）"
        descriptionPlaceholder="輸入能力描述"
        maxUses={1}
        onMaxUsesChange={onMaxUsesChange}
        maxUsesLabel="最大使用次數（選填）"
      />
    );
    fireEvent.change(screen.getByPlaceholderText('輸入能力名稱'), { target: { value: '新名稱' } });
    expect(onNameChange).toHaveBeenCalledWith('新名稱');

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: '種族' } });
    expect(onSourceChange).toHaveBeenCalledWith('種族');
    fireEvent.change(selects[1], { target: { value: '長休' } });
    expect(onRecoveryTypeChange).toHaveBeenCalledWith('長休');

    fireEvent.change(screen.getByText('描述（選填）').nextElementSibling as HTMLElement, {
      target: { value: '新描述' },
    });
    expect(onDescriptionChange).toHaveBeenCalledWith('新描述');

    fireEvent.change(screen.getByDisplayValue('1'), { target: { value: '5' } });
    expect(onMaxUsesChange).toHaveBeenCalledWith(5);
  });
});
