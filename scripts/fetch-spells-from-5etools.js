#!/usr/bin/env node
/**
 * 從 5e.tools JSON 資料轉換為中文格式
 * 
 * 使用方式:
 * 1. 前往 https://github.com/5etools-mirror-1/5etools-mirror-1.github.io/tree/master/data/spells
 * 2. 下載 spells-phb.json 或其他法術檔案
 * 3. 放到專案 data/ 目錄下
 * 4. 執行: node scripts/fetch-spells-from-5etools.js data/spells-phb.json
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// 英文到中文的映射
const SCHOOL_MAP = {
  'A': '防護',  // Abjuration
  'C': '咒法',  // Conjuration
  'D': '預言',  // Divination
  'E': '惑控',  // Enchantment
  'V': '塑能',  // Evocation
  'I': '幻術',  // Illusion
  'N': '死靈',  // Necromancy
  'T': '變化'   // Transmutation
};

const TIME_MAP = {
  'action': '動作',
  'bonus': '附贈動作',
  'reaction': '反應',
  'minute': '分鐘',
  'hour': '小時'
};

const DURATION_MAP = {
  'instantaneous': '即效',
  'round': '輪',
  'minute': '分鐘',
  'hour': '小時',
  'permanent': '永久'
};

const RANGE_MAP = {
  'self': '自身',
  'touch': '接觸',
  'sight': '視野',
  'unlimited': '無限',
  'feet': '呎',
  'mile': '英里'
};

const SOURCE_MAP = {
  'PHB': 'PHB',
  'XGTE': 'XGTE',
  'TCE': 'TCOE',
  'SCAG': 'SCAG',
  'AI': 'AI',
  'EEPC': 'EEPC',
  'FTD': 'FTD',
  'GGR': 'GGR',
  'IDRotF': 'IDRotF'
};

function parseCastingTime(time) {
  if (!time || !time.time) return '動作';
  
  const { number = 1, unit } = time.time;
  const unitChinese = TIME_MAP[unit] || unit;
  
  if (unit === 'action') return '動作';
  if (unit === 'bonus') return '附贈動作';
  if (unit === 'reaction') return '反應';
  
  return number === 1 ? `1${unitChinese}` : `${number}${unitChinese}`;
}

function parseDuration(duration) {
  if (!duration || !duration[0]) return '即效';
  
  const d = duration[0];
  if (d.type === 'instant') return '即效';
  if (d.type === 'permanent') return '永久';
  
  const { duration: dur } = d;
  if (!dur) return '即效';
  
  const concentration = d.concentration ? '專注，至多' : '';
  const amount = dur.amount || 1;
  const unit = DURATION_MAP[dur.type] || dur.type;
  
  return concentration ? `${concentration}${amount}${unit}` : `${amount}${unit}`;
}

function parseRange(range) {
  if (!range) return '自身';
  
  if (range.type === 'point') {
    if (range.distance.type === 'self') return '自身';
    if (range.distance.type === 'touch') return '接觸';
    if (range.distance.type === 'sight') return '視野';
    if (range.distance.type === 'unlimited') return '無限';
    if (range.distance.type === 'feet') return `${range.distance.amount}呎`;
    if (range.distance.type === 'miles') return `${range.distance.amount}英里`;
  }
  
  return '自身';
}

function parseComponents(components) {
  if (!components) return { verbal: false, somatic: false, material: '' };
  
  return {
    verbal: components.v === true,
    somatic: components.s === true,
    material: components.m ? (typeof components.m === 'string' ? components.m : components.m.text || '') : ''
  };
}

function parseEntries(entries) {
  if (!entries) return '';
  
  return entries.map(entry => {
    if (typeof entry === 'string') return entry;
    if (entry.type === 'entries' && entry.items) {
      return entry.items.map(item => typeof item === 'string' ? item : '').join('\n');
    }
    return '';
  }).filter(Boolean).join('\n\n');
}

async function main() {
  const inputFile = process.argv[2];
  
  if (!inputFile) {
    console.error('❌ 請提供 5e.tools JSON 檔案路徑');
    console.log('');
    console.log('📥 獲取 5e.tools 資料步驟:');
    console.log('1. 前往 https://github.com/5etools-mirror-1/5etools-mirror-1.github.io/tree/master/data/spells');
    console.log('2. 下載 spells-phb.json（或其他法術來源檔案）');
    console.log('3. 放到專案 data/ 目錄下');
    console.log('4. 執行: node scripts/fetch-spells-from-5etools.js data/spells-phb.json');
    console.log('');
    process.exit(1);
  }
  
  console.log('📖 正在讀取 5e.tools 法術資料...');
  
  try {
    const fileContent = readFileSync(resolve(inputFile), 'utf-8');
    const data = JSON.parse(fileContent);
    
    if (!data.spell || !Array.isArray(data.spell)) {
      throw new Error('無法解析法術資料格式');
    }
    
    console.log(`✅ 成功讀取 ${data.spell.length} 個法術`);
    console.log('🔄 正在轉換格式...');
    
    const convertedSpells = data.spell.map(spell => {
      const components = parseComponents(spell.components);
      
      return {
        name: spell.name, // 保留英文名稱，需要手動翻譯
        level: spell.level,
        school: SCHOOL_MAP[spell.school] || '塑能',
        casting_time: parseCastingTime(spell.time?.[0]),
        duration: parseDuration(spell.duration),
        range: parseRange(spell.range),
        verbal: components.verbal,
        somatic: components.somatic,
        material: components.material,
        concentration: spell.duration?.[0]?.concentration === true,
        ritual: spell.meta?.ritual === true,
        source: SOURCE_MAP[spell.source] || '其他',
        description: parseEntries(spell.entries) // 保留英文描述，需要手動翻譯
      };
    });
    
    // 儲存為 JSON
    const outputPath = resolve('data/spells-5etools-raw.json');
    writeFileSync(outputPath, JSON.stringify(convertedSpells, null, 2), 'utf-8');
    
    console.log(`✅ 已儲存至: ${outputPath}`);
    console.log('');
    console.log('⚠️  注意: 法術名稱和描述仍為英文，需要手動翻譯成中文');
    console.log('📝 請編輯該檔案，將 name 和 description 欄位翻譯成中文後，再執行匯入腳本');
    
  } catch (error) {
    console.error('❌ 獲取失敗:', error.message);
    process.exit(1);
  }
}

main();
