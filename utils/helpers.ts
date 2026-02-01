
/**
 * 計算屬性調整值 (Ability Modifier)
 */
export const getModifier = (score: number) => Math.floor((score - 10) / 2);

/**
 * 計算熟練獎勵 (Proficiency Bonus)
 */
export const getProfBonus = (level: number) => Math.ceil(level / 4) + 1;

/**
 * 解析字串運算，支援 "+5", "-2", "10+5" 等格式
 * 用於 HP、金幣、經驗值等數值的快速增減
 */
export const evaluateValue = (input: string, current: number, max?: number): number => {
  const text = input.replace(/\s+/g, '');
  if (!text) return current;
  
  let tokens = text.startsWith('+') || text.startsWith('-') 
    ? (current.toString() + text).split(/([\+\-])/) 
    : text.split(/([\+\-])/);
    
  const cleanTokens = tokens.filter(t => t !== '');
  if (cleanTokens.length === 0) return current;
  
  let result = parseInt(cleanTokens[0]) || 0;
  for (let i = 1; i < cleanTokens.length; i += 2) {
    const op = cleanTokens[i];
    const val = parseInt(cleanTokens[i + 1]) || 0;
    if (op === '+') result += val; 
    else if (op === '-') result -= val;
  }
  
  result = Math.max(0, result);
  if (max !== undefined) result = Math.min(max, result);
  return result;
};

/**
 * 通用數值設定函數 - 允許空字串輸入，在驗證時轉換為有效數字
 * 參考角色頁面屬性值的處理方式
 * @param value 字串輸入值
 * @param minValue 最小有效值，預設為1
 * @param allowZero 是否允許0作為有效值，預設為false
 * @param allowNegative 是否允許負數，預設烺false
 * @returns 解析結果 { isValid: boolean, numericValue: number }
 */
export const setNormalValue = (value: string, minValue: number = 1, allowZero: boolean = false, allowNegative: boolean = false): { isValid: boolean, numericValue: number } => {
  const numericValue = parseInt(value);
  
  if (isNaN(numericValue)) {
    return { isValid: false, numericValue: 0 };
  }
  
  const effectiveMin = allowNegative ? minValue : (allowZero ? 0 : minValue);
  const isValid = numericValue >= effectiveMin;
  
  return { isValid, numericValue: isValid ? numericValue : 0 };
};

/**
 * 小數值處理函數 - 專門處理允許小數點的數值（如金幣）
 * @param value 輸入值
 * @param currentValue 當前數值
 * @param options 配置選項
 * @returns 處理結果
 */
export const handleDecimalInput = (
  value: string,
  currentValue?: number,
  options: {
    minValue?: number;
    maxValue?: number;
    allowZero?: boolean;
    allowNegative?: boolean;
    decimalPlaces?: number; // 保留小數位數，預設2位
  } = {}
): { isValid: boolean, numericValue: number } => {
  const {
    minValue = 0,
    maxValue,
    allowZero = true,
    allowNegative = false,
    decimalPlaces = 2
  } = options;

  // 解析為浮點數
  const numericValue = parseFloat(value);

  if (isNaN(numericValue)) {
    return { isValid: false, numericValue: 0 };
  }

  // 四捨五入到指定小數位數
  const roundedValue = Math.round(numericValue * Math.pow(10, decimalPlaces)) / Math.pow(10, decimalPlaces);

  // 檢查範圍
  const effectiveMin = allowNegative ? minValue : (allowZero ? 0 : minValue);
  let isValid = roundedValue >= effectiveMin;
  if (maxValue !== undefined) {
    isValid = isValid && roundedValue <= maxValue;
  }

  return {
    isValid,
    numericValue: isValid ? roundedValue : 0
  };
};

/**
 * 統一數值處理函數 - 整合純數值驗證和運算表達式兩種模式
 * @param value 輸入值（純數字或運算表達式）
 * @param currentValue 當前數值（運算模式時需要）
 * @param options 配置選項
 * @returns 處理結果
 */
export const handleValueInput = (
  value: string, 
  currentValue?: number,
  options: {
    mode?: 'validate' | 'calculate';
    minValue?: number;
    maxValue?: number;
    allowZero?: boolean;
    allowNegative?: boolean;
  } = {}
): { isValid: boolean, numericValue: number, isCalculation: boolean } => {
  const { 
    mode = 'auto',
    minValue = 1, 
    maxValue, 
    allowZero = false,
    allowNegative = false
  } = options;

  // 自動檢測是否為運算表達式
  const isCalculationInput = value.includes('+') || value.includes('-') || 
                           (value.startsWith('+') || value.startsWith('-'));
  
  // 決定處理模式
  const actualMode = mode === 'auto' ? 
    (isCalculationInput ? 'calculate' : 'validate') : mode;

  if (actualMode === 'calculate' && currentValue !== undefined) {
    // 使用 evaluateValue 處理運算表達式
    const result = evaluateValue(value, currentValue, maxValue);
    const effectiveMin = allowNegative ? minValue : (allowZero ? 0 : minValue);
    const isValid = result >= effectiveMin && (maxValue === undefined || result <= maxValue);
    
    return { 
      isValid, 
      numericValue: result, 
      isCalculation: true 
    };
  } else {
    // 使用 setNormalValue 處理純數值
    const result = setNormalValue(value, minValue, allowZero, allowNegative);
    const finalValue = maxValue !== undefined ? 
      Math.min(result.numericValue, maxValue) : result.numericValue;
    
    return { 
      isValid: result.isValid && (maxValue === undefined || finalValue <= maxValue), 
      numericValue: finalValue, 
      isCalculation: false 
    };
  }
};
