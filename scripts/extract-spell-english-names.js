/**
 * 從 spells-merged.json 提取英文名稱
 * 將 "魔法飛彈 (Magic Missile)" 拆分為：
 * - name: "魔法飛彈"
 * - name_en: "Magic Missile"
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputFile = path.join(__dirname, '../data/spells-merged.json');
const outputFile = path.join(__dirname, '../data/spells-merged.json');

console.log('📖 讀取法術資料...');
const spells = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));

console.log(`✅ 找到 ${spells.length} 個法術`);

let updated = 0;
let skipped = 0;

const reorderedSpells = spells.map((spell, index) => {
  // 如果已經有 name_en，就重新排序屬性
  if (spell.name_en) {
    const reordered = {
      name: spell.name,
      name_en: spell.name_en,
      level: spell.level,
      school: spell.school,
      casting_time: spell.casting_time,
      duration: spell.duration,
      range: spell.range,
      verbal: spell.verbal,
      somatic: spell.somatic,
      material: spell.material,
      concentration: spell.concentration,
      ritual: spell.ritual,
      source: spell.source,
      description: spell.description
    };
    
    updated++;
    
    if (index < 3) {
      console.log(`範例 ${index + 1}:`);
      console.log(`  中文: ${spell.name}`);
      console.log(`  英文: ${spell.name_en}`);
    }
    
    return reordered;
  }
  
  // 否則嘗試從名稱中提取
  const nameMatch = spell.name.match(/^(.+?)\s*\(([^)]+)\)$/);
  
  if (nameMatch) {
    const chineseName = nameMatch[1].trim();
    const englishName = nameMatch[2].trim();
    
    const reordered = {
      name: chineseName,
      name_en: englishName,
      level: spell.level,
      school: spell.school,
      casting_time: spell.casting_time,
      duration: spell.duration,
      range: spell.range,
      verbal: spell.verbal,
      somatic: spell.somatic,
      material: spell.material,
      concentration: spell.concentration,
      ritual: spell.ritual,
      source: spell.source,
      description: spell.description
    };
    
    updated++;
    
    if (index < 3) {
      console.log(`範例 ${index + 1}:`);
      console.log(`  原本: ${nameMatch[0]}`);
      console.log(`  中文: ${chineseName}`);
      console.log(`  英文: ${englishName}`);
    }
    
    return reordered;
  } else {
    skipped++;
    if (skipped <= 3) {
      console.log(`⚠️ 跳過 (無括號且無 name_en): ${spell.name}`);
    }
    return spell;
  }
});

console.log(`\n📝 處理結果:`);
console.log(`  ✅ 已更新: ${updated} 個法術`);
console.log(`  ⏭️ 已跳過: ${skipped} 個法術`);

console.log(`\n💾 寫入檔案: ${outputFile}`);
fs.writeFileSync(outputFile, JSON.stringify(reorderedSpells, null, 2), 'utf-8');

console.log('✨ 完成！');
