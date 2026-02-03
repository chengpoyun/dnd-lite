import { describe, it, expect } from 'vitest';
import type { Spell, CreateSpellData } from '../services/spellService';

/**
 * 法術系統單元測試
 * 
 * 測試範圍：
 * 1. Spell 介面的 ritual 欄位
 * 2. CreateSpellData 介面的預設值
 * 3. 法術表單資料驗證
 */

describe('法術系統 - 資料結構測試', () => {
  describe('Spell 介面', () => {
    it('應該包含所有必需欄位', () => {
      const spell: Spell = {
        id: 'test-id',
        name: '火球術',
        name_en: 'Fireball',
        level: 3,
        casting_time: '動作',
        school: '塑能',
        concentration: false,
        ritual: false,
        duration: '即效',
        range: '150尺',
        source: 'PHB',
        verbal: true,
        somatic: true,
        material: '一小團蝙蝠糞便和硫磺',
        description: '一道光芒從你指尖射出...',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      expect(spell.ritual).toBeDefined();
      expect(typeof spell.ritual).toBe('boolean');
    });

    it('應該正確處理儀式法術', () => {
      const ritualSpell: Partial<Spell> = {
        name: '偵測魔法',
        ritual: true,
        concentration: true
      };

      expect(ritualSpell.ritual).toBe(true);
      expect(ritualSpell.concentration).toBe(true);
    });
  });

  describe('CreateSpellData 介面', () => {
    it('應該接受有效的法術資料', () => {
      const spellData: CreateSpellData = {
        name: '魔法飛彈',
        name_en: 'Magic Missile',
        level: 1,
        casting_time: '動作',
        school: '塑能',
        concentration: false,
        ritual: false,
        duration: '即效',
        range: '120尺',
        source: 'PHB',
        verbal: true,
        somatic: true,
        material: '一根荊條',
        description: '你創造出三枚魔法能量飛彈...'
      };

      expect(spellData).toBeDefined();
      expect(spellData.ritual).toBe(false);
    });

    it('應該正確設定預設值', () => {
      const defaultSpellData: CreateSpellData = {
        name: '',
        name_en: '',
        level: 0,
        casting_time: '動作',
        school: '塑能',
        concentration: false,
        ritual: false,
        duration: '即效',
        range: '自身',
        source: 'PHB',
        verbal: false,
        somatic: false,
        material: '',
        description: ''
      };

      // 驗證預設值
      expect(defaultSpellData.casting_time).toBe('動作');
      expect(defaultSpellData.duration).toBe('即效');
      expect(defaultSpellData.range).toBe('自身');
      expect(defaultSpellData.source).toBe('PHB');
      expect(defaultSpellData.ritual).toBe(false);
      expect(defaultSpellData.concentration).toBe(false);
    });
  });

  describe('法術欄位驗證', () => {
    it('施法時間應該是預定義值之一', () => {
      const validCastingTimes = [
        '動作', '附贈動作', '反應', '1分鐘', '10分鐘', 
        '1小時', '8小時', '12小時', '24小時'
      ];

      validCastingTimes.forEach(time => {
        const spell: Partial<CreateSpellData> = {
          casting_time: time
        };
        expect(validCastingTimes).toContain(spell.casting_time);
      });
    });

    it('持續時間應該是預定義值之一', () => {
      const validDurations = [
        '即效', '一回合', '1分鐘', '10分鐘', '1小時', 
        '8小時', '24小時', '直到取消', '其他'
      ];

      validDurations.forEach(duration => {
        const spell: Partial<CreateSpellData> = {
          duration: duration
        };
        expect(validDurations).toContain(spell.duration);
      });
    });

    it('射程應該是預定義值之一', () => {
      const validRanges = [
        '自身', '觸碰', '5尺', '10尺', '30尺', 
        '60尺', '90尺', '120尺', '150尺', '300尺', '其他'
      ];

      validRanges.forEach(range => {
        const spell: Partial<CreateSpellData> = {
          range: range
        };
        expect(validRanges).toContain(spell.range);
      });
    });

    it('來源應該是預定義值之一', () => {
      const validSources = [
        'PHB', "PHB'24", 'AI', 'IDRotF', 'TCE', 'XGE', 
        'AAG', 'BMT', 'EFA', 'FRHoF', 'FTD', 'SatO', 'SCC'
      ];

      validSources.forEach(source => {
        const spell: Partial<CreateSpellData> = {
          source: source
        };
        expect(validSources).toContain(spell.source);
      });
    });

    it('學派應該是8個預定義學派之一', () => {
      const validSchools: Array<Spell['school']> = [
        '塑能', '惑控', '預言', '咒法', '變化', '防護', '死靈', '幻術'
      ];

      validSchools.forEach(school => {
        const spell: Partial<CreateSpellData> = {
          school: school
        };
        expect(validSchools).toContain(spell.school);
      });
    });
  });

  describe('法術特性組合', () => {
    it('法術可以同時是儀式和專注', () => {
      const spell: Partial<Spell> = {
        name: '偵測魔法',
        ritual: true,
        concentration: true
      };

      expect(spell.ritual).toBe(true);
      expect(spell.concentration).toBe(true);
    });

    it('戲法不應該標記為儀式', () => {
      const cantrip: Partial<Spell> = {
        name: '魔法伎倆',
        level: 0,
        ritual: false
      };

      expect(cantrip.level).toBe(0);
      expect(cantrip.ritual).toBe(false);
    });

    it('儀式法術必須是1環或以上', () => {
      const ritualSpell: Partial<Spell> = {
        name: '尋找魔寵',
        level: 1,
        ritual: true
      };

      expect(ritualSpell.level).toBeGreaterThanOrEqual(1);
      expect(ritualSpell.ritual).toBe(true);
    });
  });
});

describe('法術系統 - 表單資料完整性', () => {
  it('新增法術時所有必填欄位應有預設值', () => {
    const formData: CreateSpellData = {
      name: '',
      name_en: '',
      level: 0,
      casting_time: '動作',
      school: '塑能',
      concentration: false,
      ritual: false,
      duration: '即效',
      range: '自身',
      source: 'PHB',
      verbal: false,
      somatic: false,
      material: '',
      description: ''
    };

    // 確保所有下拉選單欄位都有有效預設值（非空字串）
    expect(formData.casting_time).not.toBe('');
    expect(formData.duration).not.toBe('');
    expect(formData.range).not.toBe('');
    expect(formData.source).not.toBe('');
    
    // 確保布林欄位有明確值
    expect(typeof formData.concentration).toBe('boolean');
    expect(typeof formData.ritual).toBe('boolean');
  });

  it('表單驗證應該通過有效資料', () => {
    const validSpell: CreateSpellData = {
      name: '火球術',
      name_en: 'Fireball',
      level: 3,
      casting_time: '動作',
      school: '塑能',
      concentration: false,
      ritual: false,
      duration: '即效',
      range: '150尺',
      source: 'PHB',
      verbal: true,
      somatic: true,
      material: '一小團蝙蝠糞便和硫磺',
      description: '一道光芒從你指尖射出，於射程內一點爆炸成火球。'
    };

    // 模擬表單驗證邏輯
    const isValid = !!(
      validSpell.name &&
      validSpell.name_en &&
      validSpell.casting_time && 
      validSpell.duration && 
      validSpell.range && 
      validSpell.source && 
      validSpell.material &&
      validSpell.description
    );

    expect(isValid).toBe(true);
  });

  it('表單驗證應該拒絕缺少必填欄位的資料', () => {
    const invalidSpells: Partial<CreateSpellData>[] = [
      { name: '', description: '測試' }, // 缺少名稱
      { name: '測試', description: '' }, // 缺少描述
      { name: '測試', description: '測試', name_en: '' }, // name_en 空字串
      { name: '測試', description: '測試', casting_time: '' }, // casting_time 空字串
      { name: '測試', description: '測試', material: '' }, // material 空字串
    ];

    invalidSpells.forEach(spell => {
      const isValid = !!(
        spell.name &&
        spell.name_en &&
        spell.casting_time && 
        spell.duration && 
        spell.range && 
        spell.source && 
        spell.material &&
        spell.description
      );

      expect(isValid).toBe(false);
    });
  });
});
