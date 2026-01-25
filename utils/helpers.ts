
export const getModifier = (score: number) => Math.floor((score - 10) / 2);

export const getProfBonus = (level: number) => Math.ceil(level / 4) + 1;

/**
 * 解析字串運算，支援 "+5", "-2", "10+5" 等格式
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
