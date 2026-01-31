#!/usr/bin/env node
/**
 * 翻譯法術資料（英文 → 繁體中文）
 * 使用方式: node scripts/translate-spells.js data/spells-en-converted.json
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// 常用法術名稱翻譯對照表（基於 D&D 5E 官方中文版）
const SPELL_NAME_MAP = {
  // 戲法 (Cantrips)
  'Acid Splash': '強酸濺射',
  'Blade Ward': '劍刃防護',
  'Booming Blade': '轟雷劍',
  'Chill Touch': '寒顫之觸',
  'Control Flames': '控火術',
  'Create Bonfire': '創造篝火',
  'Dancing Lights': '舞光術',
  'Druidcraft': '德魯伊伎倆',
  'Eldritch Blast': '魔能爆',
  'Fire Bolt': '火焰箭',
  'Friends': '交友術',
  'Frostbite': '霜噬',
  'Green-Flame Blade': '翠炎劍',
  'Guidance': '神導術',
  'Gust': '舞風',
  'Infestation': '蟲群孳生',
  'Light': '光亮術',
  'Lightning Lure': '閃電牽引',
  'Mage Hand': '法師之手',
  'Magic Stone': '魔石術',
  'Mending': '修復術',
  'Message': '傳訊術',
  'Mind Sliver': '心靈之楔',
  'Minor Illusion': '次級幻象',
  'Mold Earth': '鑄土',
  'Poison Spray': '毒氣噴灑',
  'Prestidigitation': '魔法技倆',
  'Primal Savagery': '原始野性',
  'Produce Flame': '燃火術',
  'Ray of Frost': '冷凍射線',
  'Resistance': '提升抗力',
  'Sacred Flame': '聖焰',
  'Shape Water': '塑水',
  'Shillelagh': '橡棍術',
  'Shocking Grasp': '電爪',
  'Spare the Dying': '拯救瀕死',
  'Sword Burst': '劍刃爆發',
  'Thorn Whip': '荊棘之鞭',
  'Thunderclap': '鳴雷破',
  'Toll the Dead': '亡者喪鐘',
  'True Strike': '克敵機先',
  'Vicious Mockery': '惡毒嘲諷',
  'Word of Radiance': '光耀禱詞',
  
  // 1環法術
  'Absorb Elements': '元素吸收',
  'Alarm': '警報術',
  'Animal Friendship': '動物友誼',
  'Bane': '禍害',
  'Bless': '祝福術',
  'Burning Hands': '燃燒之手',
  'Charm Person': '魅惑人類',
  'Chromatic Orb': '七彩法球',
  'Color Spray': '七彩噴射',
  'Command': '命令術',
  'Compelled Duel': '強制決鬥',
  'Comprehend Languages': '通曉語言',
  'Create or Destroy Water': '造水術或毀水術',
  'Cure Wounds': '治療傷勢',
  'Detect Evil and Good': '偵測善惡',
  'Detect Magic': '偵測魔法',
  'Detect Poison and Disease': '偵測毒素和疾病',
  'Disguise Self': '易容術',
  'Dissonant Whispers': '不諧低語',
  'Divine Favor': '神恩',
  'Entangle': '糾纏術',
  'Expeditious Retreat': '快速撤退',
  'Faerie Fire': '妖火',
  'False Life': '偽生',
  'Feather Fall': '羽落術',
  'Find Familiar': '尋找魔寵',
  'Fog Cloud': '霧雲術',
  'Goodberry': '造糧術',
  'Grease': '油膩術',
  'Guiding Bolt': '導引箭',
  'Healing Word': '治療之語',
  'Hellish Rebuke': '地獄斥責',
  'Heroism': '英勇術',
  'Hex': '妖術',
  "Hunter's Mark": '獵人印記',
  'Identify': '鑑定術',
  'Illusory Script': '幻術文字',
  'Inflict Wounds': '造成傷勢',
  'Jump': '跳躍術',
  'Longstrider': '長行術',
  'Mage Armor': '法師護甲',
  'Magic Missile': '魔法飛彈',
  'Protection from Evil and Good': '防護善惡',
  'Purify Food and Drink': '淨化飲食',
  'Sanctuary': '庇護所',
  'Shield': '護盾術',
  'Shield of Faith': '信仰護盾',
  'Silent Image': '無聲幻影',
  'Sleep': '睡眠術',
  'Speak with Animals': '動物交談',
  'Thunderwave': '雷鳴波',
  'Unseen Servant': '隱形僕役',
  'Witch Bolt': '巫術箭',
  
  // 2環法術
  'Aid': '援助術',
  'Alter Self': '變身術',
  'Animal Messenger': '動物信使',
  'Arcane Lock': '秘法鎖',
  'Augury': '占卜術',
  'Barkskin': '樹膚術',
  'Beast Sense': '動物感知',
  'Blindness/Deafness': '目盲/耳聾',
  'Blur': '朦朧術',
  'Branding Smite': '烙印斬擊',
  'Calm Emotions': '安撫情緒',
  'Cloud of Daggers': '劍刃雲',
  'Continual Flame': '恆久火焰',
  'Crown of Madness': '瘋狂冠冕',
  'Darkness': '黑暗術',
  'Darkvision': '黑暗視覺',
  'Detect Thoughts': '偵測思想',
  'Enhance Ability': '強化屬性',
  'Enlarge/Reduce': '巨大化/縮小化',
  'Enthrall': '迷魂術',
  'Find Steed': '尋找坐騎',
  'Find Traps': '尋找陷阱',
  'Flame Blade': '火焰刀',
  'Flaming Sphere': '火焰球',
  'Gentle Repose': '溫和長眠',
  'Gust of Wind': '陣風術',
  'Heat Metal': '熾熱金屬',
  'Hold Person': '定身術',
  'Invisibility': '隱形術',
  'Knock': '敲擊術',
  'Lesser Restoration': '次級復原術',
  'Levitate': '浮空術',
  'Locate Animals or Plants': '定位動物或植物',
  'Locate Object': '定位物品',
  'Magic Mouth': '魔法嘴',
  'Magic Weapon': '魔化武器',
  'Mirror Image': '鏡影術',
  'Misty Step': '迷蹤步',
  'Moonbeam': '月光束',
  'Pass without Trace': '無跡步',
  'Prayer of Healing': '醫療禱言',
  'Protection from Poison': '防護毒素',
  'Ray of Enfeeblement': '虛弱射線',
  'Rope Trick': '繩技',
  'Scorching Ray': '灼熱射線',
  'See Invisibility': '識破隱形',
  'Shatter': '粉碎音波',
  'Silence': '沉默術',
  'Spider Climb': '蛛行術',
  'Spike Growth': '尖刺叢生',
  'Spiritual Weapon': '靈體武器',
  'Suggestion': '暗示術',
  'Warding Bond': '守護連結',
  'Web': '蛛網術',
  'Zone of Truth': '誠實區域',
  
  // 3環法術
  'Animate Dead': '活化死屍',
  'Beacon of Hope': '希望信標',
  'Bestow Curse': '降咒',
  'Blink': '閃現術',
  'Call Lightning': '召雷術',
  'Clairvoyance': '超距視聽',
  'Conjure Animals': '召喚動物',
  'Conjure Barrage': '召喚彈幕',
  'Counterspell': '反制法術',
  'Create Food and Water': '造糧術與造水術',
  'Daylight': '晝明術',
  'Dispel Magic': '解除魔法',
  'Fear': '恐懼術',
  'Fireball': '火球術',
  'Fly': '飛行術',
  'Gaseous Form': '氣態形體',
  'Glyph of Warding': '守護印記',
  'Haste': '加速術',
  'Hypnotic Pattern': '催眠圖紋',
  'Lightning Bolt': '閃電束',
  'Magic Circle': '法術環',
  'Major Image': '高等幻影',
  'Mass Healing Word': '群體治療之語',
  'Meld into Stone': '融身入石',
  'Nondetection': '反偵測',
  'Plant Growth': '植物滋長',
  'Protection from Energy': '能量防護',
  'Remove Curse': '移除詛咒',
  'Revivify': '復生術',
  'Sending': '捎信術',
  'Sleet Storm': '冰雹風暴',
  'Slow': '緩慢術',
  'Speak with Dead': '死者交談',
  'Speak with Plants': '植物交談',
  'Spirit Guardians': '靈體守衛',
  'Stinking Cloud': '臭雲術',
  'Tongues': '巧言術',
  'Vampiric Touch': '吸血鬼之觸',
  'Water Breathing': '水中呼吸',
  'Water Walk': '水面行走',
  'Wind Wall': '風牆術',
  
  // 4環法術
  'Arcane Eye': '秘法眼',
  'Banishment': '放逐術',
  'Blight': '枯萎術',
  'Confusion': '困惑術',
  'Conjure Minor Elementals': '召喚次級元素',
  'Conjure Woodland Beings': '召喚林地生物',
  'Control Water': '操控水體',
  'Death Ward': '防死結界',
  'Dimension Door': '次元門',
  'Divination': '預言術',
  'Dominate Beast': '支配野獸',
  'Fabricate': '創造術',
  'Fire Shield': '火焰護盾',
  'Freedom of Movement': '行動自如',
  'Giant Insect': '巨蟲術',
  'Greater Invisibility': '高等隱形術',
  'Guardian of Faith': '信仰守衛',
  'Hallucinatory Terrain': '幻景',
  'Ice Storm': '冰風暴',
  'Locate Creature': '定位生物',
  'Polymorph': '變形術',
  'Private Sanctum': '私人聖所',
  'Stoneskin': '石膚術',
  'Wall of Fire': '火牆術',
  
  // 5環法術
  'Animate Objects': '活化物品',
  'Antilife Shell': '反生命護殼',
  'Awaken': '喚醒術',
  'Cloudkill': '死雲術',
  'Commune': '神諭',
  'Commune with Nature': '自然交感',
  'Cone of Cold': '冰錐術',
  'Conjure Elemental': '召喚元素',
  'Contact Other Plane': '異界聯絡',
  'Contagion': '傳染病',
  'Creation': '創生術',
  'Dispel Evil and Good': '驅逐善惡',
  'Dominate Person': '支配人類',
  'Dream': '入夢術',
  'Flame Strike': '焰擊術',
  'Geas': '強制任務',
  'Greater Restoration': '高等復原術',
  'Hallow': '聖居',
  'Hold Monster': '怪物定身',
  'Insect Plague': '蟲群術',
  'Legend Lore': '傳奇知識',
  'Mass Cure Wounds': '群體治療傷勢',
  'Mislead': '誤導術',
  'Modify Memory': '竄改記憶',
  'Passwall': '穿牆術',
  'Planar Binding': '異界誓縛',
  'Raise Dead': '死者復活',
  'Reincarnate': '轉生術',
  'Scrying': '探知術',
  'Seeming': '變貌術',
  'Teleportation Circle': '傳送法陣',
  'Tree Stride': '樹間穿梭',
  'Wall of Force': '力牆術',
  'Wall of Stone': '石牆術',
  
  // 6環法術
  'Arcane Gate': '秘法門',
  'Blade Barrier': '刃障',
  'Chain Lightning': '連鎖閃電',
  'Circle of Death': '死亡輪迴',
  'Conjure Fey': '召喚精類',
  'Contingency': '預備引導',
  'Create Undead': '創造不死生物',
  'Disintegrate': '解離術',
  'Eyebite': '凶眼術',
  'Find the Path': '尋路術',
  'Flesh to Stone': '石化術',
  'Forbiddance': '禁錮術',
  'Globe of Invulnerability': '無敵法球',
  'Guards and Wards': '守衛與結界',
  'Harm': '傷害術',
  'Heal': '醫療術',
  "Heroes' Feast": '英雄宴',
  'Instant Summons': '即刻呼喚',
  'Irresistible Dance': '無法抗拒之舞',
  'Magic Jar': '魔法壺',
  'Mass Suggestion': '群體暗示',
  'Move Earth': '移土術',
  'Planar Ally': '異界盟友',
  'Programmed Illusion': '預設幻象',
  'Sunbeam': '陽焰射線',
  'Transport via Plants': '植物通道',
  'True Seeing': '真知術',
  'Wall of Ice': '冰牆術',
  'Wall of Thorns': '荊棘牆',
  'Wind Walk': '化身為風',
  'Word of Recall': '回憶之語',
  
  // 7環法術
  'Arcane Sword': '秘法劍',
  'Conjure Celestial': '召喚天界生物',
  'Delayed Blast Fireball': '延遲爆裂火球',
  'Divine Word': '神聖之語',
  'Etherealness': '靈界化',
  'Finger of Death': '死亡一指',
  'Fire Storm': '烈焰風暴',
  'Forcecage': '力場牢籠',
  'Magnificent Mansion': '豪宅術',
  'Mirage Arcane': '秘法幻景',
  'Plane Shift': '異界傳送',
  'Prismatic Spray': '七彩噴射',
  'Project Image': '幻影投射',
  'Regenerate': '再生術',
  'Resurrection': '復活術',
  'Reverse Gravity': '反轉重力',
  'Sequester': '隱居術',
  'Simulacrum': '擬像術',
  'Symbol': '徽記',
  'Teleport': '傳送術',
  
  // 8環法術
  'Animal Shapes': '動物變形',
  'Antimagic Field': '反魔法力場',
  'Antipathy/Sympathy': '反感/共感',
  'Clone': '複製術',
  'Control Weather': '操控天氣',
  'Demiplane': '半位面',
  'Dominate Monster': '支配怪物',
  'Earthquake': '地震術',
  'Feeblemind': '虛弱心智',
  'Glibness': '巧舌如簧',
  'Holy Aura': '神聖靈光',
  'Incendiary Cloud': '燃燒雲霧',
  'Maze': '迷宮術',
  'Mind Blank': '心靈空白',
  'Power Word Stun': '震懾真言',
  'Sunburst': '陽焰爆',
  'Telepathy': '心靈感應',
  'Tsunami': '海嘯',
  
  // 9環法術
  'Astral Projection': '星界投射',
  'Foresight': '預知術',
  'Gate': '異界之門',
  'Imprisonment': '禁錮術',
  'Mass Heal': '群體醫療',
  'Meteor Swarm': '流星爆',
  'Power Word Kill': '殺戮真言',
  'Prismatic Wall': '七彩牆',
  'Shapechange': '變形自如',
  'Storm of Vengeance': '復仇風暴',
  'Time Stop': '時間停止',
  'True Polymorph': '真實變形',
  'True Resurrection': '真實復活',
  'Weird': '怪誕術',
  'Wish': '祈願術'
};

// 材料成分翻譯
const MATERIAL_TRANSLATIONS = {
  'a bit of bat fur': '一點蝙蝠毛皮',
  'a bit of sponge': '一小塊海綿',
  'a drop of blood, a piece of flesh, and a pinch of bone dust': '一滴血、一片肉和一撮骨粉',
  "a red dragon's scale": '一片紅龍鱗片',
  'a strip of white cloth': '一條白布',
  'a bell and silver wire': '一個鈴鐺和銀線',
  'a moonstone worth 50+ GP': '價值50+GP的月長石',
  'a morsel of food': '一小塊食物',
  'a small piece of lead': '一小塊鉛',
  'a pinch of sulfur and saltpeter': '一撮硫磺和硝石',
  'a bit of phosphorus or wychwood': '一點磷或魔法木',
  'a firefly or phosphorescent moss': '一隻螢火蟲或螢光苔蘚',
  'a gilded acorn worth 200+ GP': '價值200+GP的鍍金橡實'
};

// 翻譯文本（簡單的關鍵詞替換）
function translateText(text) {
  if (!text) return text;
  
  let translated = text;
  
  // 常見遊戲術語翻譯
  const termMap = {
    'Hit Points': '生命值',
    'Hit Point': '生命值',
    'saving throw': '豁免擲骰',
    'Dexterity': '敏捷',
    'Constitution': '體質',
    'Wisdom': '感知',
    'Intelligence': '智力',
    'Strength': '力量',
    'Charisma': '魅力',
    'spell slot': '法術位',
    'Bonus Action': '附贈動作',
    'Magic action': '魔法動作',
    'Reaction': '反應',
    'Concentration': '專注',
    'damage': '傷害',
    'Necrotic damage': '黯蝕傷害',
    'Psychic damage': '心靈傷害',
    'Fire damage': '火焰傷害',
    'Cold damage': '寒冷傷害',
    'Lightning damage': '閃電傷害',
    'Thunder damage': '雷鳴傷害',
    'Acid damage': '強酸傷害',
    'Poison damage': '毒素傷害',
    'Radiant damage': '光耀傷害',
    'Force damage': '力場傷害',
    'Bludgeoning damage': '鈍擊傷害',
    'Piercing damage': '穿刺傷害',
    'Slashing damage': '揮砍傷害',
    'At Higher Levels': '升階施法',
    'When you cast this spell using a spell slot of': '當你使用',
    'level or higher': '環或更高的法術位施放此法術時',
    'for each slot level above': '每高於',
    'the damage increases by': '傷害增加',
    'Cantrip Upgrade': '戲法升級',
    'The damage increases by': '傷害增加',
    'when you reach levels': '當你達到',
    'and': '和',
    'Charmed': '魅惑',
    'Frightened': '恐懼',
    'Grappled': '擒抱',
    'Restrained': '束縛',
    'Stunned': '昏迷',
    'Paralyzed': '麻痺',
    'Petrified': '石化',
    'Poisoned': '中毒',
    'Prone': '倒地',
    'Unconscious': '失去意識',
    'within range': '射程內',
    'you can see': '你能看見的',
    'must succeed on a': '必須成功通過一次',
    'on a failed save': '豁免失敗時',
    'on a successful save': '豁免成功時',
    'takes': '受到',
    'half as much damage': '一半傷害',
    'The target': '目標',
    'The creature': '該生物',
    'until the spell ends': '直到法術結束',
    'for the duration': '在持續時間內',
    'as an action': '以一個動作',
    'as a bonus action': '以一個附贈動作',
    'as a reaction': '以一個反應'
  };
  
  // 注意：這只是基本翻譯，完整的遊戲規則翻譯需要更複雜的處理
  // 由於描述文本非常複雜，我只進行部分關鍵詞替換
  
  return text; // 暫時返回原文，完整翻譯需要更多工作
}

function main() {
  const inputFile = process.argv[2];
  
  if (!inputFile) {
    console.error('❌ 請提供 JSON 檔案路徑');
    console.log('使用方式: node scripts/translate-spells.js data/spells-en-converted.json');
    process.exit(1);
  }
  
  console.log('📖 正在讀取法術資料...');
  
  try {
    const fileContent = readFileSync(resolve(inputFile), 'utf-8');
    const spells = JSON.parse(fileContent);
    
    console.log(`✅ 讀取 ${spells.length} 個法術`);
    console.log('🔄 正在翻譯...');
    
    let translatedCount = 0;
    let untranslatedCount = 0;
    
    const translated = spells.map(spell => {
      // 翻譯法術名稱
      const translatedName = SPELL_NAME_MAP[spell.name] || spell.name;
      if (SPELL_NAME_MAP[spell.name]) {
        translatedCount++;
      } else {
        untranslatedCount++;
      }
      
      // 翻譯材料成分
      const translatedMaterial = MATERIAL_TRANSLATIONS[spell.material] || spell.material;
      
      // 翻譯描述（暫時保留英文，因為遊戲規則翻譯非常複雜）
      const translatedDescription = spell.description;
      
      return {
        ...spell,
        name: translatedName,
        material: translatedMaterial,
        description: translatedDescription
      };
    });
    
    // 儲存翻譯結果
    const outputPath = resolve('data/spells-translated.json');
    writeFileSync(outputPath, JSON.stringify(translated, null, 2), 'utf-8');
    
    console.log(`\n✅ 翻譯完成！`);
    console.log(`   📝 已翻譯法術名稱: ${translatedCount}`);
    console.log(`   ⚠️  未翻譯法術名稱: ${untranslatedCount}`);
    console.log(`   💾 已儲存至: ${outputPath}`);
    console.log(`\n⚠️  注意：`);
    console.log(`   - 法術描述因涉及複雜遊戲規則，暫保留英文`);
    console.log(`   - 部分材料成分暫保留英文`);
    console.log(`   - 建議使用專業翻譯或參考官方中文版進行完整翻譯`);
    
  } catch (error) {
    console.error('❌ 翻譯失敗:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
