import React, { useState, useEffect } from 'react';
import { CharacterStats, CustomRecord } from '../types';
import { getProfBonus, formatDecimal } from '../utils/helpers';
import { getFinalAbilityModifier, getFinalAbilityScore, getFinalSavingThrow, getFinalSkillBonus, getFinalCombatStat, getDefaultMaxHpBasic, type AbilityKey } from '../utils/characterAttributes';
import { STAT_LABELS, SKILLS_MAP, ABILITY_KEYS } from '../utils/characterConstants';
import { getAvailableClasses, getClassHitDie, formatClassDisplay, calculateHitDiceTotals } from '../utils/classUtils';
import { PageContainer, Card, Button, Title, Subtitle, Input, BackButton } from './ui';
import { STYLES, combineStyles } from '../styles/common';
import { SkillAdjustModal } from './SkillAdjustModal';
import { AbilityEditModal } from './AbilityEditModal';
import ExpModal from './ExpModal';
import CurrencyModal from './CurrencyModal';
import DowntimeModal from './DowntimeModal';
import RenownModal from './RenownModal';
import CustomRecordModal from './CustomRecordModal';
import CharacterInfoModal from './CharacterInfoModal';
import MulticlassAddModal from './MulticlassAddModal';

interface CharacterSheetProps {
  stats: CharacterStats;
  setStats: React.Dispatch<React.SetStateAction<CharacterStats>>;
  characterId?: string;
  onSaveSkillProficiency?: (skillName: string, level: number) => Promise<boolean>;
  onSaveSavingThrowProficiencies?: (proficiencies: string[]) => Promise<boolean>;
  onSaveCharacterBasicInfo?: (name: string, characterClass: string, level: number) => Promise<boolean>;
  /** 等級或職業存檔完成後呼叫，用來重新載入角色數據（更新 extra_data／statBonusSources 等）；載入期間會以 loading 阻擋操作 */
  onLevelOrClassesSaved?: () => Promise<void>;
  /** 將最大 HP 基礎值同步為公式值並寫入 DB（等級/職業變更後呼叫，使 refetch 後顯示正確） */
  onSyncMaxHpBasicFromFormula?: (maxHpBasic: number) => Promise<boolean>;
  onSaveAbilityScores?: (abilityScores: CharacterStats['abilityScores']) => Promise<boolean>;
  onSaveCurrencyAndExp?: (gp: number, exp: number) => Promise<boolean>;
  onSaveExtraData?: (extraData: any) => Promise<boolean>;
  onSaveAvatarUrl?: (avatarUrl: string) => Promise<boolean>;
}

export const CharacterSheet: React.FC<CharacterSheetProps> = ({ 
  stats, 
  setStats,
  characterId,
  onSaveSkillProficiency, 
  onSaveSavingThrowProficiencies,
  onSaveCharacterBasicInfo,
  onLevelOrClassesSaved,
  onSyncMaxHpBasicFromFormula,
  onSaveAbilityScores,
  onSaveCurrencyAndExp,
  onSaveExtraData,
  onSaveAvatarUrl
}) => {
  const [activeModal, setActiveModal] = useState<'info' | 'multiclass' | 'currency' | 'downtime' | 'renown' | 'exp' | 'skill_detail' | 'ability_detail' | 'add_record' | 'edit_record' | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<{ name: string; base: keyof CharacterStats['abilityScores'] } | null>(null);
  const [activeAbilityKey, setActiveAbilityKey] = useState<AbilityKey | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<CustomRecord | null>(null);
  const [isSavingInfo, setIsSavingInfo] = useState(false);
  
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
  };

  const openInfoModal = () => {
    setEditInfo({ name: stats.name, class: stats.class, level: stats.level.toString() });
    setActiveModal('info');
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
    
    const totalLevel = updatedClasses.reduce((sum, c) => sum + c.level, 0);
    const primaryClass = updatedClasses.find(c => c.isPrimary) || updatedClasses[0];
    const validClasses = updatedClasses.map(c => ({
      ...c,
      level: Math.max(1, parseInt(String(c.level)) || 1)
    }));
    
    try {
      if (onSaveCharacterBasicInfo) {
        const basicSuccess = await onSaveCharacterBasicInfo(stats.name, primaryClass.name, totalLevel);
        if (!basicSuccess) {
          console.error('❌ 基本信息保存失敗');
          return;
        }
      }
      
      // 持久化到 character_classes 並重新計算生命骰池
      if (characterId) {
        const { MulticlassService } = await import('../services/multiclassService');
        const { supabase } = await import('../lib/supabase');
        await supabase.from('character_classes').delete().eq('character_id', characterId);
        for (const classInfo of validClasses) {
          await supabase.from('character_classes').insert({
            character_id: characterId,
            class_name: classInfo.name,
            class_level: classInfo.level,
            hit_die: getClassHitDie(classInfo.name),
            is_primary: classInfo.isPrimary
          });
        }
        await MulticlassService.recalculateHitDicePools(characterId);
      }
      
      if (onSaveExtraData) {
        await onSaveExtraData({ ...stats.extraData, classes: validClasses });
      }
      
      const newClassesWithHitDie = validClasses.map(c => ({
        id: c.id,
        name: c.name,
        level: c.level,
        hitDie: getClassHitDie(c.name),
        isPrimary: c.isPrimary
      }));
      const newHitDicePools = calculateHitDiceTotals(newClassesWithHitDie);
      
      setStats(prev => ({ 
        ...prev, 
        class: primaryClass.name,
        level: totalLevel,
        classes: newClassesWithHitDie,
        hitDicePools: newHitDicePools
      }));
      setActiveModal(null);
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
    
    setIsSavingInfo(true);
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
      
      // 4. 更新本地狀態（含複合職業生命骰 3d10+1d6 等）
      const newClasses = validClasses.map(c => ({
        id: c.id,
        name: c.name,
        level: c.level,
        hitDie: getClassHitDie(c.name),
        isPrimary: c.isPrimary
      }));
      const newHitDicePools = calculateHitDiceTotals(newClasses);
      setStats(prev => ({ 
        ...prev, 
        name: editInfo.name,
        class: primaryClass.name,
        level: totalLevel,
        classes: newClasses,
        hitDicePools: newHitDicePools
      }));

      // 4b. 依新等級/職業重算最大 HP 基礎值並寫入 DB，refetch 後才會顯示正確（含新職業生命骰平均）
      const newStatsForHp = { ...stats, level: totalLevel, classes: newClasses };
      const newMaxHpBasic = getDefaultMaxHpBasic(newStatsForHp);
      await onSyncMaxHpBasicFromFormula?.(newMaxHpBasic);
      
      setActiveModal(null);

      // 5. 重新載入角色數據（更新 extra_data.statBonusSources、max HP 公式等依等級／職業的數值）；載入期間會顯示 loading 阻擋操作
      await onLevelOrClassesSaved?.();
    } catch (error) {
      console.error('❌ 角色資料保存錯誤:', error);
    } finally {
      setIsSavingInfo(false);
    }
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

  const finalMaxHp = getFinalCombatStat(stats, 'maxHp');
  const hpRatio = stats.hp.current / (finalMaxHp || 1);
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
              <span className="text-lg font-black leading-none">{stats.hp.current}/{finalMaxHp}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {ABILITY_KEYS.map(key => {
          const score = getFinalAbilityScore(stats, key);
          const mod = getFinalAbilityModifier(stats, key);
          const saveBonus = getFinalSavingThrow(stats, key);
          const isSaveProf = (stats.savingProficiencies || []).includes(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                setActiveAbilityKey(key);
                setActiveModal('ability_detail');
              }}
              className="bg-slate-800 p-2 rounded-lg border border-slate-700 flex items-center gap-2 active:bg-slate-700 shadow-sm transition-colors w-full text-left"
            >
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
            </button>
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
            const overrides =
              (stats.extraData as any)?.skillBasicOverrides as
                | Record<string, number>
                | undefined;
            const overrideBasic = overrides?.[skill.name];
            // 有手動覆寫時 = 覆寫值 + 其他加值；否則 = 最終技能加值（含能力調整、熟練、misc）
            const bonus =
              typeof overrideBasic === 'number'
                ? overrideBasic +
                  (((stats.extraData as any)?.skillBonuses as Record<string, number> | undefined)?.[skill.name] ?? 0)
                : getFinalSkillBonus(stats, skill.name);
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
            onClick={openAddRecordModal}
            className="w-8 h-8 min-w-8 min-h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-500 font-bold text-lg p-0"
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
        <SkillAdjustModal
          isOpen
          skillName={selectedSkill.name}
          abilityLabel={STAT_LABELS[selectedSkill.base]}
          abilityModifier={getFinalAbilityModifier(stats, selectedSkill.base)}
          characterLevel={stats.level ?? 1}
          currentProfLevel={
            ((stats.proficiencies as any)?.[selectedSkill.name] === 1 ||
              (stats.proficiencies as any)?.[selectedSkill.name] === 2)
              ? (stats.proficiencies as any)[selectedSkill.name]
              : 0
          }
          overrideBasic={
            ((stats.extraData as any)?.skillBasicOverrides as Record<string, number> | undefined)?.[
              selectedSkill.name
            ] ?? null
          }
          skillBonusSources={(
            stats.extraData?.statBonusSources ?? []
          ).flatMap((src: any) => {
            const v = (src.skills as Record<string, number> | undefined)?.[selectedSkill.name] ?? 0;
            return v !== 0 ? [{ label: src.name, value: v }] : [];
          })}
          miscBonus={
            ((stats.extraData as any)?.skillBonuses as Record<string, number> | undefined)?.[
              selectedSkill.name
            ] ?? 0
          }
          onClose={() => setActiveModal(null)}
          onSave={async (nextProfLevel, nextOverrideBasic) => {
            // 1. 更新熟練度（含遠端與本地）
            await setSkillProficiency(selectedSkill.name, nextProfLevel);

            // 2. 準備新的 skillBasicOverrides
            const prevOverrides =
              (stats.extraData as any)?.skillBasicOverrides ||
              ({} as Record<string, number>);
            const nextOverrides = { ...prevOverrides };
            if (nextOverrideBasic === null) {
              delete nextOverrides[selectedSkill.name];
            } else {
              nextOverrides[selectedSkill.name] = nextOverrideBasic;
            }

            const nextExtraData = {
              ...stats.extraData,
              skillBasicOverrides: nextOverrides,
            };

            // 3. 儲存到後端（若提供 callback）
            if (onSaveExtraData) {
              await onSaveExtraData(nextExtraData);
            }

            // 4. 立即更新本地狀態，讓技能列表顯示新數值
            setStats((prev) => ({
              ...prev,
              extraData: {
                ...prev.extraData,
                skillBasicOverrides: nextOverrides,
              },
            }));

            setActiveModal(null);
          }}
        />
      )}

      {activeModal === 'ability_detail' && activeAbilityKey && (
        <AbilityEditModal
          isOpen
          abilityKey={activeAbilityKey}
          abilityLabel={STAT_LABELS[activeAbilityKey]}
          scoreBasic={stats.abilityScores[activeAbilityKey]}
          scoreBonusSources={(() => {
            // 只顯示「來源明細」，不重複顯示總計（extraData.abilityBonuses 已是這些來源的加總）
            const fromAbilities =
              stats.extraData?.statBonusSources?.flatMap((src) => {
                const v =
                  src.abilityScores?.[activeAbilityKey] ??
                  src.abilityModifiers?.[activeAbilityKey] ??
                  0;
                return v !== 0
                  ? [{ label: src.name, value: v }]
                  : [];
              }) ?? [];
            return fromAbilities;
          })()}
          modifierBonusSources={(() => {
            const fromAbilities =
              stats.extraData?.statBonusSources?.flatMap((src) => {
                const v = src.abilityModifiers?.[activeAbilityKey] ?? 0;
                return v !== 0
                  ? [{ label: src.name, value: v }]
                  : [];
              }) ?? [];
            return fromAbilities;
          })()}
          saveBonusSources={(() => {
            const sources: { label: string; value: number }[] = [];
            const baseBonus =
              ((stats as any).saveBonuses as Record<string, number>)?.[
                activeAbilityKey
              ] ?? 0;
            if (baseBonus !== 0) {
              sources.push({
                label: '豁免額外加值',
                value: baseBonus,
              });
            }
            const fromAbilities =
              stats.extraData?.statBonusSources?.flatMap((src) => {
                const v = src.savingThrows?.[activeAbilityKey] ?? 0;
                return v !== 0
                  ? [{ label: src.name, value: v }]
                  : [];
              }) ?? [];
            return [...sources, ...fromAbilities];
          })()}
          isSaveProficient={
            (stats.savingProficiencies || []).includes(activeAbilityKey)
          }
          level={stats.level ?? 1}
          onClose={() => {
            setActiveAbilityKey(null);
            setActiveModal(null);
          }}
          onSave={async (nextScoreBasic, nextIsSaveProf) => {
            const abilityKey = activeAbilityKey;
            if (!abilityKey) return;

            const nextAbilityScores: CharacterStats['abilityScores'] = {
              ...stats.abilityScores,
              [abilityKey]: nextScoreBasic,
            };

            const currentProfs = stats.savingProficiencies || [];
            const nextSavingProfs = nextIsSaveProf
              ? Array.from(new Set([...currentProfs, abilityKey]))
              : currentProfs.filter((k) => k !== abilityKey);

            // 儲存能力值
            if (onSaveAbilityScores) {
              const ok = await onSaveAbilityScores(nextAbilityScores);
              if (!ok) {
                console.error('❌ 能力值保存失敗');
              }
            }

            // 儲存豁免熟練
            if (onSaveSavingThrowProficiencies) {
              const ok = await onSaveSavingThrowProficiencies(nextSavingProfs);
              if (!ok) {
                console.error('❌ 豁免熟練度保存失敗');
              }
            }

            // 更新本地狀態
            setStats((prev) => ({
              ...prev,
              abilityScores: nextAbilityScores,
              savingProficiencies: nextSavingProfs,
            }));

            setActiveAbilityKey(null);
            setActiveModal(null);
          }}
        />
      )}

      {activeModal === 'info' && (
        <CharacterInfoModal
          isOpen
          onClose={() => setActiveModal(null)}
          editInfo={editInfo}
          setEditInfo={setEditInfo}
          editClasses={editClasses}
          availableClasses={getAvailableClasses()}
          updateEditClass={updateEditClass}
          removeEditClass={removeEditClass}
          addNewEditClass={addNewEditClass}
          totalLevel={editClasses.reduce((sum, c) => sum + (parseInt(String(c.level)) || 0), 0)}
          onSave={saveInfoWithClasses}
          isSaving={isSavingInfo}
        />
      )}

      {activeModal === 'multiclass' && (
        <MulticlassAddModal
          isOpen
          onClose={() => setActiveModal(null)}
          newClassName={newClassName}
          newClassLevel={newClassLevel}
          onNewClassNameChange={setNewClassName}
          onNewClassLevelChange={setNewClassLevel}
          availableClasses={getAvailableClasses()}
          usedClassNames={editClasses.map((c) => c.name)}
          onAdd={addNewClass}
        />
      )}

      {activeModal === 'currency' && (
        <CurrencyModal
          isOpen
          onClose={() => setActiveModal(null)}
          value={tempGPValue}
          onChange={setTempGPValue}
          currentGp={stats.currency.gp}
          onApply={(gp) => {
            setStats((prev) => ({ ...prev, currency: { ...prev.currency, gp } }));
            setActiveModal(null);
            onSaveCurrencyAndExp?.(gp, stats.exp);
          }}
        />
      )}

      {activeModal === 'exp' && (
        <ExpModal
          isOpen
          onClose={() => setActiveModal(null)}
          value={tempExpValue}
          onChange={setTempExpValue}
          placeholder={stats.exp.toString()}
          onApply={(exp) => {
            setStats((prev) => ({ ...prev, exp }));
            setActiveModal(null);
            onSaveCurrencyAndExp?.(stats.currency.gp, exp);
          }}
        />
      )}

      {activeModal === 'downtime' && (
        <DowntimeModal
          isOpen
          onClose={() => setActiveModal(null)}
          value={tempDowntimeValue}
          onChange={setTempDowntimeValue}
          currentDowntime={stats.downtime}
          onApply={(v) => {
            setStats((prev) => ({ ...prev, downtime: v }));
            setActiveModal(null);
            onSaveExtraData?.({
              ...stats.extraData,
              downtime: v,
              renown: stats.renown || { used: 0, total: 0 },
              prestige: stats.prestige || { org: '', level: 0, rankName: '' },
              customRecords: stats.customRecords || [],
              attacks: stats.attacks || [],
            });
          }}
        />
      )}

      {activeModal === 'renown' && (
        <RenownModal
          isOpen
          onClose={() => setActiveModal(null)}
          usedValue={tempRenownUsedValue}
          totalValue={tempRenownTotalValue}
          onChangeUsed={setTempRenownUsedValue}
          onChangeTotal={setTempRenownTotalValue}
          currentUsed={stats.renown.used}
          currentTotal={stats.renown.total}
          onApply={(used, total) => {
            setStats((prev) => ({ ...prev, renown: { used, total } }));
            setActiveModal(null);
            onSaveExtraData?.({
              ...stats.extraData,
              downtime: stats.downtime || 0,
              renown: { used, total },
              prestige: stats.prestige || { org: '', level: 0, rankName: '' },
              customRecords: stats.customRecords || [],
              attacks: stats.attacks || [],
            });
          }}
        />
      )}

      {activeModal === 'add_record' && (
        <CustomRecordModal
          isOpen
          onClose={() => setActiveModal(null)}
          mode="add"
          name={newRecord.name}
          value={newRecord.value}
          note={newRecord.note}
          onChangeName={(v) => setNewRecord((r) => ({ ...r, name: v }))}
          onChangeValue={(v) => setNewRecord((r) => ({ ...r, value: v }))}
          onChangeNote={(v) => setNewRecord((r) => ({ ...r, note: v }))}
          onSave={handleSaveNewRecord}
        />
      )}

      {activeModal === 'edit_record' && selectedRecord && (
        <CustomRecordModal
          isOpen
          onClose={() => setActiveModal(null)}
          mode="edit"
          name={newRecord.name}
          value={newRecord.value}
          note={newRecord.note}
          onChangeName={(v) => setNewRecord((r) => ({ ...r, name: v }))}
          onChangeValue={(v) => setNewRecord((r) => ({ ...r, value: v }))}
          onChangeNote={(v) => setNewRecord((r) => ({ ...r, note: v }))}
          onSave={handleUpdateRecord}
          onDelete={handleDeleteRecord}
        />
      )}
    </div>
  );
};