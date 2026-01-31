#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function verifySpells() {
  // 檢查總數
  const { data: allSpells, error, count } = await supabase
    .from('spells')
    .select('name', { count: 'exact' })
    .order('name');

  if (error) {
    console.error('❌ 錯誤:', error);
    return;
  }

  console.log('✅ 資料庫中的法術總數:', count);
  console.log('');

  // 檢查特定法術
  const checkSpells = ['冷凍射線', '光亮術', '偵測魔法'];
  console.log('🔍 檢查特定法術:');
  for (const spellName of checkSpells) {
    const { data } = await supabase
      .from('spells')
      .select('name, level, school')
      .eq('name', spellName)
      .single();

    if (data) {
      console.log(`   ✅ ${data.name} - ${data.level}環 ${data.school}`);
    } else {
      console.log(`   ❌ ${spellName} - 未找到`);
    }
  }

  console.log('');
  console.log('📝 前 10 個法術（按字母順序）:');
  allSpells.slice(0, 10).forEach(s => console.log(`   - ${s.name}`));
}

verifySpells();
