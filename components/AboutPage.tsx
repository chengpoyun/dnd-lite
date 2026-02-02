import React from 'react';
import { useAuth } from '../contexts/AuthContext';

interface AboutPageProps {
  userMode: 'authenticated' | 'anonymous';
  onSwitchCharacter: () => void;
  onLogout: () => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({
  userMode,
  onSwitchCharacter,
  onLogout
}) => {
  const { user } = useAuth();
  
  return (
    <div className="max-w-2xl mx-auto space-y-6 px-4 py-4">
      {/* App 資訊 */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-2">
        <div className="flex items-center gap-4 mb-6">
          <div className="text-6xl">🎲</div>
          <div>
            <h1 className="text-3xl font-bold text-amber-500">D&D Lite</h1>
            <p className="text-slate-400">冒險者助手</p>
          </div>
        </div>
        
        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-slate-700">
            <span className="text-slate-400">版本</span>
            <span className="text-slate-200 font-mono">v1.0.0</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-slate-400">遊戲系統</span>
            <span className="text-slate-200">D&D 5E</span>
          </div>
        </div>
      </div>

      {/* 用戶資訊 */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-2">
        <h2 className="text-xl font-bold text-amber-500 mb-4">用戶資訊</h2>
        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b border-slate-700">
            <span className="text-slate-400">登入狀態</span>
            <span className="text-slate-200">
              {userMode === 'authenticated' ? '已登入' : '匿名模式'}
            </span>
          </div>
          {user && (
            <div className="flex justify-between py-2">
              <span className="text-slate-400">電子郵件</span>
              <span className="text-slate-200 text-sm">{user.email}</span>
            </div>
          )}
        </div>
      </div>

      {/* 操作按鈕 */}
      <div className="space-y-3">
        <button
          onClick={onSwitchCharacter}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          <span className="text-xl">🔄</span>
          <span>切換角色</span>
        </button>

        {userMode === 'authenticated' && (
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium rounded-lg transition-colors"
          >
            <span className="text-xl">🚪</span>
            <span>登出</span>
          </button>
        )}
      </div>

      {/* 版權資訊 */}
      <div className="text-center text-sm text-slate-500 py-4">
        <p>© 2026 D&D Lite. All rights reserved.</p>
        <p className="mt-1">Dungeons & Dragons 是 Wizards of the Coast 的註冊商標</p>
      </div>
    </div>
  );
};

export default AboutPage;
