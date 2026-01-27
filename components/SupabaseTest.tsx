import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { UserSettingsService } from '../services/userSettings'

export const SupabaseTest: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'success' | 'error' | 'hidden'>('testing')
  const [error, setError] = useState<string>('')

  useEffect(() => {
    // 檢查是否已經測試過了
    const checkTestStatus = async () => {
      try {
        const hasTestedBefore = await UserSettingsService.isSupabaseTestCompleted()
        if (hasTestedBefore) {
          setConnectionStatus('hidden')
          return
        }
        testConnection()
      } catch (error) {
        console.warn('無法檢查測試狀態:', error)
        // 繼續進行測試
        testConnection()
      }
    }
    
    checkTestStatus()
  }, [])

  const testConnection = async () => {
    try {
      // 測試連接 - 嘗試查詢 characters 資料表
      const { data, error } = await supabase
        .from('characters')
        .select('id')
        .limit(1)

      if (error) {
        console.error('Supabase 連接錯誤:', error)
        setError(error.message)
        setConnectionStatus('error')
      } else {
        console.log('Supabase 連接成功！', data)
        setConnectionStatus('success')
        // 標記測試已完成，下次不再顯示
        UserSettingsService.setSupabaseTestCompleted(true).catch(error => {
          console.warn('無法保存測試狀態:', error)
        })
      }
    } catch (err) {
      console.error('連接測試失敗:', err)
      setError(err instanceof Error ? err.message : '未知錯誤')
      setConnectionStatus('error')
    }
  }

  const hideTest = async () => {
    setConnectionStatus('hidden')
    try {
      await UserSettingsService.setSupabaseTestCompleted(true)
    } catch (error) {
      console.warn('無法保存測試狀態:', error)
    }
  }

  if (connectionStatus === 'hidden') {
    return null
  }

  if (connectionStatus === 'testing') {
    return (
      <div className="p-3">
        <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-blue-400">正在測試 Supabase 連接...</span>
            </div>
            <button onClick={() => hideTest()} className="text-blue-500 hover:text-blue-300 text-xs">隱藏</button>
          </div>
        </div>
      </div>
    )
  }

  if (connectionStatus === 'error') {
    return (
      <div className="p-3">
        <div className="bg-red-900/20 border border-red-500/30 p-4 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-red-500 text-xl">❌</span>
              <span className="text-red-400 font-bold">Supabase 連接失敗</span>
            </div>
            <button onClick={() => hideTest()} className="text-red-500 hover:text-red-300 text-xs">隱藏</button>
          </div>
          <p className="text-red-300 text-sm mb-2">{error}</p>
          <button 
            onClick={testConnection}
            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
          >
            重新測試
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-3">
      <div className="bg-emerald-900/20 border border-emerald-500/30 p-4 rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-emerald-500 text-xl">✅</span>
            <span className="text-emerald-400 font-bold">Supabase 連接成功！</span>
          </div>
          <button onClick={() => hideTest()} className="text-emerald-500 hover:text-emerald-300 text-xs">隱藏</button>
        </div>
        <p className="text-emerald-300 text-sm mt-1">資料庫已準備就緒，可以開始使用雲端功能</p>
      </div>
    </div>
  )
}