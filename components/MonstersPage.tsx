import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import CombatService from '../services/combatService';
import type { CombatSession, CombatMonsterWithLogs, ResistanceType } from '../lib/supabase';
import MonsterCard from './MonsterCard';
import AddDamageModal from './AddDamageModal';
import AddMonsterModal from './AddMonsterModal';
import AdjustACModal from './AdjustACModal';
import MonsterSettingsModal from './MonsterSettingsModal';
import JoinCombatModal from './JoinCombatModal';
import CombatEndedModal from './CombatEndedModal';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

const MonstersPage: React.FC = () => {
  const { user, anonymousId } = useAuth();
  const { showSuccess, showError } = useToast();

  // 戰鬥狀態
  const [sessionCode, setSessionCode] = useState<string>('');
  const [localLastUpdated, setLocalLastUpdated] = useState<string>('');
  const [monsters, setMonsters] = useState<CombatMonsterWithLogs[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modal 狀態
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [addMonsterModalOpen, setAddMonsterModalOpen] = useState(false);
  const [damageModalOpen, setDamageModalOpen] = useState(false);
  const [acModalOpen, setAcModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [endCombatModalOpen, setEndCombatModalOpen] = useState(false);
  const [combatEndedModalOpen, setCombatEndedModalOpen] = useState(false);
  const [selectedMonsterId, setSelectedMonsterId] = useState<string>('');

  /**
   * 開始新戰鬥
   */
  const handleStartCombat = async () => {
    setIsLoading(true);
    const result = await CombatService.createSession({
      isAuthenticated: !!user,
      userId: user?.id,
      anonymousId
    });

    if (result.success && result.sessionCode) {
      setSessionCode(result.sessionCode);
      showSuccess(`戰鬥已開始！代碼：${result.sessionCode}`);
      
      // 載入數據
      await refreshCombatData(result.sessionCode);
    } else {
      showError(result.error || '開始戰鬥失敗');
    }
    setIsLoading(false);
  };

  /**
   * 加入戰鬥
   */
  const handleJoinCombat = async (code: string) => {
    setIsLoading(true);
    const result = await CombatService.joinSession(code);

    if (result.success && result.session) {
      setSessionCode(code);
      showSuccess('已加入戰鬥！');
      await refreshCombatData(code);
    } else {
      showError(result.error || '加入戰鬥失敗');
    }
    setIsLoading(false);
    setJoinModalOpen(false);
  };

  /**
   * 刷新戰鬥數據
   */
  const refreshCombatData = async (code?: string) => {
    const targetCode = code || sessionCode;
    if (!targetCode) return;

    setIsLoading(true);
    const result = await CombatService.getCombatData(targetCode);

    if (result.success && result.session && result.monsters) {
      // 檢查戰鬥是否已結束
      if (!result.session.is_active) {
        setIsLoading(false);
        showError('戰鬥已被其他玩家結束');
        // 自動執行結束戰鬥操作
        setTimeout(() => {
          handleEndCombat();
        }, 1500);
        return;
      }
      
      setLocalLastUpdated(result.session.last_updated);
      setMonsters(result.monsters);
      showSuccess('戰鬥數據已更新');
    } else {
      showError(result.error || '更新失敗');
    }
    setIsLoading(false);
  };

  /**
   * 檢查版本衝突
   */
  const checkConflict = async (): Promise<boolean> => {
    if (!sessionCode || !localLastUpdated) return false;

    const result = await CombatService.checkVersionConflict(sessionCode, localLastUpdated);
    
    // 檢查戰鬥是否已被其他玩家結束
    if (result.isActive === false || result.endedAt) {
      showError('戰鬥已被其他玩家結束');
      // 自動執行結束戰鬥操作
      setTimeout(() => {
        handleEndCombat();
      }, 1500);
      return true;
    }
    
    if (result.hasConflict) {
      showError('戰鬥數據已被其他玩家更新，正在刷新...');
      await refreshCombatData();
      return true;
    }
    
    return false;
  };

  /**
   * 新增怪物 (舊版 - 保留向後兼容)
   */
  const handleAddMonster = async (code?: string) => {
    const targetCode = code || sessionCode;
    if (!targetCode) return;

    // 檢查衝突
    if (!code && await checkConflict()) return;

    const result = await CombatService.addMonster(targetCode);
    
    if (result.success) {
      showSuccess(`新增怪物 #${result.monster?.monster_number}`);
      await refreshCombatData(targetCode);
    } else {
      showError(result.error || '新增怪物失敗');
    }
  };

  /**
   * 批次新增怪物
   */
  const handleAddMonsters = async (name: string, count: number, knownAC: number | null, maxHP: number | null, resistances: Record<string, ResistanceType>) => {
    if (!sessionCode) return;

    // 檢查衝突
    if (await checkConflict()) {
      setAddMonsterModalOpen(false);
      return;
    }

    const result = await CombatService.addMonsters(sessionCode, name, count, knownAC, maxHP, resistances);
    
    if (result.success) {
      showSuccess(`已新增 ${count} 隻 ${name}`);
      await refreshCombatData();
      setAddMonsterModalOpen(false);
    } else {
      showError(result.error || '新增怪物失敗');
    }
  };

  /**
   * 刪除怪物（標記死亡）
   */
  const handleDeleteMonster = async (monsterId: string) => {
    if (await checkConflict()) return;

    // 找到該怪物資料
    const monster = monsters.find(m => m.id === monsterId);
    
    // 如果 max_hp 未知，設定為負數的 total_damage 表示 "<=total_damage"
    if (monster && monster.max_hp === null && monster.total_damage > 0) {
      await CombatService.updateMaxHP(monsterId, -monster.total_damage);
    }

    const result = await CombatService.deleteMonster(monsterId);
    
    if (result.success) {
      showSuccess('怪物已死亡');
      await refreshCombatData();
    } else {
      showError(result.error || '刪除失敗');
    }
  };

  /**
   * 打開新增傷害 Modal
   */
  const openDamageModal = (monsterId: string) => {
    setSelectedMonsterId(monsterId);
    setDamageModalOpen(true);
  };

  /**
   * 打開調整 AC Modal
   */
  const openACModal = (monsterId: string) => {
    setSelectedMonsterId(monsterId);
    setAcModalOpen(true);
  };

  /**
   * 打開設定 Modal
   */
  const openSettingsModal = (monsterId: string) => {
    setSelectedMonsterId(monsterId);
    setSettingsModalOpen(true);
  };

  /**
   * 結束戰鬥
   */
  const handleEndCombat = async () => {
    if (!sessionCode) return;

    const result = await CombatService.endCombat(sessionCode);
    
    if (result.success) {
      showSuccess('戰鬥已結束');
      // 重置狀態
      setSessionCode('');
      setLocalLastUpdated('');
      setMonsters([]);
    } else {
      showError(result.error || '結束戰鬥失敗');
    }
    setEndCombatModalOpen(false);
  };

  /**
   * 處理戰鬥已結束的情況
   */
  const handleCombatEnded = (viewFinal: boolean) => {
    if (viewFinal) {
      // 保持當前頁面，讓用戶查看最終狀態
      setCombatEndedModalOpen(false);
    } else {
      // 清除狀態並返回首頁
      setSessionCode('');
      setLocalLastUpdated('');
      setMonsters([]);
      setCombatEndedModalOpen(false);
    }
  };

  // 初始載入
  useEffect(() => {
    // 從 localStorage 恢復戰鬥狀態
    const savedCode = localStorage.getItem('combat_session_code');
    if (savedCode) {
      setSessionCode(savedCode);
      refreshCombatData(savedCode);
    }
  }, []);

  // 保存戰鬥代碼到 localStorage
  useEffect(() => {
    if (sessionCode) {
      localStorage.setItem('combat_session_code', sessionCode);
    } else {
      localStorage.removeItem('combat_session_code');
    }
  }, [sessionCode]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* 更新中蓋版畫面 */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-slate-800 px-8 py-6 rounded-xl shadow-2xl border border-slate-700">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-amber-500 border-t-transparent"></div>
              <span className="text-lg font-medium">更新中...</span>
            </div>
          </div>
        </div>
      )}

      {/* 頂部橫幅 */}
      <div className="sticky top-0 z-10 bg-slate-800 border-b border-slate-700 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          {sessionCode ? (
            <>
              {/* 戰鬥中：顯示代碼和操作按鈕 */}
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold">ID:</span>
                <span className="text-2xl font-mono text-amber-500">{sessionCode}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => refreshCombatData()}
                  disabled={isLoading}
                  className="h-8 w-8 flex items-center justify-center bg-blue-600 hover:bg-blue-700 border border-blue-500 rounded-lg active:bg-blue-800 shadow-sm transition-colors disabled:opacity-50"
                >
                  <span className="text-[16px]">🔄</span>
                </button>
                <button
                  onClick={() => setAddMonsterModalOpen(true)}
                  disabled={isLoading}
                  className="h-8 w-8 flex items-center justify-center bg-green-600 hover:bg-green-700 border border-green-500 rounded-lg active:bg-green-800 shadow-sm transition-colors disabled:opacity-50"
                >
                  <span className="text-[16px]">➕</span>
                </button>
                <button
                  onClick={() => setEndCombatModalOpen(true)}
                  className="h-8 w-8 flex items-center justify-center bg-rose-700 hover:bg-rose-800 border border-rose-600 rounded-lg active:bg-rose-900 shadow-sm group"
                >
                  <div className="w-3.5 h-3.5 bg-white rounded-[2px]"></div>
                </button>
              </div>
            </>
          ) : (
            <>
              {/* 未開始：顯示開始和加入按鈕 */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleStartCombat}
                  disabled={isLoading}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium disabled:opacity-50 transition-colors"
                >
                  ⚔️ 開始新戰鬥
                </button>
                <button
                  onClick={() => setJoinModalOpen(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
                >
                  ➕ 加入戰鬥
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 主內容區 */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {sessionCode && monsters.length > 0 ? (
          <div className="space-y-4">
            {monsters.map(monster => (
              <MonsterCard
                key={monster.id}
                monster={monster}
                onAddDamage={() => openDamageModal(monster.id)}
                onAdjustAC={() => openACModal(monster.id)}
                onAdjustSettings={() => openSettingsModal(monster.id)}
                onDelete={() => handleDeleteMonster(monster.id)}
              />
            ))}
          </div>
        ) : sessionCode ? (
          <div className="text-center py-12 text-slate-400">
            <p className="text-xl">暫無怪物</p>
            <p className="mt-2">點擊「➕ 怪物」開始追蹤</p>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400">
            <p className="text-xl">開始新戰鬥或加入現有戰鬥</p>
          </div>
        )}
      </div>

      {/* Modals */}
      <JoinCombatModal
        isOpen={joinModalOpen}
        onClose={() => setJoinModalOpen(false)}
        onJoin={handleJoinCombat}
      />

      <AddMonsterModal
        isOpen={addMonsterModalOpen}
        onClose={() => setAddMonsterModalOpen(false)}
        onConfirm={handleAddMonsters}
      />

      <AddDamageModal
        isOpen={damageModalOpen}
        onClose={() => setDamageModalOpen(false)}
        monsterId={selectedMonsterId}
        monsterNumber={monsters.find(m => m.id === selectedMonsterId)?.monster_number || 0}
        monsterResistances={monsters.find(m => m.id === selectedMonsterId)?.resistances || {}}
        onSuccess={() => refreshCombatData()}
        onConflict={() => checkConflict()}
      />

      <AdjustACModal
        isOpen={acModalOpen}
        onClose={() => setAcModalOpen(false)}
        monsterId={selectedMonsterId}
        monsterNumber={monsters.find(m => m.id === selectedMonsterId)?.monster_number || 0}
        currentACRange={
          monsters.find(m => m.id === selectedMonsterId) 
            ? { 
                min: monsters.find(m => m.id === selectedMonsterId)!.ac_min, 
                max: monsters.find(m => m.id === selectedMonsterId)!.ac_max
              }
            : { min: 0, max: null }
        }
        onSuccess={() => refreshCombatData()}
        onConflict={() => checkConflict()}
      />

      <MonsterSettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        monsterId={selectedMonsterId}
        monsterNumber={monsters.find(m => m.id === selectedMonsterId)?.monster_number || 0}
        monsterName={monsters.find(m => m.id === selectedMonsterId)?.name || '怪物'}
        currentACRange={
          monsters.find(m => m.id === selectedMonsterId) 
            ? { 
                min: monsters.find(m => m.id === selectedMonsterId)!.ac_min, 
                max: monsters.find(m => m.id === selectedMonsterId)!.ac_max
              }
            : { min: 0, max: null }
        }
        currentMaxHP={monsters.find(m => m.id === selectedMonsterId)?.max_hp || null}
        currentResistances={monsters.find(m => m.id === selectedMonsterId)?.resistances || {}}
        onSuccess={() => refreshCombatData()}
        onConflict={() => checkConflict()}
      />

      <CombatEndedModal
        isOpen={combatEndedModalOpen}
        onClose={(viewFinal) => handleCombatEnded(viewFinal)}
      />

      <ConfirmDeleteModal
        isOpen={endCombatModalOpen}
        onClose={() => setEndCombatModalOpen(false)}
        onConfirm={handleEndCombat}
        title="結束戰鬥"
        message="確定要結束當前戰鬥嗎？這將刪除所有怪物和傷害記錄，此操作無法復原。"
        confirmText="結束戰鬥"
      />
    </div>
  );
};

export default MonstersPage;
