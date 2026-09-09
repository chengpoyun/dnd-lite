/**
 * CatalogSearchInput - 「標籤 + 搜尋文字輸入框」，從 LearnAbilityModal／LearnSpellModal／
 * LearnItemModal 三個目錄搜尋彈窗抽出（三者逐字重複，只有標籤文字與 placeholder 不同）。
 */
interface CatalogSearchInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

export function CatalogSearchInput({ label, value, onChange, placeholder }: CatalogSearchInputProps) {
  return (
    <div>
      <label className="block text-[14px] text-slate-400 mb-2">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500"
      />
    </div>
  );
}
