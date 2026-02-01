const fs = require('fs');

// 讀取 CSV 檔案
const csvContent = fs.readFileSync('data/Spells.csv', 'utf8');
const lines = csvContent.split('\n');

// 提取標題行
const headers = lines[0].split('","').map(h => h.replace(/^"|"$/g, ''));

console.log('CSV 標題欄位:', headers);
console.log('');

// 解析資料行
const jsonData = [];

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  
  // 簡單的 CSV 解析（處理引號內的逗號）
  const values = [];
  let currentValue = '';
  let insideQuotes = false;
  
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    
    if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === ',' && !insideQuotes) {
      values.push(currentValue);
      currentValue = '';
    } else {
      currentValue += char;
    }
  }
  values.push(currentValue); // 加入最後一個值
  
  // 建立物件
  const obj = {};
  headers.forEach((header, index) => {
    obj[header] = values[index] || '';
  });
  
  jsonData.push(obj);
}

// 寫入 JSON 檔案
fs.writeFileSync('data/Spells.json', JSON.stringify(jsonData, null, 2));

console.log('✅ 已轉換為 JSON: data/Spells.json');
console.log('共', jsonData.length, '個法術');
console.log('');
console.log('前 3 個法術:');
jsonData.slice(0, 3).forEach((spell, i) => {
  console.log(`${i + 1}. ${spell.Name} (Level ${spell.Level})`);
});
