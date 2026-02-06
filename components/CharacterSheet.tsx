import React, { useState, useEffect } from 'react';
import { CharacterStats, CustomRecord } from '../types';
import { getModifier, getProfBonus, evaluateValue, handleValueInput, handleDecimalInput, formatDecimal } from '../utils/helpers';
import { getAvailableClasses, getClassHitDie, formatClassDisplay } from '../utils/classUtils';
import { PageContainer, Card, Button, Title, Subtitle, Input, BackButton } from './ui';
import { STYLES, combineStyles } from '../styles/common';

interface CharacterSheetProps {
  stats: CharacterStats;
  setStats: React.Dispatch<React.SetStateAction<CharacterStats>>;
  characterId?: string;
  onSaveSkillProficiency?: (skillName: string, level: number) => Promise<boolean>;
  onSaveSavingThrowProficiencies?: (proficiencies: string[]) => Promise<boolean>;
  onSaveCharacterBasicInfo?: (name: string, characterClass: string, level: number) => Promise<boolean>;
  onSaveAbilityScores?: (abilityScores: CharacterStats['abilityScores']) => Promise<boolean>;
  onSaveCurrencyAndExp?: (gp: number, exp: number) => Promise<boolean>;
  onSaveExtraData?: (extraData: any) => Promise<boolean>;
  onSaveAvatarUrl?: (avatarUrl: string) => Promise<boolean>;
}

const STAT_LABELS: Record<keyof CharacterStats['abilityScores'], string> = {
  str: "力量", dex: "敏捷", con: "體質", int: "智力", wis: "感知", cha: "魅力"
};

const SKILLS_MAP: { name: string; base: keyof CharacterStats['abilityScores'] }[] = [
  { name: "運動", base: "str" }, { name: "特技", base: "dex" },
  { name: "巧手", base: "dex" }, { name: "隱匿", base: "dex" },
  { name: "奧秘", base: "int" }, { name: "歷史", base: "int" },
  { name: "調查", base: "int" }, { name: "自然", base: "int" },
  { name: "宗教", base: "int" }, { name: "馴獸", base: "wis" },
  { name: "觀察", base: "wis" }, { name: "醫術", base: "wis" },
  { name: "察覺", base: "wis" }, { name: "生存", base: "wis" },
  { name: "欺瞞", base: "cha" }, { name: "威嚇", base: "cha" },
  { name: "表演", base: "cha" }, { name: "說服", base: "cha" },
];

const ABILITY_KEYS: (keyof CharacterStats['abilityScores'])[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

export const CharacterSheet: React.FC<CharacterSheetProps> = ({ 
  stats, 
  setStats,
  characterId,
  onSaveSkillProficiency, 
  onSaveSavingThrowProficiencies,
  onSaveCharacterBasicInfo,
  onSaveAbilityScores,
  onSaveCurrencyAndExp,
  onSaveExtraData,
  onSaveAvatarUrl
}) => {
  const [activeModal, setActiveModal] = useState<'info' | 'multiclass' | 'abilities' | 'currency' | 'downtime' | 'renown' | 'skill_detail' | 'add_record' | 'edit_record' | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<{ name: string; base: keyof CharacterStats['abilityScores'] } | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<CustomRecord | null>(null);
  
  const [editInfo, setEditInfo] = useState({ name: stats.name, class: stats.class, level: stats.level.toString() });
  
  // 兼職編輯狀態
  const [editClasses, setEditClasses] = useState<Array<{id: string, name: string, level: number, isPrimary: boolean}>>(
    stats.classes?.map((c, index) => ({ 
      id: `class-${index}`, 
      name: c.name, 
      level: c.level, 
      isPrimary: c.isPrimary 
    })) || [{ id: 'class-0', name: stats.class, level: stats.level, isPrimary: true }]
  );
  const [newClassName, setNewClassName] = useState('');
  const [newClassLevel, setNewClassLevel] = useState('1');
  const [editAbilities, setEditAbilities] = useState(
    Object.fromEntries(Object.entries(stats.abilityScores).map(([k, v]) => [k, v.toString()]))
  );
  const [editAbilityBonuses, setEditAbilityBonuses] = useState<Record<string, string>>({});
  const [editModifierBonuses, setEditModifierBonuses] = useState<Record<string, string>>({});
  const [editSavingProfs, setEditSavingProfs] = useState<(keyof CharacterStats['abilityScores'])[]>([]);
  const [tempGPValue, setTempGPValue] = useState('');
  const [tempExpValue, setTempExpValue] = useState('');
  const [tempDowntimeValue, setTempDowntimeValue] = useState('');
  const [tempRenownUsedValue, setTempRenownUsedValue] = useState('');
  const [tempRenownTotalValue, setTempRenownTotalValue] = useState('');

  const [newRecord, setNewRecord] = useState({ name: '', value: '', note: '' });

  const profBonus = getProfBonus(stats.level);

  // 同步兼職編輯狀態
  useEffect(() => {
    // 只在 stats.classes 真正存在且有數據時才設定多職業
    if (stats.classes && stats.classes.length > 0) {
      setEditClasses(
        stats.classes.map((c, index) => ({ 
          id: c.id || `class-${index}`, 
          name: c.name, 
          level: c.level, 
          isPrimary: c.isPrimary 
        }))
      );
    } else {
      // 只有在明確沒有多職業數據時才使用單職業後備
      setEditClasses([{ id: 'class-0', name: stats.class, level: stats.level, isPrimary: true }]);
    }
  }, [stats.classes, stats.class, stats.level]);

  const handleSkillClick = (skill: typeof SKILLS_MAP[0]) => {
    setSelectedSkill(skill);
    setActiveModal('skill_detail');
  };

  const setSkillProficiency = async (skillName: string, level: number) => {
    // 立即保存到數據庫
    if (onSaveSkillProficiency) {
      const success = await onSaveSkillProficiency(skillName, level)
      if (success) {
        console.log(`✅ 技能 ${skillName} 保存成功`)
      } else {
        console.error(`❌ 技能 ${skillName} 保存失敗`)
      }
    }
    
    // 更新本地狀態
    setStats(prev => {
      const newProfs = { ...prev.proficiencies };
      // 不冊除技能，而是明確設定為 0、1 或 2
      newProfs[skillName] = level;
      console.log('📝 更新後的技能熟練度:', newProfs)
      return { ...prev, proficiencies: newProfs };
    });
    setActiveModal(null);
  };

  const openInfoModal = () => {
    setEditInfo({ name: stats.name, class: stats.class, level: stats.level.toString() });
    setActiveModal('info');
  };

  const openAbilitiesModal = () => {
    setEditAbilities(
      Object.fromEntries(Object.entries(stats.abilityScores).map(([k, v]) => [k, v.toString()]))
    );
    // 初始化屬性加成（從 extraData 讀取或預設為 0）
    setEditAbilityBonuses(
      Object.fromEntries(ABILITY_KEYS.map(k => [k, (stats.extraData?.abilityBonuses?.[k] || 0).toString()]))
    );
    // 初始化調整值加成
    setEditModifierBonuses(
      Object.fromEntries(ABILITY_KEYS.map(k => [k, (stats.extraData?.modifierBonuses?.[k] || 0).toString()]))
    );
    setEditSavingProfs([...(stats.savingProficiencies || [])]);
    setActiveModal('abilities');
  };

  const openCurrencyModal = () => {
    setTempGPValue(stats.currency.gp.toString());
    setActiveModal('currency');
  };

  const openExpModal = () => {
    setTempExpValue(stats.exp.toString());
    setActiveModal('exp');
  };

  const openDowntimeModal = () => {
    setTempDowntimeValue(stats.downtime.toString());
    setActiveModal('downtime');
  };

  const openRenownModal = () => {
    setTempRenownUsedValue(stats.renown.used.toString());
    setTempRenownTotalValue(stats.renown.total.toString());
    setActiveModal('renown');
  };

  const openAddRecordModal = () => {
    setNewRecord({ name: '', value: '', note: '' });
    setActiveModal('add_record');
  };

  const openEditRecordModal = (record: CustomRecord) => {
    setSelectedRecord(record);
    setNewRecord({ name: record.name, value: record.value, note: record.note || '' });
    setActiveModal('edit_record');
  };

  // 預覽計算 - 使用統一的數值處理函數
  const gpResult = handleDecimalInput(tempGPValue, stats.currency.gp, {
    minValue: 0,
    allowZero: true,
    decimalPlaces: 2
  });
  const gpPreview = gpResult.isValid ? gpResult.numericValue : stats.currency.gp;
  
  const expResult = handleValueInput(tempExpValue, stats.exp, {
    minValue: 0,
    allowZero: true
  });
  const expPreview = expResult.isValid ? expResult.numericValue : stats.exp;
  
  const downtimeResult = handleValueInput(tempDowntimeValue, stats.downtime, {
    minValue: 0,
    allowZero: true
  });
  const downtimePreview = downtimeResult.isValid ? downtimeResult.numericValue : stats.downtime;
  
  const renownUsedResult = handleValueInput(tempRenownUsedValue, stats.renown.used, {
    minValue: 0,
    allowZero: true
  });
  const renownUsedPreview = renownUsedResult.isValid ? renownUsedResult.numericValue : stats.renown.used;
  
  const renownTotalResult = handleValueInput(tempRenownTotalValue, stats.renown.total, {
    minValue: 0,
    allowZero: true
  });
  const renownTotalPreview = renownTotalResult.isValid ? renownTotalResult.numericValue : stats.renown.total;

  const saveInfo = async () => { 
    // 驗證等級不為空
    const level = parseInt(editInfo.level);
    if (!level || level < 1) {
      setActiveModal(null);
      return;
    }
    
    // 立即保存到資料庫
    if (onSaveCharacterBasicInfo) {
      const success = await onSaveCharacterBasicInfo(editInfo.name, editInfo.class, level)
      if (success) {
        console.log('✅ 角色基本信息保存成功')
      } else {
        console.error('❌ 角色基本信息保存失敗')
      }
    }
    
    // 更新本地狀態
    setStats(prev => ({ ...prev, name: editInfo.name, class: editInfo.class, level })); 
    setActiveModal(null); 
  };

  // 兼職管理函數
  const openMulticlassModal = () => {
    // 初始化編輯狀態
    setEditClasses(
      stats.classes?.map((c, index) => ({ 
        id: `class-${index}`, 
        name: c.name, 
        level: c.level, 
        isPrimary: c.isPrimary 
      })) || [{ id: 'class-0', name: stats.class, level: stats.level, isPrimary: true }]
    );
    setActiveModal('multiclass');
  };

  const addNewClass = async () => {
    const level = parseInt(newClassLevel) || 1;
    if (!newClassName || level < 1) return;
    
    const newId = `class-${Date.now()}`;
    const updatedClasses = [
      ...editClasses,
      { id: newId, name: newClassName, level: level, isPrimary: false }
    ];
    
    setEditClasses(updatedClasses);
    setNewClassName('');
    setNewClassLevel('1');
    
    // 自動保存多職業資料
    const totalLevel = updatedClasses.reduce((sum, c) => sum + c.level, 0);
    const primaryClass = updatedClasses.find(c => c.isPrimary) || updatedClasses[0];
    
    // 同時保存基本信息和多職業資料
    const basicInfoPromise = onSaveCharacterBasicInfo ? 
      onSaveCharacterBasicInfo(stats.name, primaryClass.name, totalLevel) : 
      Promise.resolve(true);
      
    const multiclassPromise = onSaveExtraData ? 
      onSaveExtraData({ ...stats.extraData, classes: updatedClasses }) : 
      Promise.resolve(true);
    
    try {
      const [basicSuccess, extraSuccess] = await Promise.all([basicInfoPromise, multiclassPromise]);
      
      if (basicSuccess && extraSuccess) {
        console.log('✅ 新增兼職保存成功');
        // 更新本地狀態
        setStats(prev => ({ 
          ...prev, 
          class: primaryClass.name,
          level: totalLevel,
          classes: updatedClasses.map(c => ({
            id: c.id,
            name: c.name,
            level: c.level,
            hitDie: getClassHitDie(c.name),
            isPrimary: c.isPrimary
          }))
        }));
        // 關閉模態框
        setActiveModal(null);
      } else {
        console.error('❌ 新增兼職保存失敗', { basicSuccess, extraSuccess });
      }
    } catch (error) {
      console.error('❌ 新增兼職保存錯誤:', error);
    }
  };

  const removeClassById = (classId: string) => {
    setEditClasses(prev => {
      const filtered = prev.filter(c => c.id !== classId);
      // 確保至少有一個主職業
      if (filtered.length > 0 && !filtered.some(c => c.isPrimary)) {
        filtered[0].isPrimary = true;
      }
      return filtered;
    });
  };

  const updateClassLevel = (classId: string, newLevel: number) => {
    if (newLevel < 1) return;
    setEditClasses(prev => 
      prev.map(c => c.id === classId ? { ...c, level: newLevel } : c)
    );
  };

  const setPrimaryClass = (classId: string) => {
    setEditClasses(prev => 
      prev.map(c => ({ ...c, isPrimary: c.id === classId }))
    );
  };

  const saveMulticlassInfo = async () => {
    if (editClasses.length === 0) return;
    
    // 計算總等級
    const totalLevel = editClasses.reduce((sum, c) => sum + c.level, 0);
    const primaryClass = editClasses.find(c => c.isPrimary) || editClasses[0];
    
    // TODO: 這裡需要實現保存兼職資料的逻輯
    // 暫時保存為傳統格式
    if (onSaveCharacterBasicInfo) {
      const success = await onSaveCharacterBasicInfo(
        editInfo.name, 
        primaryClass.name, 
        totalLevel
      );
      
      if (success) {
        console.log('✅ 兼職資料保存成功');
        // 更新本地狀態
        setStats(prev => ({ 
          ...prev, 
          name: editInfo.name,
          class: primaryClass.name,
          level: totalLevel,
          classes: editClasses.map(c => ({
            name: c.name,
            level: c.level,
            hitDie: getClassHitDie(c.name),
            isPrimary: c.isPrimary
          }))
        }));
        setActiveModal(null);
      } else {
        console.error('❌ 兼職資料保存失敗');
      }
    }
  };
  
  // 管理現有兼職的函數
  const updateExistingClassLevel = async (classIndex: number, newLevel: number) => {
    if (newLevel < 1 || !stats.classes) return;
    
    const updatedClasses = stats.classes.map((classInfo, index) => 
      index === classIndex ? { ...classInfo, level: newLevel } : classInfo
    );
    
    const totalLevel = updatedClasses.reduce((sum, c) => sum + c.level, 0);
    const primaryClass = updatedClasses.find(c => c.isPrimary) || updatedClasses[0];
    
    // 保存到數據庫
    if (onSaveCharacterBasicInfo) {
      const success = await onSaveCharacterBasicInfo(
        stats.name, 
        primaryClass.name, 
        totalLevel
      );
      
      if (success) {
        console.log('✅ 兼職等級更新成功');
        setStats(prev => ({ 
          ...prev, 
          level: totalLevel,
          classes: updatedClasses
        }));
      } else {
        console.error('❌ 兼職等級更新失敗');
      }
    }
  };
  
  const setExistingClassAsPrimary = async (classIndex: number) => {
    if (!stats.classes) return;
    
    const updatedClasses = stats.classes.map((classInfo, index) => 
      ({ ...classInfo, isPrimary: index === classIndex })
    );
    
    const totalLevel = updatedClasses.reduce((sum, c) => sum + c.level, 0);
    const primaryClass = updatedClasses[classIndex];
    
    // 保存到數據庫
    if (onSaveCharacterBasicInfo) {
      const success = await onSaveCharacterBasicInfo(
        stats.name, 
        primaryClass.name, 
        totalLevel
      );
      
      if (success) {
        console.log('✅ 主職業設定成功');
        setStats(prev => ({ 
          ...prev, 
          class: primaryClass.name,
          level: totalLevel,
          classes: updatedClasses
        }));
      } else {
        console.error('❌ 主職業設定失敗');
      }
    }
  };
  
  const deleteExistingClass = async (classIndex: number) => {
    if (!stats.classes || stats.classes.length <= 1) return;
    
    const updatedClasses = stats.classes.filter((_, index) => index !== classIndex);
    
    // 確保有主職業
    if (!updatedClasses.some(c => c.isPrimary)) {
      updatedClasses[0].isPrimary = true;
    }
    
    const totalLevel = updatedClasses.reduce((sum, c) => sum + c.level, 0);
    const primaryClass = updatedClasses.find(c => c.isPrimary) || updatedClasses[0];
    
    // 保存到數據庫
    if (onSaveCharacterBasicInfo) {
      const success = await onSaveCharacterBasicInfo(
        stats.name, 
        primaryClass.name, 
        totalLevel
      );
      
      if (success) {
        console.log('✅ 兼職刪除成功');
        setStats(prev => ({ 
          ...prev, 
          class: primaryClass.name,
          level: totalLevel,
          classes: updatedClasses
        }));
      } else {
        console.error('❌ 兼職刪除失敗');
      }
    }
  };
  
  // 簡化的職業編輯函數
  const updateEditClass = (index: number, field: 'name' | 'level', value: string | number) => {
    setEditClasses(prev => 
      prev.map((classInfo, i) => 
        i === index ? { 
          ...classInfo, 
          [field]: value // 直接使用值，不強制轉換
        } : classInfo
      )
    );
  };
  
  const removeEditClass = (index: number) => {
    if (editClasses.length <= 1) return; // 保護最後一個職業
    
    setEditClasses(prev => {
      const filtered = prev.filter((_, i) => i !== index);
      // 確保有主職業
      if (!filtered.some(c => c.isPrimary)) {
        filtered[0].isPrimary = true;
      }
      return filtered;
    });
  };
  
  const addNewEditClass = () => {
    const availableClasses = getAvailableClasses().filter(
      className => !editClasses.some(c => c.name === className)
    );
    
    if (availableClasses.length === 0) return; // 沒有可用的職業
    
    const newId = `class-${Date.now()}`;
    setEditClasses(prev => [
      ...prev,
      { 
        id: newId, 
        name: availableClasses[0], 
        level: 1, 
        isPrimary: false 
      }
    ]);
  };
  
  const saveInfoWithClasses = async () => {
    if (editClasses.length === 0) return;
    
    if (!characterId) {
      console.error('characterId 不存在，無法保存多職業資料');
      return;
    }
    
    // 驗證所有等級為有效數字
    const validClasses = editClasses.map(c => ({
      ...c,
      level: Math.max(1, parseInt(String(c.level)) || 1) // 確保等級至少為1
    }));
    
    // 計算總等級
    const totalLevel = validClasses.reduce((sum, c) => sum + c.level, 0);
    const primaryClass = validClasses.find(c => c.isPrimary) || validClasses[0];
    
    try {
      // 1. 保存基本信息（角色名稱、主職業、總等級）
      const basicSuccess = onSaveCharacterBasicInfo ? 
        await onSaveCharacterBasicInfo(editInfo.name, primaryClass.name, totalLevel) : 
        true;
        
      if (!basicSuccess) {
        console.error('基本信息保存失敗');
        return;
      }
      
      // 2. 使用 MulticlassService 保存多職業數據到專用表
      const { MulticlassService } = await import('../services/multiclassService');
      
      // 先刪除所有現有職業
      const { supabase } = await import('../lib/supabase');
      await supabase
        .from('character_classes')
        .delete()
        .eq('character_id', characterId);
      
      // 保存每個職業
      for (const classInfo of validClasses) {
        const { error } = await supabase
          .from('character_classes')
          .insert({
            character_id: characterId,
            class_name: classInfo.name,
            class_level: classInfo.level,
            hit_die: getClassHitDie(classInfo.name),
            is_primary: classInfo.isPrimary
          });
          
        if (error) {
          console.error('職業保存失敗:', classInfo.name, error);
        }
      }
      
      // 3. 重新計算並保存生命骰池
      await MulticlassService.recalculateHitDicePools(characterId);
      
      // 4. 更新本地狀態
      setStats(prev => ({ 
        ...prev, 
        name: editInfo.name,
        class: primaryClass.name,
        level: totalLevel,
        classes: validClasses.map(c => ({
          id: c.id,
          name: c.name,
          level: c.level,
          hitDie: getClassHitDie(c.name),
          isPrimary: c.isPrimary
        }))
      }));
      
      setActiveModal(null);
      
      // 5. 重新載入角色數據以獲取最新的 hitDicePools
      if (onSaveExtraData) {
        // 觸發一次額外數據保存以刷新狀態
        await onSaveExtraData({ ...stats.extraData });
      }
      
    } catch (error) {
      console.error('❌ 角色資料保存錯誤:', error);
    }
  };
  
  const saveAbilities = async () => { 
    // 驗證所有能力值不為空
    const abilities: any = {};
    let hasInvalidValue = false;
    
    for (const key in editAbilities) {
      const result = handleValueInput(editAbilities[key], undefined, {
        minValue: -99,
        maxValue: 99,
        allowZero: true,
        allowNegative: true
      });
      
      if (!result.isValid) {
        hasInvalidValue = true;
        break;
      }
      abilities[key] = result.numericValue;
    }
    
    if (hasInvalidValue) {
      setActiveModal(null);
      return;
    }

    // 處理加成數據
    const abilityBonuses: Record<string, number> = {};
    const modifierBonuses: Record<string, number> = {};
    
    for (const key of ABILITY_KEYS) {
      const bonusResult = handleValueInput(editAbilityBonuses[key] || '0', undefined, { 
        minValue: -99,
        maxValue: 99,
        allowZero: true, 
        allowNegative: true 
      });
      const modBonusResult = handleValueInput(editModifierBonuses[key] || '0', undefined, { 
        minValue: -99,
        maxValue: 99,
        allowZero: true, 
        allowNegative: true 
      });
      
      abilityBonuses[key] = bonusResult.isValid ? bonusResult.numericValue : 0;
      modifierBonuses[key] = modBonusResult.isValid ? modBonusResult.numericValue : 0;
    }

    // 立即保存豁免熟練度到資料庫
    if (onSaveSavingThrowProficiencies) {
      const success = await onSaveSavingThrowProficiencies([...editSavingProfs])
      if (success) {
        console.log('✅ 豁免熟練度保存成功')
      } else {
        console.error('❌ 豁免熟練度保存失敗')
      }
    }

    // 立即保存能力值到資料庫
    if (onSaveAbilityScores) {
      const success = await onSaveAbilityScores(abilities)
      if (success) {
        console.log('✅ 能力值保存成功')
      } else {
        console.error('❌ 能力值保存失敗')
      }
    }
    
    // 保存加成數據到 extraData
    if (onSaveExtraData) {
      const newExtraData = {
        ...stats.extraData,
        abilityBonuses,
        modifierBonuses
      };
      const success = await onSaveExtraData(newExtraData);
      if (success) {
        console.log('✅ 屬性加成保存成功');
      } else {
        console.error('❌ 屬性加成保存失敗');
      }
    }
    
    // 更新本地狀態
    setStats(prev => ({ 
      ...prev, 
      abilityScores: abilities, 
      savingProficiencies: [...editSavingProfs],
      extraData: {
        ...prev.extraData,
        abilityBonuses,
        modifierBonuses
      }
    })); 
    setActiveModal(null); 
  };
  const toggleSavingProf = (key: keyof CharacterStats['abilityScores']) => { setEditSavingProfs(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]); };
  
  const saveCurrency = async () => {
    // 驗證金幣不為空或無效
    if (isNaN(gpPreview) || gpPreview < 0) {
      setActiveModal(null);
      return;
    }
    
    // 更新本地狀態
    setStats(prev => ({ 
      ...prev, 
      currency: { ...prev.currency, gp: gpPreview }
    })); 
    setActiveModal(null); 
    
    // 立即保存到資料庫
    if (onSaveCurrencyAndExp) {
      const success = await onSaveCurrencyAndExp(gpPreview, stats.exp)
      if (success) {
        console.log('✅ 金幣保存成功')
      } else {
        console.error('❌ 金幣保存失敗')
      }
    }
  };
  
  const saveExp = async () => {
    // 驗證經驗值不為空或無效
    if (isNaN(expPreview) || expPreview < 0) {
      setActiveModal(null);
      return;
    }
    
    // 更新本地狀態
    setStats(prev => ({ 
      ...prev, 
      exp: expPreview 
    })); 
    setActiveModal(null); 
    
    // 立即保存到資料庫
    if (onSaveCurrencyAndExp) {
      const success = await onSaveCurrencyAndExp(stats.currency.gp, expPreview)
      if (success) {
        console.log('✅ 經驗值保存成功')
      } else {
        console.error('❌ 經驗值保存失敗')
      }
    }
  };

  const saveDowntime = async () => { 
    // 立即保存到資料庫
    if (onSaveExtraData) {
      // 保留現有的extra_data，只更新downtime
      const extraData = {
        downtime: downtimePreview,
        renown: stats.renown || { used: 0, total: 0 },
        prestige: stats.prestige || { org: '', level: 0, rankName: '' },
        customRecords: stats.customRecords || [],
        attacks: stats.attacks || []
      }
      
      const success = await onSaveExtraData(extraData)
      if (success) {
        console.log('✅ Downtime保存成功')
      } else {
        console.error('❌ Downtime保存失敗')
      }
    }
    
    setStats(prev => ({ ...prev, downtime: downtimePreview })); 
    setActiveModal(null); 
  };
  const saveRenown = async () => { 
    // 立即保存到資料庫
    if (onSaveExtraData) {
      // 保留現有的extra_data，只更新renown
      const extraData = {
        downtime: stats.downtime || 0,
        renown: { used: renownUsedPreview, total: renownTotalPreview },
        prestige: stats.prestige || { org: '', level: 0, rankName: '' },
        customRecords: stats.customRecords || [],
        attacks: stats.attacks || []
      }
      
      const success = await onSaveExtraData(extraData)
      if (success) {
        console.log('✅ Renown保存成功')
      } else {
        console.error('❌ Renown保存失敗')
      }
    }
    
    setStats(prev => ({ ...prev, renown: { used: renownUsedPreview, total: renownTotalPreview } })); 
    setActiveModal(null); 
  };

  const handleSaveNewRecord = async () => {
    if (!newRecord.name || !newRecord.value) return;
    const record: CustomRecord = {
      id: Date.now().toString(),
      name: newRecord.name,
      value: newRecord.value,
      note: newRecord.note
    };
    
    const updatedCustomRecords = [...(stats.customRecords || []), record];
    setStats(prev => ({
      ...prev,
      customRecords: updatedCustomRecords
    }));
    
    // 保存到資料庫
    const extraData = {
      downtime: stats.downtime || 0,
      renown: stats.renown || { used: 0, total: 0 },
      prestige: stats.prestige || { org: '', level: 0, rankName: '' },
      customRecords: updatedCustomRecords,
      attacks: stats.attacks || []
    }
    
    const success = await onSaveExtraData(extraData)
    if (success) {
      console.log('✅ 冒險紀錄保存成功')
    } else {
      console.error('❌ 冒險紀錄保存失敗')
    }
    
    setActiveModal(null);
  };

  const handleUpdateRecord = async () => {
    if (!selectedRecord || !newRecord.name || !newRecord.value) return;
    
    const updatedCustomRecords = (stats.customRecords || []).map(r => 
      r.id === selectedRecord.id ? { ...r, name: newRecord.name, value: newRecord.value, note: newRecord.note } : r
    );
    
    setStats(prev => ({
      ...prev,
      customRecords: updatedCustomRecords
    }));
    
    // 保存到資料庫
    const extraData = {
      downtime: stats.downtime || 0,
      renown: stats.renown || { used: 0, total: 0 },
      prestige: stats.prestige || { org: '', level: 0, rankName: '' },
      customRecords: updatedCustomRecords,
      attacks: stats.attacks || []
    }
    
    const success = await onSaveExtraData(extraData)
    if (success) {
      console.log('✅ 冒險紀錄更新成功')
    } else {
      console.error('❌ 冒險紀錄更新失敗')
    }
    
    setActiveModal(null);
  };

  const handleDeleteRecord = async () => {
    if (!selectedRecord) return;
    
    const updatedCustomRecords = (stats.customRecords || []).filter(r => r.id !== selectedRecord.id);
    
    setStats(prev => ({
      ...prev,
      customRecords: updatedCustomRecords
    }));
    
    // 保存到資料庫
    const extraData = {
      downtime: stats.downtime || 0,
      renown: stats.renown || { used: 0, total: 0 },
      prestige: stats.prestige || { org: '', level: 0, rankName: '' },
      customRecords: updatedCustomRecords,
      attacks: stats.attacks || []
    }
    
    const success = await onSaveExtraData(extraData)
    if (success) {
      console.log('✅ 冒險紀錄刪除成功')
    } else {
      console.error('❌ 冒險紀錄刪除失敗')
    }
    
    setActiveModal(null);
  };

  // 圖片壓縮函數
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // 計算壓縮後的尺寸（最大300x300，保持比例）
        const maxSize = 300;
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }
        
        // 設置 canvas 尺寸
        canvas.width = width;
        canvas.height = height;
        
        // 繪製並壓縮圖片
        ctx?.drawImage(img, 0, 0, width, height);
        
        // 轉為 base64，JPEG 品質 80%
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
        resolve(compressedBase64);
      };
      
      img.onerror = () => reject(new Error('圖片載入失敗'));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 檢查檔案大小（不超過 20MB）
    const maxSizeInBytes = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSizeInBytes) {
      alert('圖片檔案過大，請選擇小於 20MB 的圖片');
      return;
    }

    // 檢查檔案類型
    if (!file.type.startsWith('image/')) {
      alert('請選擇圖片檔案');
      return;
    }

    try {
      // 顯示載入狀態
      const loadingMessage = '正在處理圖片...';
      console.log(loadingMessage);
      
      // 壓縮圖片
      const compressedBase64 = await compressImage(file);
      
      // 檢查壓縮後大小
      const compressedSizeKB = Math.round((compressedBase64.length * 3) / 4 / 1024);
      console.log(`圖片壓縮完成，大小：${compressedSizeKB}KB`);
      
      // 更新狀態
      setStats(prev => ({ ...prev, avatarUrl: compressedBase64 }));
      
      // 保存到數據庫
      if (onSaveAvatarUrl) {
        const saveSuccess = await onSaveAvatarUrl(compressedBase64);
        if (saveSuccess) {
          console.log('✅ 頭像已成功保存到數據庫');
        } else {
          console.error('❌ 頭像保存到數據庫失敗');
        }
      }
      
    } catch (error) {
      console.error('圖片處理失敗:', error);
      alert('圖片處理失敗，請重試');
    }
  };

  const hpRatio = stats.hp.current / (stats.hp.max || 1);
  const hpColorClass = hpRatio <= 0.25 ? 'border-red-500 bg-red-950/40 text-red-400' : hpRatio <= 0.5 ? 'border-amber-500 bg-amber-950/40 text-amber-400' : 'border-emerald-500 bg-emerald-950/40 text-emerald-400';

  return (
    <div className="py-1 space-y-2 max-h-full overflow-y-auto pb-20 select-none">
      <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800 shadow-md">
        <div className="flex justify-between items-center mb-1">
          <div className="flex items-center gap-3 overflow-hidden flex-1">
            <label className="relative cursor-pointer group shrink-0">
              <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-2xl overflow-hidden shadow-inner">
                {stats.avatarUrl ? <img src={stats.avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : <span>👤</span>}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-sm text-white font-bold">上傳</span>
                </div>
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </label>
            <button onClick={openInfoModal} className="flex-1 min-w-0 text-left active:opacity-70">
              <h1 className="text-2xl font-fantasy text-white leading-tight truncate">{stats.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-lg text-slate-300 font-black uppercase">LV {stats.level}</span>
                <span className="text-lg text-slate-400 font-bold uppercase truncate">
                  {stats.classes && stats.classes.length > 0 
                    ? formatClassDisplay(stats.classes, 'primary')
                    : stats.class
                  }
                </span>
              </div>
            </button>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className={`w-14 h-14 rounded-full border-2 flex flex-col items-center justify-center shadow-lg shrink-0 transition-colors ${hpColorClass}`}>
              <span className="text-xs opacity-60 font-black leading-none uppercase">HP</span>
              <span className="text-lg font-black leading-none">{stats.hp.current}</span>
            </div>
          </div>
        </div>
      </div>

      <div onClick={openAbilitiesModal} className="grid grid-cols-2 gap-1.5 cursor-pointer">
        {ABILITY_KEYS.map(key => {
          // 計算最終值：基礎值 + 屬性加成
          const baseScore = stats.abilityScores[key];
          const abilityBonus = stats.extraData?.abilityBonuses?.[key] || 0;
          const score = baseScore + abilityBonus;
          
          // 計算最終調整值：floor((總值-10)/2) + 調整值額外加成
          const modifierBonus = stats.extraData?.modifierBonuses?.[key] || 0;
          const mod = getModifier(score) + modifierBonus;
          
          const isSaveProf = (stats.savingProficiencies || []).includes(key);
          const saveBonus = isSaveProf ? mod + profBonus : mod;
          return (
            <div key={key} className="bg-slate-800 p-2 rounded-lg border border-slate-700 flex items-center gap-2 active:bg-slate-700 shadow-sm transition-colors">
              <div className="w-12 flex flex-col items-center justify-center border-r border-slate-700/50 pr-2 shrink-0">
                <span className="text-base font-black text-slate-300 leading-tight text-center">{STAT_LABELS[key]}</span>
              </div>
              <div className="flex-1 flex flex-col justify-center">
                <div className="flex items-center gap-1.5 leading-none mb-0.5">
                  <span className="text-lg font-fantasy text-amber-400 font-bold">{score}</span>
                  <span className="text-base font-bold text-slate-400">({mod >= 0 ? '+' : ''}{mod})</span>
                </div>
                <div className={`flex items-center gap-1.5 rounded px-1 -ml-1 ${isSaveProf ? 'bg-amber-500/10' : ''}`}>
                  <span className="text-xs text-slate-500 uppercase font-black tracking-tighter">豁免</span>
                  <span className={`text-base font-bold ${isSaveProf ? 'text-amber-500' : 'text-slate-500'}`}>{saveBonus >= 0 ? '+' : ''}{saveBonus}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-slate-900/60 rounded-lg border border-slate-800 p-2 shadow-inner">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-base font-black text-slate-400 uppercase tracking-tighter">技能調整</h3>
          <span className="text-lg text-amber-500 font-bold uppercase tracking-tighter">熟練 +{profBonus}</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {SKILLS_MAP.map((skill) => {
            const profLevel = stats.proficiencies[skill.name] || 0;
            // 計算最終調整值：包含基礎值、屬性加成和調整值加成
            const baseScore = stats.abilityScores[skill.base];
            const abilityBonus = stats.extraData?.abilityBonuses?.[skill.base] || 0;
            const finalScore = baseScore + abilityBonus;
            const modifierBonus = stats.extraData?.modifierBonuses?.[skill.base] || 0;
            const finalModifier = getModifier(finalScore) + modifierBonus;
            const bonus = finalModifier + (profLevel * profBonus);
            return (
              <Button
                key={skill.name}
                variant="ghost"
                onClick={() => handleSkillClick(skill)}
                className={`!px-2 !py-0 flex items-center justify-between transition-all h-9 ${profLevel > 0 ? 'bg-amber-500/10 border-amber-500/40 shadow-sm' : 'bg-slate-800/30 border-slate-800'}`}
              >
                <div className="flex items-center gap-1 min-w-0 flex-1">
                   <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${profLevel === 1 ? 'bg-amber-500' : profLevel === 2 ? 'bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,1)] ring-1 ring-amber-300' : 'bg-slate-700 opacity-30'}`} />
                   <span className={`text-base font-bold leading-none truncate tracking-tighter ${profLevel > 0 ? 'text-amber-400' : 'text-slate-500'}`}>{skill.name}</span>
                </div>
                <span className={`text-2xl font-mono font-black leading-none shrink-0 pl-1 ${profLevel > 0 ? 'text-white' : 'text-slate-600'}`}>{bonus >= 0 ? '+' : ''}{bonus}</span>
              </Button>
            );
          })}
        </div>
      </div>

      <div className="bg-slate-900/40 rounded-lg border border-slate-800 p-2 space-y-2 shadow-inner">
        <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
          <h3 className="text-base font-black text-slate-400 uppercase tracking-tighter">冒險紀錄</h3>
          <Button
            variant="secondary"
            size="sm"
            onClick={openAddRecordModal}
            className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-500 font-bold text-lg"
          >
            +
          </Button>
        </div>
        <div className="flex flex-col gap-2">
          <div onClick={openCurrencyModal} className="flex items-center justify-between bg-slate-800/50 p-2 rounded border border-slate-700/50 active:bg-slate-700 transition-colors cursor-pointer">
            <div className="flex flex-col">
              <span className="text-base font-bold text-slate-300">金幣</span>
            </div>
            <span className="text-lg font-mono font-black text-amber-500">{formatDecimal(stats.currency.gp)} <span className="text-sm text-slate-500 font-normal">GP</span></span>
          </div>
          <div onClick={openExpModal} className="flex items-center justify-between bg-slate-800/50 p-2 rounded border border-slate-700/50 active:bg-slate-700 transition-colors cursor-pointer">
            <div className="flex flex-col">
              <span className="text-base font-bold text-slate-300">經驗值</span>
            </div>
            <span className="text-lg font-mono font-black text-emerald-400">{stats.exp} <span className="text-sm text-slate-500 font-normal">EXP</span></span>
          </div>
          <div onClick={openDowntimeModal} className="flex items-center justify-between bg-slate-800/50 p-2 rounded border border-slate-700/50 active:bg-slate-700 transition-colors cursor-pointer">
            <div className="flex flex-col">
              <span className="text-base font-bold text-slate-300">修整期</span>
            </div>
            <span className="text-lg text-white font-mono font-black">{stats.downtime} <span className="text-sm text-slate-500 font-normal">天</span></span>
          </div>
          <div onClick={openRenownModal} className="flex items-center justify-between bg-slate-800/50 p-2 rounded border border-slate-700/50 active:bg-slate-700 transition-colors cursor-pointer">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-slate-300">名聲</span>
                <span className="text-xs text-slate-500 uppercase tracking-tighter">(使用 / 累計)</span>
              </div>
            </div>
            <span className="text-lg font-mono font-black">
              <span className={stats.renown.used > stats.renown.total ? 'text-rose-400' : 'text-emerald-400'}>
                {stats.renown.used}
              </span>
              <span className="text-slate-500 mx-1">/</span>
              <span className="text-amber-400">{stats.renown.total}</span>
            </span>
          </div>
          {(stats.customRecords || []).map(record => (
            <div 
              key={record.id} 
              onClick={() => openEditRecordModal(record)}
              className="flex items-center justify-between bg-slate-800/50 p-2 rounded border border-slate-700/50 active:bg-slate-700 transition-colors cursor-pointer"
            >
              <div className="flex flex-col min-w-0 flex-1 mr-2">
                <span className="text-base font-bold text-slate-300 truncate">{record.name}</span>
                {record.note && <span className="text-sm text-slate-500 truncate leading-tight">{record.note}</span>}
              </div>
              <span className="text-lg text-amber-500 font-mono font-black shrink-0">{record.value}</span>
            </div>
          ))}
        </div>
      </div>

      {activeModal === 'skill_detail' && selectedSkill && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" onClick={() => setActiveModal(null)} />
          <div className="relative bg-slate-900 border border-slate-700 w-full max-w-xs rounded-2xl p-3 shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="text-center mb-6">
              <h3 className="text-xl font-fantasy text-amber-500 mb-1">{selectedSkill.name}</h3>
              <p className="text-[15px] text-slate-500 font-black uppercase tracking-widest">屬性：{STAT_LABELS[selectedSkill.base]}</p>
            </div>
            <div className="space-y-3">
              <button 
                onClick={() => setSkillProficiency(selectedSkill.name, 1)} 
                className={`w-full py-4 rounded-xl font-black text-lg transition-all active:scale-95 border ${stats.proficiencies[selectedSkill.name] === 1 ? 'bg-amber-600 border-amber-400 text-white' : 'bg-slate-800 text-slate-400 border-slate-700'}`}
              >
                設為熟練 (x1)
              </button>
              <button 
                onClick={() => setSkillProficiency(selectedSkill.name, 2)} 
                className={`w-full py-4 rounded-xl font-black text-lg transition-all active:scale-95 border ${stats.proficiencies[selectedSkill.name] === 2 ? 'bg-amber-600 border-amber-400 text-white shadow-[0_0_10px_rgba(245,158,11,0.3)]' : 'bg-slate-800 text-slate-400 border-slate-700'}`}
              >
                設為專家 (x2)
              </button>
              <button 
                onClick={() => setSkillProficiency(selectedSkill.name, 0)} 
                className="w-full py-4 rounded-xl font-bold text-base bg-slate-900 text-slate-500 border border-slate-800 active:scale-95"
              >
                清除狀態
              </button>
              <button onClick={() => setActiveModal(null)} className="w-full py-2 text-slate-600 font-bold text-[14px] uppercase tracking-widest">取消</button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'abilities' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" onClick={() => setActiveModal(null)} />
          <div className="relative bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl p-3 shadow-2xl animate-in fade-in zoom-in duration-150 overflow-y-auto max-h-[90vh]">
            <h3 className="text-base font-fantasy text-amber-500 mb-4 border-b border-slate-800 pb-2">編輯屬性</h3>
            <div className="grid grid-cols-2 gap-2">
              {ABILITY_KEYS.map(key => {
                // 基礎值
                const baseResult = handleValueInput(editAbilities[key], undefined, { allowZero: true });
                const baseValue = baseResult.isValid ? baseResult.numericValue : 0;
                const baseMod = getModifier(baseValue);
                
                // 屬性加成
                const bonusResult = handleValueInput(editAbilityBonuses[key] || '0', undefined, { allowZero: true, allowNegative: true });
                const bonusValue = bonusResult.isValid ? bonusResult.numericValue : 0;
                
                // 調整值額外加成
                const modBonusResult = handleValueInput(editModifierBonuses[key] || '0', undefined, { allowZero: true, allowNegative: true });
                const modBonusValue = modBonusResult.isValid ? modBonusResult.numericValue : 0;
                
                // 總值 = 基礎值 + 屬性加成
                const totalValue = baseValue + bonusValue;
                // 最終調整值 = floor((總值-10)/2) + 調整值額外加成
                const totalMod = getModifier(totalValue) + modBonusValue;
                
                const isProf = editSavingProfs.includes(key);
                return (
                  <div key={key} className="bg-slate-800/60 border border-slate-700 rounded-xl p-2.5 flex flex-col gap-1.5 shadow-inner">
                    <div className="flex justify-between items-center">
                      <span className="text-[14px] font-black text-slate-500 uppercase tracking-tighter">{STAT_LABELS[key as keyof typeof STAT_LABELS]}</span>
                      <button onClick={() => toggleSavingProf(key)} className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${isProf ? 'bg-amber-500 border-amber-400 text-slate-950' : 'bg-slate-900 border-slate-700 text-transparent'}`}><span className="text-[10px] font-black">✓</span></button>
                    </div>
                    
                    {/* 基礎值和基礎調整值 */}
                    <div className="flex items-center gap-1.5">
                      <input 
                        type="text" 
                        value={editAbilities[key]} 
                        onChange={(e) => setEditAbilities({ ...editAbilities, [key]: e.target.value })} 
                        className="w-full bg-slate-700/50 border border-slate-600 rounded-lg py-0.5 text-white text-center font-mono text-lg outline-none" 
                        placeholder="10"
                      />
                      <div className="flex flex-col items-center shrink-0 w-10">
                        <span className="text-[11px] text-slate-600 font-bold uppercase leading-none mb-0.5">MOD</span>
                        <span className="text-sm font-bold text-amber-500/80 leading-none">{baseMod >= 0 ? '+' : ''}{baseMod}</span>
                      </div>
                    </div>
                    
                    {/* 分隔線 */}
                    <div className="text-[11px] text-slate-600 font-bold uppercase tracking-wider text-center border-t border-slate-700 pt-1">額外：</div>
                    
                    {/* 額外加成和額外調整值 */}
                    <div className="flex items-center gap-1.5">
                      <input 
                        type="text" 
                        value={editAbilityBonuses[key]} 
                        onChange={(e) => setEditAbilityBonuses({ ...editAbilityBonuses, [key]: e.target.value })} 
                        className="w-full bg-slate-700/50 border border-slate-600 rounded-lg py-0.5 text-white text-center font-mono text-lg outline-none" 
                        placeholder="+0"
                      />
                      <div className="flex flex-col items-center shrink-0 w-10">
                        <span className="text-[11px] text-slate-600 font-bold uppercase leading-none mb-0.5">MOD</span>
                        <input 
                          type="text" 
                          value={editModifierBonuses[key]} 
                          onChange={(e) => setEditModifierBonuses({ ...editModifierBonuses, [key]: e.target.value })} 
                          className="w-full bg-slate-700/50 border border-slate-600 rounded-sm py-0.5 text-white text-center font-mono text-xs outline-none" 
                          placeholder="+0"
                        />
                      </div>
                    </div>
                    
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2 pt-4">
              <button onClick={() => setActiveModal(null)} className="flex-1 px-4 py-3 bg-slate-800 text-slate-400 rounded-xl font-bold">取消</button>
              <button onClick={saveAbilities} className="flex-1 px-4 py-3 bg-amber-600 text-white rounded-xl font-bold">儲存</button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'info' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" onClick={() => setActiveModal(null)} />
          <div className="relative bg-slate-900 border border-slate-700 w-full max-w-xs rounded-2xl p-3 shadow-2xl">
            <h3 className="text-base font-fantasy text-amber-500 mb-4 border-b border-slate-800 pb-2">編輯角色資料</h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[14px] font-black text-slate-500 uppercase ml-1">名稱</label>
                <input type="text" value={editInfo.name} onChange={(e) => setEditInfo({ ...editInfo, name: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none" autoFocus />
              </div>
              
              {/* 職業與等級編輯 */}
              <div className="space-y-2">
                <label className="text-[14px] font-black text-slate-500 uppercase ml-1">職業與等級</label>
                <div className="space-y-2">
                  {editClasses.map((classInfo, index) => (
                    <div key={classInfo.id || index} className="flex items-center gap-2">
                      <select 
                        value={classInfo.name}
                        onChange={(e) => updateEditClass(index, 'name', e.target.value)}
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                      >
                        {getAvailableClasses()
                          .filter(className => className === classInfo.name || !editClasses.some(c => c.name === className))
                          .map(className => (
                            <option key={className} value={className}>{className}</option>
                          ))
                        }
                      </select>
                      <input 
                        type="number" 
                        min="1" 
                        max="20"
                        value={classInfo.level} 
                        onChange={(e) => updateEditClass(index, 'level', e.target.value)}
                        className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-center text-white text-sm"
                      />
                      {editClasses.length > 1 && (
                        <button 
                          onClick={() => removeEditClass(index)}
                          className="w-8 h-8 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/40 transition-colors flex items-center justify-center"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  
                  {/* 新增按鈕 */}
                  <button 
                    onClick={addNewEditClass}
                    className="w-full py-2 bg-slate-700/50 text-slate-400 rounded-lg border border-slate-600 hover:bg-slate-700 transition-colors flex items-center justify-center font-bold"
                  >
                    +
                  </button>
                  
                  {/* 總等級顯示 */}
                  <div className="text-center pt-2 border-t border-slate-700">
                    <span className="text-xs text-slate-500">總等級: LV {editClasses.reduce((sum, c) => sum + (parseInt(String(c.level)) || 0), 0)}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <button onClick={() => setActiveModal(null)} className="flex-1 px-4 py-3 bg-slate-800 text-slate-400 rounded-xl font-bold">取消</button>
                <button onClick={saveInfoWithClasses} className="flex-1 px-4 py-3 bg-amber-600 text-white rounded-xl font-bold">儲存</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 兼職管理 Modal */}
      {activeModal === 'multiclass' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" onClick={() => setActiveModal(null)} />
          <div className="relative bg-slate-900 border border-slate-700 w-full max-w-xs rounded-2xl p-4 shadow-2xl">
            <h3 className="text-lg font-fantasy text-amber-500 mb-6 border-b border-slate-800 pb-2">🎆 新增兼職</h3>
            
            {/* 新增職業 */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-400 uppercase">選擇職業</label>
                <select 
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-base"
                >
                  <option value="">選擇職業...</option>
                  {getAvailableClasses()
                    .filter(className => !editClasses.some(c => c.name === className))
                    .map(className => (
                      <option key={className} value={className}>{className}</option>
                    ))
                  }
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-400 uppercase">等級</label>
                <input 
                  type="number" 
                  min="1" 
                  max="20"
                  value={newClassLevel} 
                  onChange={(e) => setNewClassLevel(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-center text-white text-base"
                  placeholder="1"
                />
              </div>
              
              {/* 預覽 */}
              {newClassName && (
                <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700">
                  <div className="text-sm text-slate-400 mb-1">預覽:</div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{newClassName}</span>
                    <span className="text-slate-400 text-sm font-mono">LV {newClassLevel || 1}</span>
                  </div>
                </div>
              )}
            </div>
            
            {/* 按鈕 */}
            <div className="flex gap-2 mt-6">
              <button 
                onClick={() => setActiveModal(null)} 
                className="flex-1 px-4 py-3 bg-slate-800 text-slate-400 rounded-xl font-bold"
              >
                取消
              </button>
              <button 
                onClick={() => { addNewClass(); }} 
                disabled={!newClassName}
                className="flex-1 px-4 py-3 bg-emerald-600 disabled:bg-slate-700 text-white disabled:text-slate-500 rounded-xl font-bold transition-colors"
              >
                新增兼職
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'currency' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" onClick={() => setActiveModal(null)} />
          <div className="relative bg-slate-900 border border-slate-700 w-full max-w-xs rounded-2xl p-3 shadow-2xl">
            <h3 className="text-base font-fantasy text-amber-500 mb-6 border-b border-slate-800 pb-2">修改資金</h3>
            <div className="space-y-6">
              <div className="space-y-4">
                <label className="text-[14px] font-black text-amber-500 uppercase ml-1">持有金幣 (GP)</label>
                <input type="text" value={tempGPValue} onChange={(e) => setTempGPValue(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-3xl font-mono text-center text-amber-500 focus:outline-none" placeholder={formatDecimal(stats.currency.gp)} autoFocus />
                <div className="text-center mt-2">
                  <span className="text-[14px] text-slate-500 uppercase font-black tracking-widest">計算結果</span>
                  <div className="flex items-center justify-center gap-3 text-lg font-bold">
                    <span className="text-slate-400 font-[14px]">{formatDecimal(stats.currency.gp)}</span>
                    <span className="text-slate-600">→</span>
                    <span className="text-amber-500 text-2xl">{formatDecimal(gpPreview)}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setActiveModal(null)} className="flex-1 px-4 py-3 bg-slate-800 text-slate-400 rounded-xl font-bold">取消</button>
                <button onClick={saveCurrency} className="flex-1 px-4 py-3 bg-amber-600 text-white rounded-xl font-bold">套用</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'exp' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" onClick={() => setActiveModal(null)} />
          <div className="relative bg-slate-900 border border-slate-700 w-full max-w-xs rounded-2xl p-3 shadow-2xl">
            <h3 className="text-base font-fantasy text-emerald-400 mb-6 border-b border-slate-800 pb-2">修改經驗值</h3>
            <div className="space-y-6">
              <div className="space-y-4">
                <label className="text-[14px] font-black text-emerald-400 uppercase ml-1">經驗值 (EXP)</label>
                <input type="text" value={tempExpValue} onChange={(e) => setTempExpValue(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-3xl font-mono text-center text-emerald-400 focus:outline-none" placeholder={stats.exp.toString()} autoFocus />
                <div className="text-center mt-2">
                  <span className="text-[14px] text-slate-500 uppercase font-black tracking-widest">計算結果</span>
                  <div className="flex items-center justify-center gap-3 text-lg font-bold">
                    <span className="text-slate-400 font-[14px]">{stats.exp}</span>
                    <span className="text-slate-600">→</span>
                    <span className="text-emerald-400 text-2xl">{expPreview}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setActiveModal(null)} className="flex-1 px-4 py-3 bg-slate-800 text-slate-400 rounded-xl font-bold">取消</button>
                <button onClick={saveExp} className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl font-bold">套用</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'downtime' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" onClick={() => setActiveModal(null)} />
          <div className="relative bg-slate-900 border border-slate-700 w-full max-w-xs rounded-2xl p-3 shadow-2xl animate-in fade-in zoom-in duration-150">
            <h3 className="text-base font-fantasy text-amber-500 mb-6 border-b border-slate-800 pb-2">修整期</h3>
            <div className="space-y-6">
              <div className="text-center">
                <input type="text" value={tempDowntimeValue} onChange={(e) => setTempDowntimeValue(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-4 text-4xl font-mono text-center text-white focus:outline-none" placeholder={stats.downtime.toString()} autoFocus />
                <div className="text-center mt-3">
                  <span className="text-[14px] text-slate-500 uppercase font-black tracking-widest">預覽結果</span>
                  <div className="flex items-center justify-center gap-3 text-lg font-bold">
                    <span className="text-slate-400 font-[14px]">{stats.downtime}</span>
                    <span className="text-slate-600">→</span>
                    <span className="text-white text-2xl">{downtimePreview} 天</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setActiveModal(null)} className="flex-1 px-4 py-3 bg-slate-800 text-slate-400 rounded-xl font-bold">取消</button>
                <button onClick={saveDowntime} className="flex-1 px-4 py-3 bg-amber-600 text-white rounded-xl font-bold">套用</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'renown' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" onClick={() => setActiveModal(null)} />
          <div className="relative bg-slate-900 border border-slate-700 w-full max-w-xs rounded-2xl p-3 shadow-2xl animate-in fade-in zoom-in duration-150">
            <h3 className="text-base font-fantasy text-amber-500 mb-6 border-b border-slate-800 pb-2">名聲</h3>
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[14px] font-black text-slate-500 uppercase ml-1">名聲 (使用)</label>
                  <input type="text" value={tempRenownUsedValue} onChange={(e) => setTempRenownUsedValue(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-2xl font-mono text-center text-white focus:outline-none" placeholder={stats.renown.used.toString()} autoFocus />
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <span className="text-[14px] text-slate-600 font-bold">{stats.renown.used}</span>
                    <span className="text-[14px] text-slate-700">→</span>
                    <span className={`text-[14px] font-black ${renownUsedPreview > renownTotalPreview ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {renownUsedPreview}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[14px] font-black text-slate-500 uppercase ml-1">名聲 (累計)</label>
                  <input type="text" value={tempRenownTotalValue} onChange={(e) => setTempRenownTotalValue(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-2xl font-mono text-center text-amber-500 focus:outline-none" placeholder={stats.renown.total.toString()} />
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <span className="text-[14px] text-slate-600 font-bold">{stats.renown.total}</span>
                    <span className="text-[14px] text-slate-700">→</span>
                    <span className="text-[14px] font-black text-amber-500">{renownTotalPreview}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setActiveModal(null)} className="flex-1 px-4 py-3 bg-slate-800 text-slate-400 rounded-xl font-bold">取消</button>
                <button onClick={saveRenown} className="flex-1 px-4 py-3 bg-amber-600 text-white rounded-xl font-bold">儲存</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'add_record' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" onClick={() => setActiveModal(null)} />
          <div className="relative bg-slate-900 border border-slate-700 w-full max-w-xs rounded-2xl p-3 shadow-2xl animate-in fade-in zoom-in duration-150">
            <h3 className="text-base font-fantasy text-amber-500 mb-6 border-b border-slate-800 pb-2">新增紀錄</h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[14px] font-black text-slate-500 uppercase ml-1">名稱</label>
                <input type="text" value={newRecord.name} onChange={(e) => setNewRecord({ ...newRecord, name: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none" placeholder="例如：皇家古生物學院" autoFocus />
              </div>
              <div className="space-y-1">
                <label className="text-[14px] font-black text-slate-500 uppercase ml-1">數值</label>
                <input type="text" value={newRecord.value} onChange={(e) => setNewRecord({ ...newRecord, value: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none" placeholder="例如：1" />
              </div>
              <div className="space-y-1">
                <label className="text-[14px] font-black text-slate-500 uppercase ml-1">備註 (非必填)</label>
                <textarea value={newRecord.note} onChange={(e) => setNewRecord({ ...newRecord, note: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none resize-none h-20" placeholder="例如：階級一" />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setActiveModal(null)} className="flex-1 px-4 py-3 bg-slate-800 text-slate-400 rounded-xl font-bold">取消</button>
                <button onClick={handleSaveNewRecord} className="flex-1 px-4 py-3 bg-amber-600 text-white rounded-xl font-bold">新增</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'edit_record' && selectedRecord && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" onClick={() => setActiveModal(null)} />
          <div className="relative bg-slate-900 border border-slate-700 w-full max-w-xs rounded-2xl p-3 shadow-2xl animate-in fade-in zoom-in duration-150">
            <h3 className="text-base font-fantasy text-amber-500 mb-6 border-b border-slate-800 pb-2">編輯紀錄</h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[14px] font-black text-slate-500 uppercase ml-1">名稱</label>
                <input type="text" value={newRecord.name} onChange={(e) => setNewRecord({ ...newRecord, name: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[14px] font-black text-slate-500 uppercase ml-1">數值</label>
                <input type="text" value={newRecord.value} onChange={(e) => setNewRecord({ ...newRecord, value: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[14px] font-black text-slate-500 uppercase ml-1">備註</label>
                <textarea value={newRecord.note} onChange={(e) => setNewRecord({ ...newRecord, note: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none resize-none h-20" />
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <div className="flex gap-2">
                  <button onClick={() => setActiveModal(null)} className="flex-1 px-4 py-3 bg-slate-800 text-slate-400 rounded-xl font-bold">取消</button>
                  <button onClick={handleUpdateRecord} className="flex-1 px-4 py-3 bg-amber-600 text-white rounded-xl font-bold">更新</button>
                </div>
                <button onClick={handleDeleteRecord} className="w-full px-4 py-2 bg-red-950/40 text-red-400 border border-red-900/30 rounded-xl font-bold text-xs mt-2">刪除此紀錄</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};