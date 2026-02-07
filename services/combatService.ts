import { supabase } from '../lib/supabase';
import type { 
  CombatSession, 
  CombatMonster, 
  CombatDamageLog, 
  CombatMonsterWithLogs,
  ResistanceType 
} from '../lib/supabase';

/**
 * 戰鬥追蹤服務
 * 負責多人協作的怪物戰鬥追蹤功能
 */
export class CombatService {
  /**
   * 生成隨機 3 位數戰鬥代碼
   */
  static generateSessionCode(): string {
    return Math.floor(100 + Math.random() * 900).toString();
  }

  /**
   * 創建新戰鬥會話
   */
  static async createSession(userContext: { 
    isAuthenticated: boolean; 
    userId?: string;
    anonymousId?: string;
  }): Promise<{ success: boolean; sessionCode?: string; error?: string }> {
    try {
      // 生成唯一代碼（最多嘗試 10 次）
      let sessionCode = this.generateSessionCode();
      let attempts = 0;
      
      while (attempts < 10) {
        const { data: existing } = await supabase
          .from('combat_sessions')
          .select('session_code')
          .eq('session_code', sessionCode)
          .eq('is_active', true)
          .maybeSingle();  // 使用 maybeSingle 避免找不到時報錯
        
        if (!existing) break;
        sessionCode = this.generateSessionCode();
        attempts++;
      }

      if (attempts >= 10) {
        return { success: false, error: '無法生成唯一戰鬥代碼' };
      }

      // 創建戰鬥會話
      const { data, error } = await supabase
        .from('combat_sessions')
        .insert({
          session_code: sessionCode,
          user_id: userContext.isAuthenticated ? userContext.userId : null,
          anonymous_id: userContext.isAuthenticated ? null : userContext.anonymousId,
        })
        .select()
        .single();

      if (error) {
        console.error('創建戰鬥會話失敗:', error);
        return { success: false, error: error.message };
      }

      return { success: true, sessionCode: data.session_code };
    } catch (error) {
      console.error('創建戰鬥會話異常:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * 加入現有戰鬥會話（驗證代碼是否存在）
   */
  static async joinSession(sessionCode: string): Promise<{ 
    success: boolean; 
    session?: CombatSession;
    error?: string 
  }> {
    try {
      const { data, error } = await supabase
        .from('combat_sessions')
        .select('*')
        .eq('session_code', sessionCode)
        .maybeSingle();

      if (error) {
        console.error('查詢戰鬥會話失敗:', error);
        return { success: false, error: '查詢失敗' };
      }

      if (!data) {
        return { success: false, error: '戰鬥代碼不存在' };
      }

      // 檢查戰鬥是否已結束
      if (!data.is_active) {
        return { success: false, error: '該戰鬥已結束' };
      }

      return { success: true, session: data };
    } catch (error) {
      console.error('加入戰鬥會話異常:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * 獲取戰鬥會話資訊（包含所有怪物和傷害記錄）
   */
  static async getCombatData(sessionCode: string): Promise<{
    success: boolean;
    session?: CombatSession;
    monsters?: CombatMonsterWithLogs[];
    error?: string;
  }> {
    try {
      // 獲取會話資訊（不過濾 is_active，讓調用方判斷）
      const { data: session, error: sessionError } = await supabase
        .from('combat_sessions')
        .select('*')
        .eq('session_code', sessionCode)
        .maybeSingle();

      if (sessionError) {
        console.error('查詢戰鬥會話失敗:', sessionError);
        return { success: false, error: '查詢失敗' };
      }

      if (!session) {
        return { success: false, error: '戰鬥會話不存在' };
      }

      // 獲取所有怪物
      const { data: monsters, error: monstersError } = await supabase
        .from('combat_monsters')
        .select('*')
        .eq('session_code', sessionCode)
        .eq('is_dead', false)
        .order('monster_number', { ascending: true });

      if (monstersError) {
        return { success: false, error: monstersError.message };
      }

      // 獲取所有傷害記錄
      const monsterIds = monsters?.map(m => m.id) || [];
      const { data: damageLogs, error: logsError } = await supabase
        .from('combat_damage_logs')
        .select('*')
        .in('monster_id', monsterIds)
        .order('created_at', { ascending: true });

      if (logsError) {
        return { success: false, error: logsError.message };
      }

      // 組合數據
      const monstersWithLogs: CombatMonsterWithLogs[] = (monsters || []).map(monster => ({
        ...monster,
        damage_logs: (damageLogs || []).filter(log => log.monster_id === monster.id)
      }));

      return { 
        success: true, 
        session,
        monsters: monstersWithLogs 
      };
    } catch (error) {
      console.error('獲取戰鬥數據異常:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * 檢查版本衝突
   */
  static async checkVersionConflict(
    sessionCode: string, 
    localLastUpdated: string
  ): Promise<{ hasConflict: boolean; latestTimestamp?: string; isActive?: boolean; endedAt?: string | null }> {
    try {
      const { data, error } = await supabase
        .from('combat_sessions')
        .select('last_updated, is_active')
        .eq('session_code', sessionCode)
        .maybeSingle();

      if (error) {
        console.error('查詢版本衝突失敗:', error);
        return { hasConflict: true };
      }

      if (!data) {
        return { hasConflict: true };
      }

      const dbTimestamp = new Date(data.last_updated).getTime();
      const localTimestamp = new Date(localLastUpdated).getTime();

      return { 
        hasConflict: dbTimestamp > localTimestamp,
        latestTimestamp: data.last_updated,
        isActive: data.is_active
      };
    } catch (error) {
      console.error('檢查版本衝突異常:', error);
      return { hasConflict: true };
    }
  }

  /**
   * 批次新增怪物
   * @param sessionCode 戰鬥代碼
   * @param name 怪物名稱
   * @param count 數量
   * @param knownAC 已知 AC（null 表示未知）
   * @param maxHP 已知最大 HP（null 表示未知）
   * @param resistances 已知抗性
   */
  static async addMonsters(
    sessionCode: string, 
    name: string, 
    count: number, 
    knownAC: number | null,
    maxHP: number | null,
    resistances?: Record<string, ResistanceType>
  ): Promise<{ 
    success: boolean; 
    monsters?: CombatMonster[];
    error?: string 
  }> {
    try {
      // 若同 session 已有同名怪物，沿用其屬性
      const { data: sameNameMonster } = await supabase
        .from('combat_monsters')
        .select('ac_min, ac_max, max_hp, resistances')
        .eq('session_code', sessionCode)
        .eq('name', name)
        .limit(1)
        .maybeSingle();

      const acMin = sameNameMonster?.ac_min ?? knownAC ?? 0;
      const acMax = sameNameMonster?.ac_max ?? knownAC ?? 99;
      const maxHp = sameNameMonster?.max_hp ?? maxHP;
      const resistancesToUse = (sameNameMonster?.resistances ?? resistances) || {};

      // 獲取當前最大怪物編號
      const { data: existing } = await supabase
        .from('combat_monsters')
        .select('monster_number')
        .eq('session_code', sessionCode)
        .order('monster_number', { ascending: false })
        .limit(1);

      const startNumber = existing && existing.length > 0 
        ? existing[0].monster_number + 1 
        : 1;

      // 準備批次插入的數據（同名則已沿用現有屬性）
      const monstersToInsert = Array.from({ length: count }, (_, i) => ({
        session_code: sessionCode,
        monster_number: startNumber + i,
        name,
        ac_min: acMin,
        ac_max: acMax,
        max_hp: maxHp,
        total_damage: 0,
        is_dead: false,
        resistances: resistancesToUse,
        notes: null
      }));

      // 批次插入
      const { data, error } = await supabase
        .from('combat_monsters')
        .insert(monstersToInsert)
        .select();

      if (error) {
        console.error('批次新增怪物失敗:', error);
        return { success: false, error: error.message };
      }

      return { success: true, monsters: data };
    } catch (error) {
      console.error('批次新增怪物異常:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * 新增單隻怪物（向後兼容）
   */
  static async addMonster(sessionCode: string): Promise<{ 
    success: boolean; 
    monster?: CombatMonster;
    error?: string 
  }> {
    const result = await this.addMonsters(sessionCode, '怪物', 1, null, null, {});
    if (result.success && result.monsters && result.monsters.length > 0) {
      return { success: true, monster: result.monsters[0] };
    }
    return { success: false, error: result.error };
  }

  /**
   * 刪除怪物（標記為死亡）
   */
  static async deleteMonster(monsterId: string): Promise<{ 
    success: boolean; 
    error?: string 
  }> {
    try {
      const { error } = await supabase
        .from('combat_monsters')
        .update({ is_dead: true })
        .eq('id', monsterId);

      if (error) {
        console.error('刪除怪物失敗:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('刪除怪物異常:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * 更新 AC 範圍
   */
  static async updateACRange(
    monsterId: string,
    attackRoll: number,
    isHit: boolean
  ): Promise<{ success: boolean; newRange?: { min: number; max: number | null }; error?: string }> {
    try {
      // 獲取當前 AC 範圍和怪物名稱
      const { data: monster } = await supabase
        .from('combat_monsters')
        .select('ac_min, ac_max, name, session_code')
        .eq('id', monsterId)
        .single();

      if (!monster) {
        return { success: false, error: '怪物不存在' };
      }

      // 計算新範圍
      let newMin = monster.ac_min;
      let newMax = monster.ac_max;

      if (isHit) {
        // 命中 → AC <= 攻擊骰
        newMax = newMax === null ? attackRoll : Math.min(newMax, attackRoll);
      } else {
        // 未命中 → AC > 攻擊骰
        newMin = Math.max(newMin, attackRoll);
      }

      // 驗證範圍合法性
      if (newMax !== null && newMin > newMax) {
        return { success: false, error: 'AC 範圍衝突，請檢查輸入' };
      }

      // 更新同名的所有怪物
      const { error } = await supabase
        .from('combat_monsters')
        .update({ ac_min: newMin, ac_max: newMax })
        .eq('session_code', monster.session_code)
        .eq('name', monster.name);

      if (error) {
        console.error('更新 AC 範圍失敗:', error);
        return { success: false, error: error.message };
      }

      return { success: true, newRange: { min: newMin, max: newMax } };
    } catch (error) {
      console.error('更新 AC 範圍異常:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * 直接設定 AC 範圍（設定頁使用，強制覆蓋當前值）
   * 顯示為 [ac_min] < AC <= [ac_max]，須滿足 ac_min < ac_max
   */
  static async setACRange(
    monsterId: string,
    acMin: number,
    acMax: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (acMin < 0 || acMin > 99 || acMax < 0 || acMax > 99) {
        return { success: false, error: 'AC 下限與上限須在 0–99 之間' };
      }
      if (acMin >= acMax) {
        return { success: false, error: 'AC 下限須小於上限' };
      }
      const { data: monster, error: fetchError } = await supabase
        .from('combat_monsters')
        .select('name, session_code')
        .eq('id', monsterId)
        .single();

      if (fetchError || !monster) {
        return { success: false, error: '怪物不存在' };
      }

      const { error: updateError } = await supabase
        .from('combat_monsters')
        .update({ ac_min: acMin, ac_max: acMax })
        .eq('session_code', monster.session_code)
        .eq('name', monster.name);

      if (updateError) {
        console.error('設定 AC 範圍失敗:', updateError);
        return { success: false, error: updateError.message };
      }

      return { success: true };
    } catch (error) {
      console.error('設定 AC 範圍異常:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * 更新怪物名稱（設定頁使用），會同步套用至同 session 內所有同名的怪物
   */
  static async updateMonsterName(
    monsterId: string,
    newName: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const trimmed = newName.trim();
      if (!trimmed) {
        return { success: false, error: '名稱不可為空' };
      }
      const { data: monster, error: fetchError } = await supabase
        .from('combat_monsters')
        .select('name, session_code')
        .eq('id', monsterId)
        .single();

      if (fetchError || !monster) {
        return { success: false, error: '怪物不存在' };
      }

      if (trimmed === monster.name) {
        return { success: true };
      }

      const { error: updateError } = await supabase
        .from('combat_monsters')
        .update({ name: trimmed })
        .eq('session_code', monster.session_code)
        .eq('name', monster.name);

      if (updateError) {
        console.error('更新怪物名稱失敗:', updateError);
        return { success: false, error: updateError.message };
      }

      return { success: true };
    } catch (error) {
      console.error('更新怪物名稱異常:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * 更新怪物備註（設定頁使用），僅更新此隻怪物，不與同名怪物共用
   */
  static async updateMonsterNotes(
    monsterId: string,
    notes: string | null
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('combat_monsters')
        .update({ notes })
        .eq('id', monsterId);

      if (error) {
        console.error('更新怪物備註失敗:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('更新怪物備註異常:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * 更新怪物最大 HP
   */
  static async updateMaxHP(
    monsterId: string,
    maxHP: number | null
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 獲取怪物資訊用於同步
      const { data: monster, error: fetchError } = await supabase
        .from('combat_monsters')
        .select('name, session_code')
        .eq('id', monsterId)
        .single();

      if (fetchError || !monster) {
        return { success: false, error: '找不到怪物資料' };
      }

      // 更新所有同名怪物的 max_hp
      const { error: updateError } = await supabase
        .from('combat_monsters')
        .update({ max_hp: maxHP })
        .eq('session_code', monster.session_code)
        .eq('name', monster.name);

      if (updateError) {
        console.error('更新最大 HP 失敗:', updateError);
        return { success: false, error: updateError.message };
      }

      return { success: true };
    } catch (error) {
      console.error('更新最大 HP 異常:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * 新增傷害記錄
   * @param options.createdAt 若提供（編輯時補加複合傷害），新列會使用此時間，與同組顯示
   */
  static async addDamage(
    monsterId: string,
    damages: Array<{
      value: number;
      type: string;
      resistanceType: ResistanceType;
      originalValue: number;
    }>,
    options?: { createdAt?: string }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 計算總傷害
      const totalDamage = damages.reduce((sum, d) => sum + d.value, 0);

      // 獲取當前累計傷害
      const { data: monster } = await supabase
        .from('combat_monsters')
        .select('total_damage')
        .eq('id', monsterId)
        .single();

      if (!monster) {
        return { success: false, error: '怪物不存在' };
      }

      // 插入傷害記錄（含原始傷害供編輯還原；可指定 created_at 以歸入同一組）
      const logsToInsert = damages.map(d => {
        const row: Record<string, unknown> = {
          monster_id: monsterId,
          damage_value: d.value,
          damage_value_origin: d.originalValue,
          damage_type: d.type,
          resistance_type: d.resistanceType
        };
        if (options?.createdAt != null) {
          row.created_at = options.createdAt;
        }
        return row;
      });

      const { error: logsError } = await supabase
        .from('combat_damage_logs')
        .insert(logsToInsert);

      if (logsError) {
        console.error('插入傷害記錄失敗:', logsError);
        return { success: false, error: logsError.message };
      }

      // 更新累計傷害
      const { error: updateError } = await supabase
        .from('combat_monsters')
        .update({ total_damage: monster.total_damage + totalDamage })
        .eq('id', monsterId);

      if (updateError) {
        console.error('更新累計傷害失敗:', updateError);
        return { success: false, error: updateError.message };
      }

      return { success: true };
    } catch (error) {
      console.error('新增傷害異常:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * 重算該怪物累計傷害並寫回 combat_monsters（供 update/delete 傷害記錄後共用）
   */
  static async recalcMonsterTotalDamage(monsterId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: logs, error: fetchError } = await supabase
        .from('combat_damage_logs')
        .select('damage_value')
        .eq('monster_id', monsterId);

      if (fetchError) {
        console.error('查詢傷害記錄失敗:', fetchError);
        return { success: false, error: fetchError.message };
      }

      const totalDamage = (logs || []).reduce((sum, row) => sum + (row.damage_value ?? 0), 0);

      const { error: updateError } = await supabase
        .from('combat_monsters')
        .update({ total_damage: totalDamage })
        .eq('id', monsterId);

      if (updateError) {
        console.error('更新累計傷害失敗:', updateError);
        return { success: false, error: updateError.message };
      }

      return { success: true };
    } catch (error) {
      console.error('重算累計傷害異常:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * 更新單筆傷害記錄，並重算該怪物 total_damage
   */
  static async updateDamageLog(
    logId: string,
    monsterId: string,
    payload: { value: number; type: string; resistanceType: ResistanceType; originalValue: number }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('combat_damage_logs')
        .update({
          damage_value: payload.value,
          damage_value_origin: payload.originalValue,
          damage_type: payload.type,
          resistance_type: payload.resistanceType
        })
        .eq('id', logId);

      if (error) {
        console.error('更新傷害記錄失敗:', error);
        return { success: false, error: error.message };
      }

      return this.recalcMonsterTotalDamage(monsterId);
    } catch (error) {
      console.error('更新傷害記錄異常:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * 批次更新多筆傷害記錄，最後重算一次 total_damage
   */
  static async updateDamageLogBatch(
    monsterId: string,
    updates: Array<{ logId: string; value: number; type: string; resistanceType: ResistanceType; originalValue: number }>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      for (const u of updates) {
        const { error } = await supabase
          .from('combat_damage_logs')
          .update({
            damage_value: u.value,
            damage_value_origin: u.originalValue,
            damage_type: u.type,
            resistance_type: u.resistanceType
          })
          .eq('id', u.logId);

        if (error) {
          console.error('批次更新傷害記錄失敗:', error);
          return { success: false, error: error.message };
        }
      }

      return this.recalcMonsterTotalDamage(monsterId);
    } catch (error) {
      console.error('批次更新傷害記錄異常:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * 刪除單筆傷害記錄，並重算該怪物 total_damage
   */
  static async deleteDamageLog(logId: string, monsterId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('combat_damage_logs')
        .delete()
        .eq('id', logId);

      if (error) {
        console.error('刪除傷害記錄失敗:', error);
        return { success: false, error: error.message };
      }

      return this.recalcMonsterTotalDamage(monsterId);
    } catch (error) {
      console.error('刪除傷害記錄異常:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * 批次刪除多筆傷害記錄，最後重算一次 total_damage
   */
  static async deleteDamageLogBatch(logIds: string[], monsterId: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (logIds.length === 0) {
        return this.recalcMonsterTotalDamage(monsterId);
      }

      const { error } = await supabase
        .from('combat_damage_logs')
        .delete()
        .in('id', logIds);

      if (error) {
        console.error('批次刪除傷害記錄失敗:', error);
        return { success: false, error: error.message };
      }

      return this.recalcMonsterTotalDamage(monsterId);
    } catch (error) {
      console.error('批次刪除傷害記錄異常:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * 更新怪物抗性
   * @param monsterId 怪物ID
   * @param resistances 要更新的抗性（key: 傷害類型, value: 抗性類型）
   */
  static async updateMonsterResistances(
    monsterId: string,
    resistances: Record<string, ResistanceType>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 先獲取當前抗性和怪物名稱
      const { data: monster, error: fetchError } = await supabase
        .from('combat_monsters')
        .select('resistances, name, session_code')
        .eq('id', monsterId)
        .single();

      if (fetchError || !monster) {
        return { success: false, error: '怪物不存在' };
      }

      // 合併抗性（新發現的會覆蓋舊的）
      const updatedResistances = {
        ...(monster.resistances || {}),
        ...resistances
      };

      // 更新同名的所有怪物
      const { error: updateError } = await supabase
        .from('combat_monsters')
        .update({ resistances: updatedResistances })
        .eq('session_code', monster.session_code)
        .eq('name', monster.name);

      if (updateError) {
        console.error('更新怪物抗性失敗:', updateError);
        return { success: false, error: updateError.message };
      }

      return { success: true };
    } catch (error) {
      console.error('更新怪物抗性異常:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * 結束戰鬥（刪除所有相關數據）
   */
  static async endCombat(sessionCode: string): Promise<{ 
    success: boolean; 
    error?: string 
  }> {
    try {
      // 標記戰鬥會話為非活躍（CASCADE 會自動刪除怪物和傷害記錄）
      const { error } = await supabase
        .from('combat_sessions')
        .delete()
        .eq('session_code', sessionCode);

      if (error) {
        console.error('結束戰鬥失敗:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('結束戰鬥異常:', error);
      return { success: false, error: String(error) };
    }
  }
}

export default CombatService;
