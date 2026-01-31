#!/usr/bin/env node
/**
 * 將 CSV 法術資料轉換為資料庫格式的 JSON（英文版）
 * 使用方式: node scripts/convert-csv-spells.js data/Spells.csv
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// 學派映射
const SCHOOL_MAP = {
  'Abjuration': '防護',
  'Conjuration': '咒法',
  'Divination': '預言',
  'Enchantment': '惑控',
  'Evocation': '塑能',
  'Illusion': '幻術',
  'Necromancy': '死靈',
  'Transmutation': '變化'
};

// 環位映射
const LEVEL_MAP = {
  'Cantrip': 0,
  '1st': 1,
  '2nd': 2,
  '3rd': 3,
  '4th': 4,
  '5th': 5,
  '6th': 6,
  '7th': 7,
  '8th': 8,
  '9th': 9
};

// 施法時間映射（符合資料庫約束）
const CASTING_TIME_MAP = {
  'Action': '動作',
  'Bonus': '附贈動作',
  'Bonus Action': '附贈動作',
  'Reaction': '反應',
  '1 Min.': '1分鐘',
  '10 Min.': '10分鐘',
  '1 Hr.': '1小時',
  '8 Hr.': '8小時',
  '12 Hr.': '12小時',
  '24 Hr.': '24小時'
};

// 持續時間映射（需要更新以符合約束）
function parseDuration(duration) {
  if (!duration) return '即效';
  
  if (duration.includes('Instantaneous')) return '即效';
  if (duration === '1 round') return '一回合';
  if (duration.includes('1 minute')) return '1分鐘';
  if (duration.includes('10 minute')) return '10分鐘';
  if (duration.includes('1 hour')) return '1小時';
  if (duration.includes('8 hour')) return '8小時';
  if (duration.includes('24 hour')) return '24小時';
  if (duration.includes('10 days') || duration.includes('Until dispelled')) return '直到取消';
  
  // 其他所有情況
  return '其他';
}

// 射程映射（需要更新以符合約束）
function parseRange(range) {
  if (!range) return '自身';
  
  if (range === 'Self' || range.includes('Self')) return '自身';
  if (range === 'Touch') return '觸碰';
  if (range === '5 feet') return '5尺';
  if (range === '10 feet') return '10尺';
  if (range === '30 feet') return '30尺';
  if (range === '60 feet') return '60尺';
  if (range === '90 feet') return '90尺';
  if (range === '120 feet') return '120尺';
  if (range === '150 feet') return '150尺';
  if (range === '300 feet') return '300尺';
  
  // 其他所有情況（包括 Sight, Unlimited, 500 feet 等）
  return '其他';
}

// 來源映射（符合資料庫約束）
const SOURCE_MAP = {
  'PHB\'14': 'PHB',
  'PHB\'24': 'PHB\'24',
  'XGE': 'XGE',
  'TCE': 'TCE',
  'AI': 'AI',
  'IDRotF': 'IDRotF',
  'AAG': 'AAG',
  'BMT': 'BMT',
  'EFA': 'EFA',
  'FRHoF': 'FRHoF',
  'FTD': 'FTD',
  'SatO': 'SatO',
  'SCC': 'SCC',
  'DMG\'14': 'PHB', // DMG 視為 PHB
  'SCAG': 'PHB', // SCAG 視為 PHB
  'DSotDQ': 'TCE', // 龍槍視為 TCE
  'VRGR': 'TCE', // Van Richten 視為 TCE
  'PSA': 'PHB', // Plane Shift 視為 PHB
  'GGR': 'PHB' // Guildmasters' Guide 視為 PHB
};

// 解析成分
function parseComponents(componentsStr) {
  if (!componentsStr) return { verbal: false, somatic: false, material: '' };
  
  const verbal = componentsStr.includes('V');
  const somatic = componentsStr.includes('S');
  
  // 提取材料描述
  let material = '';
  const materialMatch = componentsStr.match(/M \(([^)]+)\)/);
  if (materialMatch) {
    material = materialMatch[1];
  }
  
  return { verbal, somatic, material };
}

// 解析 CSV（處理引號內的逗號和換行）
function parseCSV(content) {
  const result = [];
  let current = '';
  let inQuotes = false;
  let fields = [];
  let rows = [];
  
  // 逐字元解析
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];
    
    if (char === '"' && nextChar === '"') {
      // 雙引號表示一個引號字元
      current += '"';
      i++; // 跳過下一個引號
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else if (char === '\n' && !inQuotes) {
      fields.push(current);
      if (fields.length > 1) {
        rows.push(fields);
      }
      fields = [];
      current = '';
    } else {
      current += char;
    }
  }
  
  // 處理最後一個欄位
  if (current || fields.length > 0) {
    fields.push(current);
    if (fields.length > 1) {
      rows.push(fields);
    }
  }
  
  return rows;
}

function main() {
  const inputFile = process.argv[2];
  
  if (!inputFile) {
    console.error('❌ 請提供 CSV 檔案路徑');
    console.log('使用方式: node scripts/convert-csv-spells.js data/Spells.csv');
    process.exit(1);
  }
  
  console.log('📖 正在讀取 CSV 檔案...');
  
  try {
    const fileContent = readFileSync(resolve(inputFile), 'utf-8');
    const rows = parseCSV(fileContent);
    
    console.log(`✅ 成功解析 ${rows.length - 1} 行資料`);
    console.log('🔄 正在轉換格式...');
    
    const spells = [];
    let skipped = 0;
    let warnings = [];
    
    // 跳過表頭，從第二行開始
    for (let i = 1; i < rows.length; i++) {
      const fields = rows[i];
      
      if (fields.length < 13) {
        console.log(`⚠️  第 ${i + 1} 行欄位不足，跳過`);
        skipped++;
        continue;
      }
      
      const [name, source, page, level, castingTime, duration, school, range, components, classes, optionalClasses, subclasses, text, atHigherLevels] = fields;
      
      // 移除學派中的 (ritual) 標記
      const schoolClean = school.replace(/\s*\(ritual\)\s*/gi, '').trim();
      
      // 解析環位
      const levelNum = LEVEL_MAP[level];
      if (levelNum === undefined) {
        console.log(`⚠️  第 ${i + 1} 行: 無法識別環位 "${level}"，跳過`);
        skipped++;
        continue;
      }
      
      // 解析學派
      const schoolChinese = SCHOOL_MAP[schoolClean];
      if (!schoolChinese) {
        console.log(`⚠️  第 ${i + 1} 行: 無法識別學派 "${schoolClean}"，跳過`);
        skipped++;
        continue;
      }
      
      // 解析施法時間
      let castingTimeChinese = CASTING_TIME_MAP[castingTime];
      if (!castingTimeChinese) {
        warnings.push(`法術 "${name}": 施法時間 "${castingTime}" 無映射，使用預設值"動作"`);
        castingTimeChinese = '動作';
      }
      
      // 解析持續時間
      const durationChinese = parseDuration(duration);
      
      // 解析射程
      const rangeChinese = parseRange(range);
      
      // 解析來源
      let sourceChinese = SOURCE_MAP[source] || source;
      if (!SOURCE_MAP[source]) {
        warnings.push(`法術 "${name}": 來源 "${source}" 無映射，保留原值`);
      }
      
      // 解析成分
      const comp = parseComponents(components);
      
      // 檢查是否為儀式法術（學派欄位包含 ritual 或持續時間包含 ritual）
      const isRitual = school.toLowerCase().includes('ritual');
      
      // 檢查是否需要專注
      const needsConcentration = duration.includes('Concentration');
      
      // 組合描述（包含升階效果）
      let description = text;
      if (atHigherLevels && atHigherLevels.trim()) {
        description += '\n\n' + atHigherLevels;
      }
      
      spells.push({
        name: name.trim(),
        level: levelNum,
        school: schoolChinese,
        casting_time: castingTimeChinese,
        duration: durationChinese,
        range: rangeChinese,
        verbal: comp.verbal,
        somatic: comp.somatic,
        material: comp.material,
        concentration: needsConcentration,
        ritual: isRitual,
        source: sourceChinese,
        description: description.trim()
      });
    }
    
    console.log(`✅ 成功轉換 ${spells.length} 個法術`);
    if (skipped > 0) {
      console.log(`⚠️  跳過 ${skipped} 個無效資料`);
    }
    
    // 顯示警告訊息
    if (warnings.length > 0) {
      console.log('\n⚠️  警告訊息:');
      warnings.slice(0, 10).forEach(w => console.log('   ' + w));
      if (warnings.length > 10) {
        console.log(`   ... 還有 ${warnings.length - 10} 個警告`);
      }
    }
    
    // 儲存為 JSON
    const outputPath = resolve('data/spells-en-converted.json');
    writeFileSync(outputPath, JSON.stringify(spells, null, 2), 'utf-8');
    
    console.log(`\n✅ 已儲存至: ${outputPath}`);
    console.log('\n📝 注意事項:');
    console.log('   1. 法術名稱和描述為英文，需要手動翻譯成中文');
    console.log('   2. 部分持續時間/射程被歸類為"其他"，可能需要手動調整');
    console.log('   3. 請檢查資料是否符合資料庫約束條件');
    console.log('\n📋 資料庫欄位約束:');
    console.log('   - casting_time: 動作, 附贈動作, 反應, 1分鐘, 10分鐘, 1小時, 8小時, 12小時, 24小時');
    console.log('   - duration: 即效, 一回合, 1分鐘, 10分鐘, 1小時, 8小時, 24小時, 直到取消, 其他');
    console.log('   - range: 自身, 觸碰, 5尺, 10尺, 30尺, 60尺, 90尺, 120尺, 150尺, 300尺, 其他');
    console.log('   - school: 塑能, 惑控, 預言, 咒法, 變化, 防護, 死靈, 幻術');
    console.log('   - source: PHB, PHB\'24, AI, IDRotF, TCE, XGE, AAG, BMT, EFA, FRHoF, FTD, SatO, SCC');
    
  } catch (error) {
    console.error('❌ 轉換失敗:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
