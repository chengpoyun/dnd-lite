const fs = require('fs');

// 讀取 CSV 檔案
const csvContent = fs.readFileSync('data/Spells.csv', 'utf8');
const csvLines = csvContent.split('\n').slice(1); // 跳過標題行

// 建立英文名稱對應表
const englishNames = {};
csvLines.forEach(line => {
  if (!line.trim()) return;
  
  // 提取第一個欄位（Name）
  const match = line.match(/^"([^"]+)"/);
  if (match) {
    const englishName = match[1];
    englishNames[englishName] = englishName;
  }
});

console.log('從 CSV 載入了', Object.keys(englishNames).length, '個英文法術名稱');

// 讀取 merged 檔案
const mergedData = JSON.parse(fs.readFileSync('data/spells-merged.json', 'utf8'));

// 修正名稱
let fixedCount = 0;
const updatedData = mergedData.map(spell => {
  // 檢查是否為「中文 (中文)」格式
  const nameMatch = spell.name.match(/^(.+) \((.+)\)$/);
  if (nameMatch) {
    const beforeParen = nameMatch[1];
    const insideParen = nameMatch[2];
    
    // 檢查括號內是否也是中文（非英文字母開頭）
    const startsWithEnglish = /^[A-Z]/.test(insideParen);
    if (!startsWithEnglish) {
      // 在 CSV 中查找對應的英文名稱
      if (englishNames[insideParen]) {
        spell.name = `${beforeParen} (${insideParen})`;
        fixedCount++;
        console.log(`修正: ${beforeParen} (${insideParen})`);
      } else {
        console.log(`⚠️  無法找到英文原文: ${spell.name}`);
      }
    }
  }
  return spell;
});

// 寫回檔案
fs.writeFileSync('data/spells-merged.json', JSON.stringify(updatedData, null, 2));

console.log('');
console.log('✅ 完成！共修正', fixedCount, '個法術名稱');
