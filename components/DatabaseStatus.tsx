import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const DatabaseStatus: React.FC = () => {
  const [status, setStatus] = useState<string[]>([]);
  const [user, setUser] = useState<any>(null);

  const addLog = (message: string) => {
    setStatus(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const checkDatabase = async () => {
    setStatus([]);
    addLog('🔗 開始檢查資料庫狀態...');

    try {
      // 檢查用戶
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      setUser(user);
      addLog(`👤 用戶狀態: ${user ? user.email : '未登入'}`);
      if (userError) addLog(`❌ 用戶錯誤: ${userError.message}`);

      // 檢查舊格式角色表
      const { data: characters, error: charError } = await supabase
        .from('characters')
        .select('*');
      
      addLog(`📊 characters 表格: ${characters?.length || 0} 筆資料`);
      if (charError) addLog(`❌ characters 錯誤: ${charError.message}`);

      // 檢查新格式表格
      const newTables = [
        'character_ability_scores',
        'character_current_stats', 
        'character_currency',
        'character_items'
      ];

      for (const table of newTables) {
        try {
          const { data, error } = await supabase.from(table).select('*').limit(1);
          addLog(`📋 ${table}: ${data?.length || 0} 筆資料`);
          if (error) addLog(`❌ ${table} 錯誤: ${error.message}`);
        } catch (e: any) {
          addLog(`❌ ${table}: ${e.message}`);
        }
      }

      // 如果是登入用戶，嘗試創建測試角色
      if (user) {
        addLog('🎯 嘗試創建測試角色...');
        const { data: newChar, error: createError } = await supabase
          .from('characters')
          .insert([{
            user_id: user.id,
            name: '測試角色',
            character_class: '戰士',
            level: 1,
            experience: 0
          }])
          .select()
          .single();

        if (newChar) {
          addLog(`✅ 成功創建測試角色: ${newChar.id}`);
        }
        if (createError) {
          addLog(`❌ 創建角色錯誤: ${createError.message}`);
        }
      }

    } catch (error: any) {
      addLog(`💥 檢查失敗: ${error.message}`);
    }
  };

  useEffect(() => {
    checkDatabase();
  }, []);

  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      width: '400px',
      height: '300px',
      backgroundColor: '#1f2937',
      border: '1px solid #374151',
      borderRadius: '8px',
      padding: '12px',
      fontSize: '12px',
      color: '#f9fafb',
      overflow: 'auto',
      zIndex: 9999
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '8px',
        borderBottom: '1px solid #374151',
        paddingBottom: '8px'
      }}>
        <strong>📊 資料庫狀態</strong>
        <button 
          onClick={checkDatabase}
          style={{
            background: '#3b82f6',
            border: 'none',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🔄 重新檢查
        </button>
      </div>
      
      {user && (
        <div style={{ marginBottom: '8px', color: '#10b981' }}>
          ✅ 已登入: {user.email}
        </div>
      )}
      
      <div style={{ fontFamily: 'monospace' }}>
        {status.map((log, index) => (
          <div key={index} style={{ marginBottom: '2px' }}>
            {log}
          </div>
        ))}
      </div>
    </div>
  );
};