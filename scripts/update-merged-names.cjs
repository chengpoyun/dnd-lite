const fs = require('fs');

// 讀取兩個檔案
const mergedData = JSON.parse(fs.readFileSync('data/spells-merged.json', 'utf8'));
const spellsData = JSON.parse(fs.readFileSync('data/Spells.json', 'utf8'));

console.log('載入了', mergedData.length, '個 merged 法術');
console.log('載入了', spellsData.length, '個 Spells 法術');
console.log('');

// 更新名稱
let updatedCount = 0;
const updatedData = mergedData.map((spell, index) => {
  if (spellsData[index]) {
    // 提取括號前的中文名稱
    const nameMatch = spell.name.match(/^(.+?) \(/);
    if (nameMatch) {
      const chineseName = nameMatch[1];
      const englishName = spellsData[index].Name;
      
      spell.name = `${chineseName} (${englishName})`;
      updatedCount++;
      
      if (updatedCount <= 5) {
        console.log(`✅ ${updatedCount}. ${spell.name}`);
      }
    }
  }
  return spell;
});

// 寫回檔案
fs.writeFileSync('data/spells-merged.json', JSON.stringify(updatedData, null, 2));

console.log('');
console.log('✅ 完成！共更新', updatedCount, '個法術名稱');
