#!/usr/bin/env node
/**
 * 從 data/field-selection-bonus.md 解析九大地形並輸出 data/terrain-rewards.json
 * 執行：node scripts/parse-terrain-rewards.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const mdPath = path.join(root, 'data', 'field-selection-bonus.md');
const outPath = path.join(root, 'data', 'terrain-rewards.json');

const md = fs.readFileSync(mdPath, 'utf-8');

const TERRAIN_HEADER = /^\*\*([^*]+)\*\*[（(]([^）)]+)[）)]\s*$/;
const LANDSCAPES = /適用地貌[：:]\s*(.+?)(?=\n|$)/;
const SKILL_DC = /(求生|觀察|自然)[（(]DC\s*(\d+)[）)]/g;
const TIER_LEVEL = /(初階|進階|高階|特階)[（(]等級\s*\*\*(\d+)\s*[\\~～]\s*(\d+)\*\*[）)]/;
const X_DIE = /X\s*座標\s*1d(6|10)/;
const TABLE_ROW = /\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*(?:([^|]+)\s*\|)?/;
const CATEGORY_CELL = /(\d+(?:~|～|\\~)\d+|\d+)[／/]\s*([^\s]+)\s+DC\s*(\d+)/;

const tierKeyMap = { '初階': 'initial', '進階': 'advanced', '高階': 'high', '特階': 'special' };
/** 表頭中文類別 → 英文 id（避免中文判讀錯誤） */
const categoryIdMap = {
  '骨堆': 'bonepiles',
  '魚類': 'fish',
  '昆蟲': 'insects',
  '礦物': 'minerals',
  '菇類': 'mushrooms',
  '植物': 'plants',
};

function parseLandscapes(line) {
  const m = line.match(LANDSCAPES);
  if (!m) return [];
  return m[1].split(/[、,]/).map((s) => s.trim()).filter(Boolean);
}

function parseSkillDc(block) {
  const skillDc = { 求生: 0, 觀察: 0, 自然: 0 };
  let match;
  const re = /(求生|觀察|自然)[（(]DC\s*(\d+)[）)]/g;
  while ((match = re.exec(block)) !== null) {
    skillDc[match[1]] = parseInt(match[2], 10);
  }
  return skillDc;
}

function parseCategoryHeaderCell(cell) {
  const m = cell.match(CATEGORY_CELL);
  if (!m) return null;
  const xKey = m[1].replace(/\\~|～/g, '~');
  const label = m[2].trim();
  const id = categoryIdMap[label] || label;
  const dc = parseInt(m[3], 10);
  return { xKey, id, label, backupDc: dc };
}

function parseTable(block, xDie) {
  const lines = block.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('|'));
  if (lines.length < 2) return null;
  const headerCells = lines[0].split('|').map((c) => c.trim()).filter(Boolean);
  const sep = lines[1];
  if (sep.includes('---') || sep.includes(':')) {
    // skip separator
  }
  /** 過濾掉表格內重複的分隔列（如 | :---: | :---: | ...），只保留資料列，最多 6 列 Y=1..6 */
  const isSeparatorRow = (line) => {
    const cells = line.split('|').map((c) => c.trim()).filter(Boolean);
    return cells.length > 0 && cells.every((cell) => /^:?-*:?$/.test(cell));
  };
  const dataRows = lines
    .slice(2)
    .filter((line) => !isSeparatorRow(line))
    .slice(0, 6);
  const categories = [];
  const colKeys = [];
  for (let i = 1; i < headerCells.length; i++) {
    const parsed = parseCategoryHeaderCell(headerCells[i]);
    if (parsed) {
      categories.push({
        id: parsed.id,
        label: parsed.label,
        backupDc: parsed.backupDc,
      });
      colKeys.push(parsed.xKey);
    }
  }
  const columns = {};
  for (let c = 0; c < colKeys.length; c++) {
    const xKey = colKeys[c];
    const col = [];
    for (let r = 0; r < dataRows.length; r++) {
      const parts = dataRows[r].split('|').map((cell) => cell.trim());
      const colIndex = c + 2;
      const raw = parts[colIndex]?.trim() ?? '';
      col.push(raw.replace(/\\/g, ''));
    }
    columns[xKey] = col;
  }
  return { categories, columns };
}

function findTierTable(section, tierName) {
  const lines = section.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const tierMatch = line.match(/(初階|進階|高階|特階)[（(]等級\s*\*+\s*(\d+)\s*[\\\s~～]+\s*(\d+)\s*\*+[）)]/);
    if (!tierMatch || tierMatch[1] !== tierName) continue;
    const levelMin = parseInt(tierMatch[2], 10);
    const levelMax = parseInt(tierMatch[3], 10);
    let xDie = 6;
    let tableStart = -1;
    for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
      const xm = lines[j].match(/X\s*座標\s*1d(6|10)/);
      if (xm) {
        xDie = parseInt(xm[1], 10);
        break;
      }
    }
    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j].trim().startsWith('|') && lines[j].includes('X 座標')) {
        tableStart = j;
        break;
      }
    }
    if (tableStart < 0) return null;
    const tableLines = lines.slice(tableStart, tableStart + 20).filter((l) => l.trim().startsWith('|'));
    const parsed = parseTable(tableLines.join('\n'), xDie);
    if (!parsed) return null;
    return {
      levelMin,
      levelMax,
      xDie: xDie === 10 ? 10 : 6,
      categories: parsed.categories,
      columns: parsed.columns,
    };
  }
  return null;
}

const terrainSections = md.split(/\n\*\*(?=[A-Za-z])/).filter((s) => s.includes('（') && s.includes('適用地貌'));
const result = [];

for (const section of terrainSections) {
  const nameMatch = section.match(/^([^*]+)\*\*[（(]([^）)]+)[）)]/);
  if (!nameMatch) continue;
  const nameEn = nameMatch[1].trim();
  const name = nameMatch[2].trim();
  const id = nameEn.replace(/\s+/g, '-').toLowerCase();

  const landscapes = parseLandscapes(section);
  const skillDc = parseSkillDc(section);

  const tiers = [];
  const tables = { initial: null, advanced: null, high: null, special: null };

  for (const [tierName, key] of Object.entries(tierKeyMap)) {
    const block = findTierTable(section, tierName);
    if (block) {
      tiers.push(key);
      tables[key] = block;
    }
  }

  result.push({
    id,
    name,
    nameEn,
    landscapes,
    skillDc,
    tiers,
    tables,
  });
}

fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf-8');
console.log('Wrote', outPath, '-', result.length, 'terrains');
